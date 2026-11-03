# Brightloop — Subscription Management System

> Production-grade, deterministic subscription management and recurring billing platform built with NestJS, React, PostgreSQL, and a shared TypeScript domain engine.

[![Tests](https://img.shields.io/badge/tests-174%20passed-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/typecheck-clean-blue.svg)]()
[![ESLint](https://img.shields.io/badge/eslint-0%20warnings-success.svg)]()

---

## Quick Start

Ensure you have **Node.js 24 LTS** (`>=24.11.0 <25`) and **pnpm 12.16.1** installed (or execute via `npx --yes pnpm@12.16.1`):

```sh
# 1. Environment configuration
cp .env.example .env

# 2. Start PostgreSQL 16 & Mailpit services
docker compose up -d

# 3. Install workspace dependencies
pnpm install --frozen-lockfile

# 4. Migrate database & seed base catalog, admin and demo records
pnpm db:migrate
pnpm db:seed

# (Optional) Generate large scale stress-test dataset (50+ customers, 100+ subscriptions, 200+ invoices):
# pnpm db:seed:large

# 5. Launch development services (API + Web + Shared watch)
pnpm dev
```

- **Web Application**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **API Core**: [http://127.0.0.1:4000/api/v1](http://127.0.0.1:4000/api/v1) (`/health`)
- **Mailpit Email Inspector**: [http://localhost:8025](http://localhost:8025) (SMTP on `localhost:1025`)
- **PostgreSQL**: `localhost:5432` (`brightloop` / `brightloop`)

---

## Evaluator Walkthrough & Demo Script

A detailed step-by-step evaluator script following the "month at Brightloop" workflow across all personas (Admin, Sales Staff, Customer Portal, Finance Lead) is provided in:

👉 **[DEMO.md](DEMO.md)**

---

## Seed Logins

| Persona | Email | Password | Capabilities |
|---|---|---|---|
| **Admin** | `admin@brightloop.local` | `Admin@12345` | Full system access, staff, billing runs, settings, reports |
| **Sales Staff** | `priya@brightloop.local`, `rahul@brightloop.local` | `Staff@12345` | Quotations, subscriptions, customer management, invoicing |
| **Customer** | `ananya@nimbuslabs.in` (+ 7 more from base seed) | `Customer@123` | Self-serve portal: review quotes, inspect invoices, manage profile |

---

## Architectural Highlights

- **Shared Domain Engine (`packages/shared`)**:
  - Deterministic pricing engine (`priceDocument`) with exact round-half-up decimal math, product and subscription-scoped discount allocations, and proportional line net distribution.
  - Subscription finite state machine (`canTransition`, `allowedActions`) enforcing invariant rules and one-time renewal constraints.
- **Transactional Consistency & Concurrency**:
  - PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) on subscription transitions and payment recording.
  - PostgreSQL session-level advisory locks (`pg_try_advisory_xact_lock`) on automated billing runs ensuring absolute idempotency.
- **Security & Authorization**:
  - Stateless HS256 JWT access tokens paired with rotating DB-backed refresh tokens in HTTP-only cookies.
  - Strict Role-Based Access Control (`ADMIN`, `STAFF`, `CUSTOMER`) enforced at controller and route handler boundaries.
  - Automatic tenant/customer scoping on all Customer Portal endpoints.
- **Document & Notification Engine**:
  - On-the-fly PDF invoice generation using `pdfkit`.
  - Transactional email dispatch for customer invites, password reset tokens, and invoice notifications.

---

## Workspace Structure

```
├── apps/
│   ├── api/             # NestJS API modular monolith (PostgreSQL, Prisma, Auth, Billing)
│   └── web/             # Vite + React 19 SPA (Tailwind v4, Radix UI, TanStack Query)
├── packages/
│   └── shared/          # TypeScript domain models, schemas, pricing & state machines
└── docs/                # Comprehensive engineering and product specifications
```

---

## Verification & Quality Commands

```sh
# Linting (enforces 0 warnings policy)
pnpm lint

# Static type verification across all monorepo packages
pnpm typecheck

# Full test suite (174 passing unit & feature tests)
pnpm test

# Full production build
pnpm build

# Formatting verification
pnpm format:check
```

---

## Database Commands

| Command | Description |
|---|---|
| `pnpm db:migrate` | Runs `prisma migrate dev` and updates Prisma client |
| `pnpm db:deploy` | Deploys pending migrations in production / CI |
| `pnpm db:seed` | Seeds base catalog, taxes, terms, users, and demo subscriptions |
| `pnpm db:seed:large` | Generates scale dataset: 50+ customers, 100+ subscriptions, 200+ invoices |
| `pnpm db:status` | Validates migration status against database |

---

## Project Documentation Index

1. **[DEMO.md](DEMO.md)** — Evaluator 7-Minute Walkthrough Script
2. **[PRD.md](docs/PRD.md)** — Product Requirements Document (Functional specifications)
3. **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Architecture, Data Schemas & API Contracts
4. **[RULES.md](docs/RULES.md)** — Binding Code & Quality Standards
5. **[DESIGN.md](docs/DESIGN.md)** — Design Tokens, Typography & Component Guidelines
6. **[PHASES.md](docs/PHASES.md)** — Project Phased Execution Plan
7. **[PROGRESS.md](docs/PROGRESS.md)** — Implementation Tracker & Decision Record
