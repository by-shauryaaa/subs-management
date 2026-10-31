# PROGRESS — Brightloop build tracker

> **Every team member updates this file.** Before starting a task, mark it 🟡 with the time you started. After finishing (all checks green), mark it ✅ and add a log entry at the **top** of the Work log. Record every non-trivial choice in the Decisions log. Never delete history; correct it with a new entry.

**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Done · ⛔ Blocked · ⏭️ Skipped (with reason)

---

## Snapshot

| | |
|---|---|
| Current phase | Phase 0 — Foundation |
| Last updated | 2026-10-31 |
| Overall | 11 / 50 tasks done (39 build tasks remaining) |

| Phase | Done / Total | Status |
|---|---|---|
| P0 Foundation | 7 / 8 | 🟡 |
| P1 Auth & users | 0 / 7 | ⬜ |
| P2 Catalog & config | 0 / 5 | ⬜ |
| P3 Quotations & subscriptions | 0 / 7 | ⬜ |
| P4 Billing & invoices | 0 / 5 | ⬜ |
| P5 Discounts & payments | 0 / 3 | ⬜ |
| P6 Portal, reports, settings | 0 / 5 | ⬜ |
| P7 Hardening & demo | 0 / 6 | ⬜ |
| Project docs | 4 / 4 | ✅ |

---

## Task board

> Owners and slots come from `PHASES.md` (times are `T+h:mm` from the start of the build). Update **Status** and **Started / done** (e.g. `T+1:32 / T+2:01`). Details and acceptance criteria are in `PHASES.md`.

### Team
| Member | Name | Lane | Tasks |
|---|---|---|---|
| M1 | _(fill in)_ | Data and billing | 17 |
| M2 | _(fill in)_ | Logic, auth and money | 17 |
| M3 | _(fill in)_ | UI and design | 12 |

### Checkpoints
| Time | Checkpoint | Done? |
|---|---|---|
| T+0:20 | Scaffold pushed, everyone pulled | ⬜ |
| T+1:30 | Phase 0 exit demo | ⬜ |
| T+2:30 | Phase 1 exit demo | ⬜ |
| T+3:15 | Phase 2 exit demo | ⬜ |
| T+4:30 | Phase 3 exit demo | ⬜ |
| T+5:45 | Phase 4 exit demo | ⬜ |
| T+6:30 | Phase 5 exit demo | ⬜ |
| T+7:15 | Phase 6 exit demo | ⬜ |
| T+7:50 | Code freeze + demo dry run | ⬜ |

### Project setup
| ID | Task | Owner | Slot | Status | Started / done |
|---|---|---|---|---|---|
| DOC-01 | PRD, ARCHITECTURE, RULES, PHASES, DESIGN, PROGRESS written | Team | — | ✅ | 2026-10-31 |
| DOC-02 | Decisions D-001…D-012 recorded | Team | — | ✅ | 2026-10-31 |
| DOC-03 | Task board initialised | Team | — | ✅ | 2026-10-31 |
| DOC-04 | Three-member lanes and 8-hour timeline added to PHASES | Team | — | ✅ | 2026-10-31 |

### Phase 0 — Foundation
| ID | Task | Owner | Slot | Status | Started / done |
|---|---|---|---|---|---|
| P0-01 | Scaffold monorepo | M1 | 0:00–0:20 | ✅ | 2026-10-31 14:53 / 15:04 IST |
| P0-02 | Local infrastructure | M1 | 0:20–0:35 | ✅ | 2026-10-31 15:10 / 15:20 IST |
| P0-03 | Database schema & migrations | M1 | 0:35–1:05 | ✅ | 2026-10-31 15:20 / 15:32 IST |
| P0-04 | API core | M2 | 0:50–1:10 | ✅ | 2026-10-31 16:00 / 16:08 IST |
| P0-05 | Shared package basics | M2 | 0:20–0:50 | ✅ | 2026-10-31 15:24 / 15:32 IST |
| P0-06 | Domain services (numbering, audit, settings, mail) | M2 | 1:10–1:30 | ⬜ | |
| P0-07 | Web shell | M3 | 0:20–1:30 | ✅ | 2026-10-31; all required checks passed |
| P0-08 | Base seed | M1 | 1:05–1:30 | ✅ | 2026-10-31 15:33 / 15:36 IST |

