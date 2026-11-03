# Smart Academic Tracking and Prediction System

SATPS tracks grades, attendance, academic progress, and predicted student risk. Students view their records; teachers manage grades and attendance; faculty administrators manage academic structure and run predictions.

## Project layout

```text
senior-project/
  web-app/        Next.js UI, Better Auth, API routes, Drizzle database access
  services/ml/    Python FastAPI, XGBoost, BiLSTM, model artifacts
```

Next.js serves the UI and authentication backend on port **3000**. FastAPI serves ML endpoints on port **8001**. Both use the same PostgreSQL database. FastAPI reads academic data and saves model artifacts locally; Next.js saves prediction results to PostgreSQL.

## 1. Requirements

- Node.js 22 LTS and npm
- Python 3.12 and `uv` (the ML project pins Python 3.12)
- Reachable PostgreSQL, such as a dedicated Supabase development database
- OpenSSL to generate local secrets

A GPU is optional. TensorFlow can train on CPU; missing CUDA driver messages alone are not startup failures.

All commands below specify their working directory. Replace `/path/to/senior-project` with your checkout path.

## 2. Install dependencies

Web dependencies, from `web-app/`:

```bash
cd /path/to/senior-project/web-app
npm ci
```

Known manifest gap: `app/providers.tsx` imports React Query packages that are currently absent from `package.json`. If installation/build reports these missing modules, install them locally and include the resulting manifest and lockfile changes in a separate dependency fix:

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

ML dependencies, from `services/ml/`:

```bash
cd /path/to/senior-project/services/ml
uv sync
```

`uv sync` creates `.venv` and installs the locked Python dependencies, including FastAPI, TensorFlow, XGBoost, pandas, scikit-learn, and SHAP. The initial download can be large.

## 3. Configure both environment files

Generate two separate secrets:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Use the first for `BETTER_AUTH_SECRET`. Use the second as the **same** `ML_SERVICE_TOKEN` in both files. Replace the placeholders below; do not paste secrets into screenshots or commit environment files.

From the repository root, copy the web example to the filename Next.js loads (skip this if your local file already exists):

```bash
cp web-app/.env.example web-app/.env.local
```

Edit `web-app/.env.local` to contain the following settings. Fix the example's missing closing quote on `BETTER_AUTH_URL` and add the ML settings:

```dotenv
DATABASE_URL="postgresql://WEB_USER:PASSWORD@HOST:5432/DATABASE"
BETTER_AUTH_SECRET="replace-with-first-generated-secret"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
ML_SERVICE_URL="http://localhost:8001"
ML_SERVICE_TOKEN="replace-with-second-generated-secret"
```

From the repository root, copy the ML example to `.env` (skip this if your local file already exists):

```bash
cp services/ml/.env.example services/ml/.env
```

Edit `services/ml/.env` with your database connection and shared token:

```dotenv
DATABASE_URL="postgresql://ML_READ_ONLY_USER:PASSWORD@HOST:5432/DATABASE"
ML_SERVICE_TOKEN="replace-with-second-generated-secret"
```

**NOTE:** The database URLs may use different roles, but must target the same project database and tables. The web role needs write access; the ML role should have SELECT access to the required tables. Obtain credentials from the database owner. For Supabase, use its provided connection details, including the appropriate username, port, and SSL settings; do not retain the local database URL from the ML example.


## 4. Prepare a development database

For a remote PostgreSQL database, you can use Supabase or your preferred PostgreSQL provider. If the database is already prepared, skip schema creation and seeding. Confirm with the database owner before changing a shared database.

From `web-app/`, apply the checked-in migrations:

```bash
node --env-file=.env.local ./node_modules/drizzle-kit/bin.cjs migrate
```

The existing `npm run db:migrate`, `db:generate`, `db:push`, and `db:studio` scripts reference `../../node_modules`, a path inherited from the old repository layout. The direct local command above avoids that path. If Drizzle reports an import/version error, resolve the installed `drizzle-kit` dependency before proceeding; migration success is required.

For a fresh disposable development database, seed synthetic data:

```bash
npm run db:seed
```

Seed only once on a fresh database. The seed script is not a general-purpose reset or safe repeatable migration. It creates academic records and demo users; repeated execution can encounter duplicates or leave partial data.

Demo accounts created by the seed:

| Role | Email |
| --- | --- |
| Student | `student1@satps.edu` |
| Student | `student2@satps.edu` |
| Teacher | `teacher1@satps.edu` |
| Teacher | `teacher2@satps.edu` |
| Faculty administrator | `admin@satps.edu` |

These credentials are for synthetic local/demo data only. Without seeding, use an account provided by your administrator. The sign-in page does not provide a registration form.

## 5. Run both services

Terminal 1: start the ML service first.

```bash
cd /path/to/senior-project/services/ml
uv run uvicorn app.main:app --reload --port 8001
```

Wait for FastAPI's **Application startup complete** message. The earlier reloader message alone does not confirm that the application loaded. Keep this terminal running.

Terminal 2: start the web application.

```bash
cd /path/to/senior-project/web-app
npm run dev
```

| URL | Purpose |
| --- | --- |
| http://localhost:3000 | Web application |
| http://localhost:3000/api/auth/get-session | Current login session, or `null` when logged out |
| http://localhost:8001/health | ML process health |
| http://localhost:8001/health/db | ML database connectivity |
| http://localhost:8001/docs | Interactive API checks |

Both health endpoints should return `{"status":"ok"}`. Login requires Next.js and the database; it does not require FastAPI.

## 6. Check the ML API

Use synthetic development data for these checks. Final training requires stable feature columns, labels, risk-threshold behavior, and a prepared database.

In `/docs`, click **Authorize** and enter only the shared token. Swagger adds the `Bearer` prefix.

