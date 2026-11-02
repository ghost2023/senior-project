"""Raw data extraction and feature engineering for risk scoring.

Builds one row per (student_id, term_id): GPA trend slope, attendance rate
and trend, grade-entry completeness, and peer deviation within the
student's program. Designed to recover the seed script's trajectory
archetypes (declining/recovering/stable/erratic) as ground truth — see
apps/web/lib/db/seed.ts. Read-only: pulls from the same Postgres the
Next.js app writes to, via the `satps_ml` role.
"""

import numpy as np
import pandas as pd
from sqlalchemy import text
from sqlalchemy.engine import Engine

ATTENDANCE_WEIGHT = {"present": 1.0, "late": 0.5, "absent": 0.0}

FEATURE_COLUMNS = [
    "gpa_points",
    "gpa_trend_slope",
    "attendance_rate",
    "attendance_trend_slope",
    "completeness",
    "peer_gpa_zscore",
    "peer_attendance_zscore",
]


_UUID_COLUMNS = {
    "enrollment_id",
    "student_id",
    "section_id",
    "term_id",
    "program_id",
    "component_id",
    "assessment_component_id",
}


def _stringify_uuids(df: pd.DataFrame) -> pd.DataFrame:
    """psycopg3 returns uuid columns as native uuid.UUID objects, which
    compare unequal to the plain strings used elsewhere (e.g. resolved from
    an email lookup) — normalize to str immediately after loading."""
    for col in df.columns.intersection(_UUID_COLUMNS):
        df[col] = df[col].astype(str)
    return df


def _load_raw(engine: Engine) -> dict[str, pd.DataFrame]:
    with engine.connect() as conn:
        raw = {
            "enrollments": pd.read_sql(
                text("SELECT id AS enrollment_id, student_id, section_id FROM enrollments"), conn
            ),
            "sections": pd.read_sql(text("SELECT id AS section_id, term_id FROM sections"), conn),
            "terms": pd.read_sql(
                text("SELECT id AS term_id, label, start_date, is_current FROM academic_terms"), conn
            ),
            "students": pd.read_sql(text("SELECT id AS student_id, program_id FROM students"), conn),
            "final_grades": pd.read_sql(
                text("SELECT enrollment_id, gpa_points FROM final_grades"), conn
            ),
            "components": pd.read_sql(
                text("SELECT id AS component_id, section_id FROM assessment_components"), conn
            ),
            "grade_entries": pd.read_sql(
                text(
                    "SELECT enrollment_id, assessment_component_id AS component_id, entered_at "
                    "FROM grade_entries"
                ),
                conn,
            ),
            "attendance": pd.read_sql(
                text("SELECT enrollment_id, session_date, status, recorded_at FROM attendance_records"),
                conn,
            ),
        }
    return {k: _stringify_uuids(v) for k, v in raw.items()}


def _dedupe_latest(df: pd.DataFrame, keys: list[str], order_col: str) -> pd.DataFrame:
    """Corrections are appended, not updated in place (rule #13) — keep only
    the most recent row per key so a superseded entry doesn't double-count."""
    return df.sort_values(order_col).groupby(keys, as_index=False).tail(1).drop(columns=[order_col])


def _enrollment_attendance_rate(attendance: pd.DataFrame) -> pd.DataFrame:
    att = attendance[attendance["status"] != "excused"].copy()
    att["weight"] = att["status"].map(ATTENDANCE_WEIGHT).fillna(0.0)
    return att.groupby("enrollment_id")["weight"].mean().rename("attendance_rate").reset_index()


def _expanding_slope(term_index: np.ndarray, values: np.ndarray) -> np.ndarray:
    """Trend slope of `values` against `term_index`, using only points up to
    and including each row — no lookahead into future terms."""
    out = np.zeros(len(values))
    for i in range(len(values)):
        x = term_index[: i + 1].astype(float)
        y = values[: i + 1].astype(float)
        mask = ~np.isnan(y)
        if mask.sum() < 2:
            out[i] = 0.0
            continue
        slope, _ = np.polyfit(x[mask], y[mask], 1)
        out[i] = slope
    return out


def _add_expanding_slopes(student_term: pd.DataFrame) -> pd.DataFrame:
    df = student_term.sort_values(["student_id", "term_index"]).reset_index(drop=True)
    gpa_slopes, att_slopes = [], []
    for _, g in df.groupby("student_id", sort=False):
        idx = g["term_index"].to_numpy()
        gpa_slopes.append(_expanding_slope(idx, g["gpa_points"].to_numpy()))
        att_slopes.append(_expanding_slope(idx, g["attendance_rate"].to_numpy()))
    df["gpa_trend_slope"] = np.concatenate(gpa_slopes)
    df["attendance_trend_slope"] = np.concatenate(att_slopes)
    return df


def _zscore(s: pd.Series) -> pd.Series:
    std = s.std(ddof=0)
    if not std or np.isnan(std):
        return pd.Series(0.0, index=s.index)
    return (s - s.mean()) / std


def build_feature_table(engine: Engine) -> pd.DataFrame:
    """One row per (student_id, term_id) with FEATURE_COLUMNS populated."""
    raw = _load_raw(engine)

    terms = raw["terms"].sort_values("start_date").reset_index(drop=True)
    terms["term_index"] = terms.index
    term_order = terms[["term_id", "term_index", "label", "is_current"]]

    grade_entries = _dedupe_latest(raw["grade_entries"], ["enrollment_id", "component_id"], "entered_at")
    attendance = _dedupe_latest(raw["attendance"], ["enrollment_id", "session_date"], "recorded_at")

    base = (
        raw["enrollments"]
        .merge(raw["sections"], on="section_id", how="left")
        .merge(term_order, on="term_id", how="left")
        .merge(raw["students"], on="student_id", how="left")
    )

    submitted = (
        grade_entries.groupby("enrollment_id")["component_id"].nunique().rename("submitted_count").reset_index()
    )
    total_components = raw["components"].groupby("section_id").size().rename("total_components").reset_index()
    attendance_rate = _enrollment_attendance_rate(attendance)

    base = (
        base.merge(raw["final_grades"], on="enrollment_id", how="left")
        .merge(attendance_rate, on="enrollment_id", how="left")
        .merge(submitted, on="enrollment_id", how="left")
        .merge(total_components, on="section_id", how="left")
    )
    base["submitted_count"] = base["submitted_count"].fillna(0)
    base["completeness"] = np.where(
        base["total_components"] > 0,
        base["submitted_count"] / base["total_components"],
        np.nan,
    )

    student_term = (
        base.groupby(["student_id", "program_id", "term_id", "term_index", "label", "is_current"], as_index=False)
        .agg(
            gpa_points=("gpa_points", "mean"),
            attendance_rate=("attendance_rate", "mean"),
            completeness=("completeness", "mean"),
        )
    )

    student_term = _add_expanding_slopes(student_term)

    student_term["peer_gpa_zscore"] = student_term.groupby(["term_id", "program_id"])["gpa_points"].transform(
        _zscore
    )
    student_term["peer_attendance_zscore"] = student_term.groupby(["term_id", "program_id"])[
        "attendance_rate"
    ].transform(_zscore)

    return student_term.sort_values(["student_id", "term_index"]).reset_index(drop=True)


def resolve_student_id_by_email(engine: Engine, email: str) -> str | None:
    with engine.connect() as conn:
        row = conn.execute(
            text('SELECT s.id FROM students s JOIN "user" u ON u.id = s.user_id WHERE u.email = :email'),
            {"email": email},
        ).fetchone()
    return str(row[0]) if row else None
