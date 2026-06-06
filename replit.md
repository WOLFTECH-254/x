# JuneXDeployment

A modern web-based hosting platform that lets users deploy and manage Discord bots through an easy-to-use dashboard — powered by Heroku under the hood.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/junex run dev` — run the frontend (port 25434)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + JWT auth (bcryptjs + jsonwebtoken)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + framer-motion
- Routing: wouter
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — Single source of truth for API contract
- `lib/db/src/schema/` — Drizzle ORM table definitions (users, templates, deployments)
- `artifacts/api-server/src/routes/` — Express route handlers per domain
- `artifacts/api-server/src/lib/auth.ts` — JWT sign/verify + requireAuth/requireAdmin middleware
- `artifacts/junex/src/` — React frontend (pages, components, hooks)
- `artifacts/junex/src/hooks/use-auth.tsx` — Auth context (token in localStorage as `junex_token`)

## Architecture decisions

- Contract-first: OpenAPI spec gates both frontend codegen and backend validation.
- JWT stored in localStorage (`junex_token`); custom-fetch.ts auto-attaches it as Bearer token.
- First registered user is automatically promoted to admin.
- Deployments simulate Heroku build (status transitions queued → building → online) via setTimeout — replace with real Heroku Platform API calls.
- All CSS variables are HSL-based; purple (`265 80% 60%`) is the primary brand color with full dark/light mode support.

## Product

- Landing page with hero, features, how-it-works, and template showcase.
- User auth (register / login) with role-based access (user / admin).
- Template browser with search and category filters.
- Dynamic deployment form generated from each template's `appJson.env` fields.
- User dashboard: live deployment list, start/stop/restart/delete, log viewer, env var editor.
- Admin dashboard: platform stats, all users, all deployments, template CRUD, deployment suspension.

## User preferences

- Purple is the primary brand color.
- Dark mode and light mode both required (toggle in navbar).
- No emojis in the UI.

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change.
- Run `pnpm --filter @workspace/db run push` after any schema file change.
- The `api-server` must be rebuilt and restarted after route changes (`pnpm --filter @workspace/api-server run dev`).
- Do not inline request bodies in the OpenAPI spec — use `$ref` to named components to avoid TS2308 collisions.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
