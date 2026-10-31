# Brightloop — Subscription Management System

> Subscription management built with NestJS, React, and a shared TypeScript package.

## Quick start

Use Node.js 24 LTS (24.11.0 or newer within the 24.x release line) and pnpm 12.16.1. The pinned package manager can be run through `npx` without a global install:

```sh
cp .env.example .env
docker compose up -d
npx --yes pnpm@12.16.1 install --frozen-lockfile
npx --yes pnpm@12.16.1 db:migrate
npx --yes pnpm@12.16.1 dev
```

- Web: http://127.0.0.1:5173
- API: http://127.0.0.1:4000 (scaffold `GET /` returns `{ "name": "Brightloop" }` until P0-04 adds `/api/v1/health`).
- PostgreSQL 16: `localhost:5432` (user, password and database `brightloop`).
- Mailpit: SMTP `localhost:1025`, inbox UI http://localhost:8025.
- Stop development processes with Ctrl+C; stop containers with `docker compose down` (add `-v` to wipe the database).

The API validates the root `.env` with Zod before Nest starts and exits with the names (never values) of invalid variables. `.env` is git-ignored; only `.env.example` is committed.

## Workspace

- `apps/api` — NestJS API; Jest + Supertest smoke test.
- `apps/web` — Vite + React SPA; Vitest + React Testing Library smoke test.
- `packages/shared` — `@brightloop/shared`, imported by both apps; Vitest smoke test.
- `docs` — requirements, architecture, rules, design, build plan, and progress.

The API and shared package use native ESM with TypeScript `NodeNext` resolution. Use `.js` extensions on their relative TypeScript imports. The shared package exports compiled JavaScript and declarations from `dist`; root `dev`, `test`, and `typecheck` build it first, and root `build` follows workspace dependency order. Development watches all three packages.

## Checks and scripts

If pnpm is already available, use the commands below directly. Otherwise, replace `pnpm` with `npx --yes pnpm@12.16.1`.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Database scripts (run from the root; they target `apps/api`):

| Script                                  | Does                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm db:migrate`                       | `prisma migrate dev` + client generation (applies all migrations to an empty database)        |
| `pnpm db:deploy`                        | `prisma migrate deploy` (no prompts, no new migrations)                                       |
| `pnpm db:status`                        | Shows whether the database is up to date                                                      |
| `pnpm db:validate` / `pnpm db:generate` | Validate the schema / regenerate the Prisma client                                            |
| `pnpm test:db`                          | Integration tests against the local Postgres; each run uses and drops its own isolated schema |

Only M1 edits `apps/api/prisma/schema.prisma`. Never edit an applied migration; add a new one.

`pnpm format` formats source and configuration. Existing planning documents are excluded to avoid unrelated formatting changes. Jest's ESM support currently requires Node's `--experimental-vm-modules` flag, already included in the API test script.

## Team handoff

The schema is migrated (P0-03): pull, copy `.env.example` to `.env`, `docker compose up -d`, `pnpm install`, `pnpm db:migrate`. M2 can wire **P0-04 (API core)** and **P0-06 (domain services)** to Prisma; M3 continues **P0-07 (web shell)**. M1 continues with **P0-08 (base seed)**. Use `docs/PHASES.md` for dependencies and update `docs/PROGRESS.md` when starting or finishing a task.

## Project Documentation

1. **[PRD.md](docs/PRD.md)** — Product Requirements Document (Source of truth for WHAT to build)
2. **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Modular Monolith Architecture, Data Models, Database Schemas & API Contracts
3. **[RULES.md](docs/RULES.md)** — Binding Engineering & Team Workflow Rules
4. **[DESIGN.md](docs/DESIGN.md)** — Visual System, Design Tokens & UI Guidelines
5. **[PHASES.md](docs/PHASES.md)** — Task Breakdown, Dependency Graph & Build Order
6. **[PROGRESS.md](docs/PROGRESS.md)** — Live Task Tracker, Decision Log & Blocker List