### Phase 1 — Auth & users
| ID | Task | Owner | Slot | Status | Started / done |
|---|---|---|---|---|---|
| P1-01 | Signup, login, refresh, logout, me | M2 | 1:30–2:00 | ⬜ | |
| P1-02 | RBAC & ownership | M2 | 2:00–2:15 | ⬜ | |
| P1-03 | Forgot/reset password & invites | M2 | 2:15–2:30 | ⬜ | |
| P1-04 | Staff management | M1 | 2:00–2:30 | ⬜ | |
| P1-05 | Customers | M1 | 1:30–2:00 | ⬜ | |
| P1-06 | Web auth flows | M3 | 1:30–2:05 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |
| P1-07 | Web users & customers pages | M3 | 2:05–2:30 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |

### Phase 2 — Catalog & configuration
| ID | Task | Owner | Slot | Status | Started / done |
|---|---|---|---|---|---|
| P2-01 | Taxes | M3 | 2:30–2:45 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |
| P2-02 | Payment terms | M3 | 2:45–2:55 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |
| P2-03 | Products | M1 | 2:30–2:55 | ⬜ | |
| P2-04 | Attributes & variants | M1 | 2:55–3:15 | ⬜ | |
| P2-05 | Plans | M3 | 2:55–3:15 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |

### Phase 3 — Quotations & subscriptions
| ID | Task | Owner | Slot | Status | Started / done |
|---|---|---|---|---|---|
| P3-01 | Pricing engine (shared) | M2 | 2:30–3:00 | ⬜ | |
| P3-02 | State machines (shared) | M2 | 3:00–3:20 | ⬜ | |
| P3-03 | Quotation templates | M2 | 3:20–3:50 | ⬜ | |
| P3-04 | Subscriptions CRUD | M1 | 3:15–3:50 | ⬜ | |
| P3-05 | Transitions, renewal, audit | M1 | 3:50–4:30 | ⬜ | |
| P3-06 | From template | M2 | 3:50–4:05 | ⬜ | |
| P3-07 | Subscriptions UI | M3 | 3:15–4:30 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |

### Phase 4 — Billing & invoices
| ID | Task | Owner | Slot | Status | Started / done |
|---|---|---|---|---|---|
| P4-01 | Invoice generator | M1 | 4:30–5:00 | ⬜ | |
| P4-02 | Billing run & lifecycle jobs | M1 | 5:00–5:45 | ⬜ | |
| P4-03 | Invoice actions | M2 | 4:30–5:05 | ⬜ | |
| P4-04 | Invoice PDF & send | M2 | 5:05–5:45 | ⬜ | |
| P4-05 | Invoices & billing-runs UI | M3 | 4:30–5:45 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |

### Phase 5 — Discounts & payments
| ID | Task | Owner | Slot | Status | Started / done |
|---|---|---|---|---|---|
| P5-01 | Discount rules | M2 | 4:05–4:30 | ⬜ | |
| P5-02 | Discounts on subscriptions | M1 | 5:45–6:30 | ⬜ | |
| P5-03 | Payments | M2 | 5:45–6:15 | ⬜ | |

### Phase 6 — Portal, reports, settings
| ID | Task | Owner | Slot | Status | Started / done |
|---|---|---|---|---|---|
| P6-01 | Portal API | M1 | 6:30–6:55 | ⬜ | |
| P6-02 | Portal UI | M3 | 6:50–7:30 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |
| P6-03 | Reports API | M2 | 6:15–6:45 | ⬜ | |
| P6-04 | Finance dashboard UI | M3 | 6:05–6:50 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |
| P6-05 | Settings UI | M3 | 5:45–6:05 | ⬜ | |

### Phase 7 — Hardening & demo
| ID | Task | Owner | Slot | Status | Started / done |
|---|---|---|---|---|---|
| P7-01 | Large seed | M1 | 6:55–7:15 | ⬜ | |
| P7-02 | Performance pass | M1 | 7:15–7:35 | ⬜ | |
| P7-03 | E2E tests | M2 | 7:05–7:40 | ⬜ | |
| P7-04 | Security review | M2 | 6:45–7:05 | ⬜ | |
| P7-05 | UX polish | M3 | 7:30–7:50 | 🟡 | Frontend in progress; see M3-CHECKLIST.md |
| P7-06 | README & demo script | M1 | 7:35–7:50 | ⬜ | |

