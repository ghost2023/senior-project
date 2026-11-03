from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

_bearer = HTTPBearer(auto_error=False)


def verify_service_token(credentials: HTTPAuthorizationCredentials | None = Security(_bearer)) -> None:
    """Every /train and /predict endpoint requires the shared secret Next.js
    presents (ML_SERVICE_TOKEN, matched between apps/web/.env.local and
    services/ml/.env) — /health and /debug stay open since they're read-only
    diagnostics with nothing sensitive to protect."""
    if credentials is None or credentials.credentials != settings.ml_service_token:
        raise HTTPException(status_code=401, detail="missing or invalid service token")
