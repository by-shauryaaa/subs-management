# Brightloop — Subscription Management System

> Subscription management built with NestJS, React, and a shared TypeScript package.

## Quick start

Use Node.js 24 LTS (24.11.0 or newer within the 24.x release line) and pnpm 12.16.1. The pinned package manager can be run through `npx` without a global install:

```sh
npx --yes pnpm@12.16.1 install --frozen-lockfile
npx --yes pnpm@12.16.1 dev
```

- Web: http://127.0.0.1:5173
- API scaffold: http://127.0.0.1:3000 returns `{ "name": "Brightloop" }`.
- Stop development processes with Ctrl+C.

P0-01 is the workspace scaffold only. Database setup, authentication, `/api/v1/health`, and the designed web shell belong to the next tasks; no database or environment secrets are required yet.

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

`pnpm format` formats source and configuration. Existing planning documents are excluded to avoid unrelated formatting changes. Jest's ESM support currently requires Node's `--experimental-vm-modules` flag, already included in the API test script.

## Team handoff

After pulling and installing, M2 can start **P0-05 (shared utilities)** and M3 can start **P0-07 (web shell)**. M1 continues with **P0-02 (local infrastructure)**. Use `docs/PHASES.md` for dependencies and update `docs/PROGRESS.md` when starting or finishing a task.

## Project Documentation

1. **[PRD.md](docs/PRD.md)** — Product Requirements Document (Source of truth for WHAT to build)
2. **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Modular Monolith Architecture, Data Models, Database Schemas & API Contracts
3. **[RULES.md](docs/RULES.md)** — Binding Engineering & Team Workflow Rules
4. **[DESIGN.md](docs/DESIGN.md)** — Visual System, Design Tokens & UI Guidelines
5. **[PHASES.md](docs/PHASES.md)** — Task Breakdown, Dependency Graph & Build Order
6. **[PROGRESS.md](docs/PROGRESS.md)** — Live Task Tracker, Decision Log & Blocker List