---

## Work log (newest first)

### 2026-10-31 — P0-07 Web shell — M3
- Status: ✅ Done
- What changed: Token-based light/dark theme, fonts, responsive app/auth/portal layouts, collapsible sidebar and mobile Radix dialog, shadcn-compatible Button and configuration, Query provider, API envelope parsing and single-flight token refresh, Money, StatusBadge, EmptyState, PageHeader and server-mode URL-synced DataTable.
- Tests: lint and workspace typecheck passed; workspace tests passed (web 7, shared 1, API 1); web production build passed.
- Notes: Business routes intentionally show setup content until their assigned tasks land. Authentication forms, session provider, role-based navigation and guards belong to P1-06. Browser visual review is still pending. No backend/shared files edited. Nothing pushed.


Entry format:

```
### YYYY-MM-DD HH:MM (IST) — <Task ID> <short title> — <M1/M2/M3 name>
- Status: ✅ Done | 🟡 Partial | ⛔ Blocked
- What changed: <files/modules, endpoints, migrations>
- Tests: <what was added; lint/typecheck/test result>
- Notes / follow-ups: <anything the next person must know>
```

### 2026-10-31 15:36 (IST) — P0-08 Base seed — M1
- Status: ✅ Done
- What changed: `prisma/seed/base.ts` (`seedBase`): admin from env (argon2id hash, lower-cased email), ADM-01 default settings, GST 5/12/18 taxes, Immediate/Net 15/Net 30 terms, Brand attribute (Odoo +560, Generic +0); all upserts that keep existing rows. `prisma/seed.ts` entry prints logins; `pnpm db:seed` script; `loadEnvironment(envFile?)` accepts a path for callers outside `src/`. Extracted `test/support/test-database.ts`. README seed logins; ARCHITECTURE Setting-keys table. D-018…D-020.
- Tests: `test/seed.integration.ts` (admin hash/email, settings, taxes/terms/attribute values, idempotent re-run keeps edited settings). `lint`, `typecheck`, `test:db` (12 tests) pass; `pnpm db:seed` run twice against the dev DB.
- Notes / follow-ups: **M2:** `SettingsService` (P0-06) should use the D-019 keys/defaults (`DEFAULT_SETTINGS` in `prisma/seed/base.ts`); auth (P1-01) can verify seed hashes with `@node-rs/argon2` (already a dependency) — see D-018.

### 2026-10-31 15:32 (IST) — P0-03 Database schema & migrations — M1
- Status: ✅ Done
- What changed: Finished the P0-03 handoff: README quick start (env, Docker, migrate), database script table and team handoff; ARCHITECTURE §3 notes the port and Prisma 7 config/adapter; D-017 records the new dependency versions.
- Tests: `install --frozen-lockfile`, `lint`, `typecheck`, `test`, `test:db` (8 isolated-schema integration tests), `build`, `format:check` all pass; `db:status` reports 2 migrations, up to date.
- Notes / follow-ups: Schema updated: pull + `pnpm install` + `pnpm db:migrate`. M2 can wire P0-04 PrismaService against it (use `@prisma/adapter-pg`, see `test/schema.integration.ts`).

### 2026-10-31 15:27 (IST) — P0-02 / P0-03 paused at user request — M1
- Status: 🟡 Partial overall; P0-02 implementation verified, P0-03 implementation and database tests verified but final handoff not completed.
- What changed: Added PostgreSQL 16 and Mailpit Compose services, the exact documented `.env.example`, typed Zod environment validation before API boot, configured port 4000, and root web env loading. Added canonical Prisma schema, Prisma 7 config, generated client, initial SQL migration and separate partial unique invoice-period index migration, database scripts and isolated-schema integration tests.
- Tests: PostgreSQL and Mailpit healthy; API root `.env` and Mailpit HTTP smoke passed; invalid environment exits before Nest startup. Both migrations applied from an empty local database; second `db:migrate` is a no-op; `db:status` is up to date. Latest lint, typecheck, 89 normal tests and 8 isolated-database integration tests passed. Fixed the in-progress Jest environment-loading issue using explicit file parsing without mutating process.env. Test schemas cleaned up.
- Notes / follow-ups: Stopped as requested. Changes are local and uncommitted/unpushed. Remaining: update README/ARCHITECTURE and dependency Decisions log, final production build/format/frozen-install checks and final review, then mark P0-03 done and commit/push. Local `.env` is ignored; Docker services remain running. No later feature tasks started.

