# SATPS backend

Express owns authentication, authorization, PostgreSQL access, and API contracts. `web-app` is the Next.js frontend and should call `/api/v1/*` instead of importing database or auth modules.

```bash
cp .env.example .env
npm install
npm run dev
```

The backend exposes:

- `GET /api/v1/health`
- `GET /api/v1/session`
- `POST /api/v1/predictions/run` (faculty administrator)
- Better Auth at `/api/auth/*`

The schema and migrations live in this service under `src/domain` and `migrations`. The frontend has no database connection.
