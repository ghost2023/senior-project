# SATPS application boundary

The repository now has two application processes:

```text
browser -> web-app (Next.js UI, port 3000)
                 -> /api/backend/* rewrite
              backend (Express API + Better Auth, port 4000)
                 -> PostgreSQL
                 -> services/ml
```

`web-app` owns pages, components, styling, and browser state. `backend` owns authentication, authorization, persistence, domain queries, mutations, and API orchestration. New server functionality should be added to `backend/src`, then consumed through `web-app/lib/backend-client.ts`.

Run both services in separate terminals:

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd web-app && npm install && npm run dev
```

The Next rewrite keeps the browser on one origin during local development and forwards `/api/backend/health` to Express `/api/v1/health`.