### 2026-10-31 15:04 (IST) — P0-01 Scaffold monorepo — M1
- Status: ✅ Done
- What changed: Added pnpm workspaces (`apps/api`, `apps/web`, `packages/shared`), strict TypeScript, ESLint flat config, Prettier, pinned dependencies and lockfile, root scripts, and runnable NestJS/React entry points importing the shared package. Moved the six planning documents to `docs/`, updated README links/setup/handoff, and aligned the architecture notes.
- Tests: `install --frozen-lockfile`, `lint`, `typecheck`, `test` (3 smoke tests: shared export, API HTTP response, React heading), `build`, and `format:check` passed using pnpm 12.16.1. Bounded root `dev` smoke verified API JSON, web HTML, and Vite's transformed React entry; all spawned dev processes were stopped. Fixed Windows-incompatible single-quoted workspace filters found by that smoke test. Read-only scaffold review found no blocking issues.
- Notes / follow-ups: Node 24 LTS; pnpm may be invoked with `npx --yes pnpm@12.16.1` (no global installation needed). M2 can start P0-05, M3 P0-07, M1 P0-02. API core/auth/database/UI shell remain unimplemented by design. The T+0:20 checkpoint stays unchecked until teammates have pulled.

### 2026-10-31 14:16 (IST) — DOC-04 Team plan — Team
- Status: ✅ Done
- What changed: `PHASES.md` now assigns every task to M1, M2 or M3 with a time slot on an 8-hour timeline, hard (⚑) vs soft dependencies, checkpoints and hand-offs. `RULES.md` has a Hackathon mode section. Task board here pre-filled with owners and slots. No features or tasks removed.
- Tests: n/a
- Notes / follow-ups: Fill in names in the Team table. M1 starts P0-01 at T+0:00.

### 2026-10-31 13:47 (IST) — DOC-01 Project documents — Team
- Status: ✅ Done
- What changed: Created `PRD.md`, `ARCHITECTURE.md`, `RULES.md`, `PHASES.md`, `DESIGN.md`, `PROGRESS.md`.
- Tests: n/a
- Notes / follow-ups: Start with P0-01. Record exact package versions as D-014 when scaffolding.

---

## Decisions log

> Format: `D-NNN · date · decision · why · affects`. Add new decisions at the bottom.

