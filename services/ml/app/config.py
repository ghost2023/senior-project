from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Read-only Postgres connection — same database Next.js writes to (see
    # ARCHITECTURE.md's "ML integration boundary": this service never writes
    # to Postgres, Next.js persists whatever this service returns).
    database_url: str

    # Shared secret the Next.js app presents on every request to this
    # service (checked by verify_service_token in app/auth.py once real
    # endpoints exist beyond /health).
    ml_service_token: str

    @property
    def sqlalchemy_database_url(self) -> str:
        """SQLAlchemy + psycopg3 need an explicit dialect+driver prefix;
        Next.js's DATABASE_URL uses the driver-agnostic `postgres://` scheme."""
        url = self.database_url
        if url.startswith("postgres://"):
            return "postgresql+psycopg://" + url[len("postgres://") :]
        if url.startswith("postgresql://") and "+psycopg" not in url:
            return "postgresql+psycopg://" + url[len("postgresql://") :]
        return url


settings = Settings()