| Check | Action | Expected result |
| --- | --- | --- |
| List models | `GET /models` | `200`; `[]` before the first training run |
| Train XGBoost | `POST /train/xgboost` | `200` with version, artifact path, metrics, and train/test counts |
| Predict XGBoost | `POST /predict/batch`, body below | `200` with prediction records |
| Train BiLSTM | `POST /train/bilstm` | `200` with training details |
| Predict BiLSTM | Repeat batch request with `bilstm` | `200` with prediction records |
| List saved versions | `GET /models` | Both trained model types listed |

XGBoost request body:

```json
{"model_type":"xgboost"}
```

BiLSTM request body:

```json
{"model_type":"bilstm"}
```

Each prediction includes student and term IDs, model type, artifact path, risk score/level, confidence score, predicted final grade, and contributing factors. A successful but empty batch response does not demonstrate predictions for students; check current-term data if the list is empty.

Also verify these cases:

1. Call `POST /predict/student/{student_id}` for a student ID returned by the batch endpoint, using each model type. Expect `200` and only that student's results. Use `students.id`, not the authentication user ID.
2. Log out through Swagger's Authorize dialog and call `GET /models`. Expect `401`. Repeat with an incorrect token, then restore the valid token.
3. Send `{"model_type":"invalid"}` to `/predict/batch`. Expect `422`.
4. Request a student UUID that does not exist. Expect `404` once the model is trained and the database is reachable.

The `422` example in Swagger's documentation is not an actual failure. Read the **Server response** status for the request you executed.

BiLSTM trains for up to 150 epochs with early stopping. Training progress is currently suppressed (`verbose=0`), so the terminal can be quiet while training. CPU training time varies.

## 7. Check the complete web workflow

Swagger predictions **do not write risk assessments to PostgreSQL**. Complete this workflow to display predictions on the student page:

1. Sign in as `admin@satps.edu` (faculty administrator).
2. Open `/admin/models` and click **Run Predictions** once.
3. Wait for completion. This action retrains both models, predicts for both, registers model versions, saves risk assessments, and creates alerts/recommendations for non-normal XGBoost results.
4. Confirm both model types appear in the trained versions table. Also check `/admin/risk-review`.
5. Sign out, sign in as a seeded student, and open `/student/predictions`.
6. Confirm the predicted GPA, risk level, confidence, contributing factors, and model/version appear. Check risk alerts and recommendations for a student with non-normal risk; normal-risk students need not receive new alerts.

The student page reads the latest saved assessment. The integration persists XGBoost last so it is the default displayed model. FastAPI and Next.js must point to the same underlying database for student IDs to match.

If Run Predictions fails, inspect the error below the button and both terminal logs. The integration is not one atomic database transaction; a failed run can leave partially saved results. Do not assume that seeing model rows proves the entire run completed.

Additional role checks on demo data:

- Student: grades, attendance, reports, predictions, and risk pages load for the signed-in student.
- Teacher: open an assigned section, save a demo grade/attendance change, and reload to confirm persistence.
- Faculty administrator: inspect users, academic structure, alert configuration, risk review, and audit logs.
- Logged-out users and users with the wrong role must not access protected workspaces/actions.

## 8. Static checks and production build

From `web-app/`:

```bash
npm run lint
npx tsc --noEmit --incremental false
npm run build
```

After a successful build, `npm run start` serves it. Stop the development server first if both would use port 3000.

From `services/ml/`, check Python syntax without running training:

```bash
uv run python -c 'import ast; from pathlib import Path; files = list(Path("app").rglob("*.py")); [ast.parse(p.read_text(), filename=str(p)) for p in files]; print(f"Syntax OK: {len(files)} files")'
```

There is no dedicated automated ML test suite included with the ML service. Syntax and static checks do not replace the API and web checks above. A clean-install web build has not been verified by this guide; missing React Query dependencies and a previously observed Drizzle `defineConfig` type error must be resolved if present.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Login says `Failed to fetch` | Next.js is running; browser URL and auth URLs use the same host/port; restart after env edits |
| Login says `Invalid credentials` | Account/password exists in the connected database; demo users require seeding |
| Settings validation says fields are missing | `services/ml/.env` contains `DATABASE_URL` and `ML_SERVICE_TOKEN`; launch from `services/ml/` |
| `ML_SERVICE_URL / ML_SERVICE_TOKEN not configured` | Both values exist in `web-app/.env.local`; restart Next.js |
| ML endpoint returns `401` | Tokens match exactly in both files; restart both services and update Swagger authorization |
| `/health/db` fails | Database credentials, role grants, network access, SSL settings, and connection URL |
| Student page has no predictions | Run through the admin web button to persist results; confirm the student has current-term data |
| Run Predictions takes a long time | Training is silent; after both batch requests return `200`, Next.js still saves rows sequentially, which can be slow over a remote connection |
| No CUDA drivers | CPU execution is supported; this message alone is not an error |

## Model limitations and API documentation

Successful HTTP responses demonstrate that the workflow executes, not that predictions are accurate. Evaluate per-class performance, data quality, and feature/label agreement before relying on the results. Seed data is synthetic.

XGBoost explanations use SHAP. BiLSTM explanations currently use deviations from a baseline, although the response field is named `shapValue`; do not describe these as calibrated Shapley values. Confidence scores should not be presented as validated probabilities of correctness.

Document endpoint contracts using the tables above, sanitized request/response examples, measured training metrics, and verification results. The full machine-readable API schema is available at `http://localhost:8001/openapi.json`. Share secrets separately, never in documentation.

Before committing, review `git status` and stage only intended source/documentation changes. Keep `.env*`, `.venv/`, `__pycache__/`, and `services/ml/artifacts/` out of Git.