| ID | Date | Decision | Why | Affects |
|---|---|---|---|---|---|
| D-001 | 2026-10-31 | Modular monolith: NestJS + PostgreSQL + Prisma, React/Vite SPA, pnpm monorepo with shared package | Billing correctness needs one transactional DB; shared Zod/pricing avoids client/server drift | All |
| D-002 | 2026-10-31 | Plan price is a per-period **base fee**, added to subscriptions as a locked plan-fee line | The brief gives plans a price separate from product lines; modelling it as a line keeps the pricing engine uniform | PLAN-04, pricing |
| D-003 | 2026-10-31 | Bill **in advance**: first invoice on activation, then one per period; no proration | Common SaaS practice; simple and predictable | INV-01 |
| D-004 | 2026-10-31 | Idempotency via partial unique index `(subscriptionId, periodStart) WHERE status <> 'CANCELLED'` | "Nothing billed twice" is guaranteed by the DB, and cancelled periods can be regenerated | INV-03, P0-03 |
| D-005 | 2026-10-31 | Billing periods computed from the anchor start date (`periodStart(start, period, n)`) | Prevents month-end date drift | dates.ts, billing |
| D-006 | 2026-10-31 | No payment gateway; staff record payments with a method | Out of scope for v1; keeps the focus on billing logic | PAY |
| D-007 | 2026-10-31 | Single currency (setting, default INR) and business time zone setting (default Asia/Kolkata) | Brightloop is one company; dates must match the business day | ADM-01 |
| D-008 | 2026-10-31 | Discounts are attached to subscriptions; product-scope discounts apply first, then subscription-scope; one use per invoice; released on cancel | Makes "applies on its own" and usage limits precise and testable | DISC |
| D-009 | 2026-10-31 | Overdue and quotation-expired are derived at read time, not stored states | No sync jobs to fail; always correct | INV-06, QT-03 |
| D-010 | 2026-10-31 | Scheduler via `@nestjs/schedule` + Postgres advisory lock (no Redis/queue) | Fewer moving parts; the lock prevents concurrent runs | P4-02 |
| D-011 | 2026-10-31 | Access JWT in memory + rotating refresh token in httpOnly cookie | Avoids XSS token theft from localStorage | AUTH |
| D-012 | 2026-10-31 | Password rule: ≥ 9 chars ("more than eight"), upper, lower, special | Literal reading of the brief | AUTH-01 |
| D-013 | 2026-10-31 | Three lanes (M1 data & billing, M2 logic/auth/money, M3 UI) on an 8-hour timeline; hard (⚑) vs soft dependencies; M1 sole owner of `schema.prisma`, M2 of `packages/shared` | Hackathon time box: parallel work against fixed contracts keeps full scope | PHASES, RULES |
| D-014 | 2026-10-31 | Pin P0-01 direct dependencies to the exact versions listed below; commit pnpm lockfile | Reproducible installs across all three members | All workspace packages |
| D-015 | 2026-10-31 | Use native ESM for NestJS 12 and shared, TypeScript 6.0.3, jsdom 29.1.1, ESLint flat config, and Jest's ESM VM flag | NestJS 12 is ESM-only; typescript-eslint supports TS <6.1 and ts-jest <7; jsdom 30 requires a newer Node than installed Node 24.11.0 | Build, lint, tests, Node runtime |
| D-016 | 2026-10-31 | Permit install scripts only for `@parcel/watcher` and `unrs-resolver`; retain pnpm's exact `eslint@10.14.0` release-age exception | Required native watcher/resolver setup without blanket dependency-script approval; exact-version exception created by pnpm's install policy | pnpm-workspace.yaml |
| D-017 | 2026-10-31 | P0-02/P0-03 dependencies: `zod` **4.6.7** (API env validation), `prisma` / `@prisma/client` / `@prisma/adapter-pg` **7.10.1**, `pg` / `@types/pg` **8.23.1**; Prisma 7 `prisma.config.ts` reads `DATABASE_URL` from the root `.env`; install scripts allowed for `prisma` and `@prisma/engines` | Prisma 7 requires a driver adapter and config file; Zod is the documented validator; engine download needs its install script | apps/api, pnpm-workspace.yaml |
| D-018 | 2026-10-31 | Hash passwords with `@node-rs/argon2` **2.2.2** (argon2id default, standard PHC string) instead of `argon2` | `argon2` has no prebuilt binary for Windows ARM64 and needs a native toolchain; the napi-rs build ships one for every platform without install scripts. Hashes are interchangeable PHC strings | apps/api (seed, P1-01 auth) |
| D-019 | 2026-10-31 | `Setting` keys are camelCase JSON values: `companyName`, `companyAddress`, `companyTaxId`, `currency`, `timezone`, `autoConfirmInvoices`, `defaultQuotationValidityDays`, `invoiceFooter` (table in ARCHITECTURE §5) | The schema stores key/value pairs and the PRD lists fields without keys; seed and `SettingsService` must agree | P0-06, P0-08, P6-05 |
| D-020 | 2026-10-31 | `pnpm db:seed` compiles `prisma/` with `tsc -p tsconfig.seed.json` into `dist/seed` and runs it with Node; integration tests share `test/support/test-database.ts` (isolated schema per file) | No extra TS runner dependency; tsc supports the decorators later seeds may reuse from services | apps/api |

### D-014 — Exact P0-01 versions

- Runtime/toolchain: Node.js **24.11.0** tested (supported: 24.x >=24.11.0), pnpm **12.16.1**, TypeScript **6.0.3**.
- Root tooling: `@eslint/js` **10.0.1**, `@types/node` **24.19.2**, `eslint` **10.14.0**, `eslint-config-prettier` **10.1.8**, `prettier` **3.9.10**, `typescript-eslint` **8.72.1**.
- API runtime: `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` **12.3.2** each; `reflect-metadata` **0.2.2**; `rxjs` **7.8.2**.
- API tooling: `@nestjs/cli` **12.0.11**, `@nestjs/testing` **12.3.2**, `@types/jest` **30.0.0**, `@types/supertest` **7.2.1**, `jest` **30.5.2**, `supertest` **7.3.1**, `ts-jest` **29.4.15**.
- Web runtime: `react` and `react-dom` **19.3.1** each.
- Web tooling: `@types/react` and `@types/react-dom` **19.3.0** each; `@vitejs/plugin-react` **6.1.2**; `vite` **8.3.5**; `@testing-library/react` **16.3.3**; `@testing-library/dom` **10.4.2**; `jsdom` **29.1.1**.
- Shared/web tests: `vitest` **5.0.5**. Both apps link `@brightloop/shared` using `workspace:*`.

---

## Blockers

| Date | Task | Blocker | Owner | Resolution |
|---|---|---|---|---|---|
| — | — | — | — | — |

## Known issues / tech debt

| Date | Area | Issue | Severity | Planned fix |
|---|---|---|---|---|---|
| — | — | — | — | — |

## Backlog (out of scope ideas — do not build without a decision)

- Automated overdue reminder emails (dunning)
- CSV export for invoices and overdue list (RPT-06 stretch)
- ⌘K command palette
- Online payment link (gateway) on invoices
- Proration for mid-cycle quantity changes
- Credit notes / refunds

## Performance results (fill in during P7-02)

| Endpoint / page | Dataset | p95 before | p95 after | Fix applied |
|---|---|---|---|---|---|
| — | — | — | — | — |



### D-017 — P0-07 frontend setup

Use Tailwind 4 CSS-first theme, Radix primitives with shadcn-compatible configuration, and TanStack Table 9 explicit features. Keep DESIGN branding while the requested Odoo styling choice is pending. Additional class composition helpers support the shadcn Button. Exact frontend versions:

- `@brightloop/shared`: `workspace:*`
- `@hookform/resolvers`: `6.0.2`
- `@radix-ui/react-dialog`: `1.3.1`
- `@radix-ui/react-slot`: `1.5.0`
- `@tanstack/react-query`: `5.105.0`
- `@tanstack/react-table`: `9.3.1`
- `class-variance-authority`: `0.7.1`
- `clsx`: `2.1.1`
- `lucide-react`: `1.65.0`
- `react`: `19.3.1`
- `react-dom`: `19.3.1`
- `react-hook-form`: `7.91.0`
- `react-router-dom`: `7.18.5`
- `sonner`: `2.0.8`
- `tailwind-merge`: `3.7.0`
- `zod`: `4.6.7`
- `@tailwindcss/vite`: `4.3.3`
- `@testing-library/dom`: `10.4.2`
- `@testing-library/react`: `16.3.3`
- `@types/react`: `19.3.0`
- `@types/react-dom`: `19.3.0`
- `@vitejs/plugin-react`: `6.1.2`
- `jsdom`: `29.1.1`
- `tailwindcss`: `4.3.3`
- `vite`: `8.3.5`
- `vitest`: `5.0.5`


## Visual revision — 31 Oct 2026
Dark reference theme implemented. Lint, workspace types, seven web tests and production build pass. Browser visual review and remote playback remain pending. Motion and HLS added as requested. Latest origin/main remains scaffold 78318a2; auth schema/API integration pending. Nothing pushed.

## M3 frontend checkpoint — 31 Oct 2026
Auth/configuration/customer/subscription/invoice/dashboard/portal screens implemented against documented endpoints. Lint, workspace types, 8 web tests and production build pass. Remaining criteria and API integration are tracked individually in M3-CHECKLIST.md; no further tasks marked complete prematurely. P6-05 form is prepared but hard dependencies P0-06/P1-06 still pending.

### 2026-10-31 — M3 integration checkpoint
- M1 infrastructure/schema e43d3b8 merged; overlaps resolved in Vite config, tracker and dependency lockfile.
- Subscription edit, taxes, discount attach/detach, report filters and lazy feature loading added.
- Lint, workspace typecheck, 98 unit/UI tests and production build pass. Live API/database workflows and listed task acceptance gaps remain pending in M3-CHECKLIST.md.
- User authorized pushing M3 branch checkpoints; no merge to main requested.
