# PHASES — Build order for Brightloop

> Tasks are vertical slices (API + UI + tests) unless a task says otherwise. Each task lists the PRD feature IDs it implements, its owner, its time slot, its dependencies and its acceptance criteria. Track status in `PROGRESS.md`, never here.
>
> **Order rationale:** first the foundation (schema, auth). Then the data subscriptions need (catalog). Then the core object (subscriptions). Then the riskiest logic (billing) while there is still time to fix it. Then the layers on top (discounts, payments). Then the views that need real data (portal, reports). Then hardening.

---

## Team and timeline (hackathon mode)

**Window:** the plan assumes an **8-hour build**. Times are relative to the start (`T+h:mm`). If your window is shorter, keep the same order and owners and shrink every slot by the same ratio. **The order matters more than the minutes.** Every task from the full plan is still in scope. Three people working in parallel, against fixed contracts, is how it fits.

### Members

Replace M1, M2 and M3 with your names in `PROGRESS.md`.

| Member | Role | Owns |
|---|---|---|
| **M1** | Backend lead: data and billing | Repo, infrastructure, Prisma schema (**sole editor of `schema.prisma`**), seeds, products and variants, subscriptions, billing engine, discounts on subscriptions, portal API, performance, README |
| **M2** | Backend: logic, auth and money | Shared package (money, dates, pricing engine, state machines), API core, auth and RBAC, templates, discount rules, invoice actions and PDF, payments, reports API, security review, E2E tests |
| **M3** | Frontend lead: UI and design | Web shell and design system, auth screens, config CRUD (taxes, payment terms, plans), all major screens (subscriptions, invoices, dashboard, portal, settings), UX polish |

### Sync checkpoints (5 minutes, all three)

At every checkpoint, everyone merges to `main`, runs the phase's **exit demo**, and updates `PROGRESS.md`.

| Time | Checkpoint |
|---|---|
| T+0:20 | Scaffold pushed. Everyone pulls and runs `pnpm install`. |
| T+1:30 | Phase 0 exit demo |
| T+2:30 | Phase 1 exit demo |
| T+3:15 | Phase 2 exit demo |
| T+4:30 | Phase 3 exit demo |
| T+5:45 | Phase 4 exit demo |
| T+6:30 | Phase 5 exit demo |
| T+7:15 | Phase 6 exit demo |
| T+7:50 | **Code freeze.** Phase 7 exit demo = full demo dry run |

### Lanes at a glance

| Time | M1 — Data and billing | M2 — Logic, auth and money | M3 — UI and design |
|---|---|---|---|
| 0:00–0:20 | P0-01 Scaffold monorepo | Read docs; prepare shared-package code locally | Read DESIGN; prepare tokens and fonts locally |
| 0:20–0:35 | P0-02 Local infrastructure | P0-05 Shared package basics (0:20–0:50) | P0-07 Web shell (0:20–1:30) |
| 0:35–1:05 | P0-03 Schema and migrations | ↳ then P0-04 API core (0:50–1:10) | ↳ |
| 1:05–1:30 | P0-08 Base seed | P0-06 Domain services (1:10–1:30) | ↳ |
| 1:30–2:00 | P1-05 Customers | P1-01 Signup/login/refresh/logout/me | P1-06 Web auth flows (1:30–2:05) |
| 2:00–2:30 | P1-04 Staff management | P1-02 RBAC (2:00–2:15) → P1-03 Reset and invites (2:15–2:30) | P1-07 Users and customers pages (2:05–2:30) |
| 2:30–2:55 | P2-03 Products | P3-01 Pricing engine (2:30–3:00) | P2-01 Taxes (2:30–2:45) → P2-02 Payment terms (2:45–2:55) |
| 2:55–3:15 | P2-04 Attributes and variants | P3-02 State machines (3:00–3:20) | P2-05 Plans |
| 3:15–3:50 | P3-04 Subscriptions CRUD | P3-03 Quotation templates (3:20–3:50) | P3-07 Subscriptions UI (3:15–4:30) |
| 3:50–4:30 | P3-05 Transitions, renewal, audit | P3-06 From template (3:50–4:05) → P5-01 Discount rules (4:05–4:30) | ↳ |
| 4:30–5:00 | P4-01 Invoice generator | P4-03 Invoice actions (4:30–5:05) | P4-05 Invoices and billing-runs UI (4:30–5:45) |
| 5:00–5:45 | P4-02 Billing run and lifecycle jobs | P4-04 Invoice PDF and send (5:05–5:45) | ↳ |
| 5:45–6:30 | P5-02 Discounts on subscriptions | P5-03 Payments (5:45–6:15) → P6-03 Reports API (6:15–6:45) | P6-05 Settings UI (5:45–6:05) → P6-04 Finance dashboard UI (6:05–6:50) |
| 6:30–7:15 | P6-01 Portal API (6:30–6:55) → P7-01 Large seed (6:55–7:15) | P7-04 Security review (6:45–7:05) | P6-02 Portal UI (6:50–7:30) |
| 7:15–7:50 | P7-02 Performance pass (7:15–7:35) → P7-06 README and demo script (7:35–7:50) | P7-03 E2E tests (7:05–7:40) → buffer | P7-05 UX polish (7:30–7:50) |
| 7:50–8:00 | **All: code freeze, demo rehearsal** | | |

Load: M1 has 17 tasks, M2 has 17, M3 has 12 (M3's tasks are the larger UI screens). Total: 46 tasks.

### Hackathon working agreements (speed without dropping scope)

1. **Contracts first.** `ARCHITECTURE.md` §5 (schema) and §7 (API) are the contract. The frontend builds against the documented endpoints and response shapes before the backend lands, and the backend builds against the documented schema.
2. **Hard vs soft dependencies.**
   - A dependency marked **⚑** is *hard*: it must be merged before you start.
   - Every other dependency is *soft*: start against the contract or seed data, and wire it up when the dependency merges. A soft dependency is never a reason to wait.
3. **Merge small and often.** Branch per task as `m1/P4-01-invoice-generator`. Merge to `main` when the task is done and at every checkpoint, so no branch lives longer than about 45 minutes. Rebase before merging, and keep `main` runnable at all times.
4. **Schema owner.** Only M1 edits `schema.prisma`. Others send M1 the change, M1 adds a new migration and posts "schema updated: pull + `pnpm db:migrate`".
5. **Shared package owner.** M2 owns `packages/shared` schemas and enums. Anyone may add a Zod schema for their own module, but must tell M2.
6. **Overrun protocol.** If a task runs 15 minutes past its slot, say so immediately. The first member who finishes early pairs on it. **Critical-path tasks get help first:** P0-03, P1-01, P3-04, P3-05, P4-01, P4-02, P5-03.
7. **Tests:** every test named in an acceptance criterion below is required. The task's tests are written inside the task's own slot, not saved for the end.
8. **Seed as you go.** Each task that needs demo data adds it to `seed.ts` in the same slot, so the demo works at every checkpoint.
9. **Demo priority if time is lost.** Nothing is dropped, but if the clock slips, finish tasks in this order so the demo story stays intact:
   1. The billing path: P3-04 → P3-05 → P4-01 → P4-02 → P4-05
   2. Money in: P5-03, then P6-03 → P6-04
   3. Portal: P6-01 → P6-02
   4. Everything else

---

## Phase 0 — Foundation · T+0:00 → T+1:30

**Goal:** a running monorepo with the full database schema, API core, shared package and web shell.
**Exit demo:** `pnpm dev` serves a styled login page, `GET /api/v1/health` returns OK, and the database is migrated and seeded.

| ID | Task | Owner | Slot | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| P0-01 | Scaffold monorepo | M1 | 0:00–0:20 | — | pnpm workspace with `apps/api` (NestJS), `apps/web` (Vite React TS), `packages/shared`; `tsconfig.base.json` strict; ESLint + Prettier; root scripts `dev`, `build`, `lint`, `typecheck`, `test`; exact versions recorded in the PROGRESS Decisions log |
| P0-02 | Local infrastructure | M1 | 0:20–0:35 | ⚑P0-01 | `docker-compose.yml` (postgres:16, mailpit), `.env.example` exactly as in ARCHITECTURE §10, API env validation with Zod (fails fast) |
| P0-03 | Database schema and migrations | M1 | 0:35–1:05 | ⚑P0-02 | `schema.prisma` matches ARCHITECTURE §5; initial migration plus a raw-SQL migration for the partial unique index on `Invoice(subscriptionId, periodStart)`; `pnpm db:migrate` works from empty |
| P0-04 | API core | M2 | 0:50–1:10 | P0-03 | `PrismaService`; global `/api/v1` prefix; helmet; CORS; cookie-parser; `ZodValidationPipe`; `HttpExceptionFilter` producing the error envelope; `DomainError`; pagination helper; `/health`; global `JwtAuthGuard` + `@Public()` placeholder |
| P0-05 | Shared package basics | M2 | 0:20–0:50 | ⚑P0-01 | `enums.ts` (mirrors Prisma), `constants.ts` (password regex: ≥ 9 chars, upper, lower, special), `money.ts`, `dates.ts` (`todayInTz`, `addPeriods`, `periodStart` anchored on start date), `schemas/common.ts`; Vitest tests for money rounding and period math, including the 31st-of-month and leap-year cases |
| P0-06 | Domain services | M2 | 1:10–1:30 | ⚑P0-04 | `NumberingService` (transactional, `PREFIX/YYYY/NNNNN`), `AuditService`, `SettingsService` (typed defaults from PRD ADM-01, cached), `MailService` (nodemailer → Mailpit, simple HTML templates). Unit test: numbering is gap-free and unique under 20 parallel calls. |
| P0-07 | Web shell | M3 | 0:20–1:30 | ⚑P0-01 | Tailwind + shadcn initialized with the `DESIGN.md` tokens (light/dark); fonts loaded; React Router with AuthLayout, AppLayout (sidebar per DESIGN) and PortalLayout; `api-client.ts` with the error envelope parsed; TanStack Query provider; `Money`, `StatusBadge`, `EmptyState`, `PageHeader`, `DataTable` (server pagination, URL-synced) components |
| P0-08 | Base seed | M1 | 1:05–1:30 | ⚑P0-03, P0-06 | `seed.ts` creates the admin from env, the default settings, taxes (GST 5/12/18), payment terms (Immediate/Net 15/Net 30), Brand attribute (Odoo +560, Generic +0). The remaining demo data is added by later tasks' seed updates. Idempotent (safe to re-run). |

## Phase 1 — Authentication and users · T+1:30 → T+2:30

**Goal:** everyone can sign in with the correct role, and access is enforced on the server.
**Exit demo:** sign up as a customer → land on the portal; log in as admin → create a staff user → the invite email appears in Mailpit → staff sets a password → logs in to `/app`.

| ID | Task | PRD | Owner | Slot | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|
| P1-01 | Signup, login, refresh, logout, me | AUTH-01, 02, 04 | M2 | 1:30–2:00 | ⚑P0-04..06 | argon2id; access JWT 15 min in body; rotating refresh cookie; throttled login; generic errors; email lower-cased and unique (409) |
| P1-02 | RBAC and ownership | §5.1 | M2 | 2:00–2:15 | ⚑P1-01 | `@Roles()` + `RolesGuard`; `@CurrentUser()`; `customerScope()` helper for portal queries; e2e test of a matrix of roles × sample endpoints |
| P1-03 | Forgot/reset password and invites | AUTH-03, 05 | M2 | 2:15–2:30 | ⚑P1-01 | Hashed single-use tokens (reset 30 min, invite 72 h); forgot always returns 200; reset revokes refresh tokens; accept-invite sets the password |
| P1-04 | Staff management | AUTH-05, 07, ADM-02 | M1 | 2:00–2:30 | P1-02, P1-03 | Admin-only `/users` CRUD; deactivate revokes sessions; staff calling it gets 403 |
| P1-05 | Customers | AUTH-06 | M1 | 1:30–2:00 | P1-02, P1-03 | Admin/Staff create (with invite), list (search, paginated), detail, edit; seed adds about 8 customers and 2 staff |
| P1-06 | Web auth flows | AUTH-01..04 | M3 | 1:30–2:05 | ⚑P0-07, P1-01, P1-03 | Login, signup (live password checklist), forgot, reset and accept-invite pages per DESIGN; session restore on reload; role-based redirect; `RequireRole` guards; logout |
| P1-07 | Web users and customers pages | AUTH-05..07 | M3 | 2:05–2:30 | P1-04, P1-05, P1-06 | Users page (admin), customers list and detail/edit, invite resend |

## Phase 2 — Catalog and configuration · T+2:30 → T+3:15

**Goal:** the admin can launch a product with variants and a plan.
**Exit demo:** create a product priced 1,000 with an Odoo variant shown as 1,560; create a Monthly plan with pausable and closable on and auto-close off.

| ID | Task | PRD | Owner | Slot | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|
| P2-01 | Taxes | TAX-01 | M3 | 2:30–2:45 | P1-02, ⚑P0-07 | Admin CRUD; staff read-only; name unique; rate 0–100 with 2 decimal places; archive instead of delete |
| P2-02 | Payment terms | — | M3 | 2:45–2:55 | P1-02, ⚑P0-07 | Admin CRUD; `dueDays ≥ 0` |
| P2-03 | Products | CAT-01, 04 | M1 | 2:30–2:55 | P2-01 | CRUD with default taxes; default variant auto-created in the same transaction; archive when in use (`IN_USE_ARCHIVE_INSTEAD`); list with search and type filter |
| P2-04 | Attributes and variants | CAT-02, 03 | M1 | 2:55–3:15 | ⚑P2-03 | Attributes and values CRUD; product detail **Variants** tab: add a variant by picking values, price extra pre-filled with the sum and editable; variant picker endpoint `GET /variants?q=` returns the final price; seed adds 4–5 products with variants |
| P2-05 | Plans | PLAN-01..03 | M3 | 2:55–3:15 | P1-02, ⚑P0-07 | CRUD with billing period, minimum quantity, availability dates and 4 flags (shown as switches with help text); `isAvailable()` helper with tests; seed adds 4 plans |

## Phase 3 — Quotations and subscriptions · T+2:30 → T+4:30

**Goal:** a sales rep can go from a template to a confirmed subscription, and everyone can see where it stands.
**Exit demo:** new subscription from a template → send → accept → shows CONFIRMED in the status bar, with the history timeline.

| ID | Task | PRD | Owner | Slot | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|
| P3-01 | Pricing engine (shared) | TAX-03, DISC-03, 04 | M2 | 2:30–3:00 | ⚑P0-05 | `priceDocument()` exactly per ARCHITECTURE §6.6; **all** listed unit tests pass; no I/O |
| P3-02 | Subscription state machine (shared) | SUB-03 | M2 | 3:00–3:20 | ⚑P0-05 | Transition table as data; `canTransition(status, action, role, planFlags, context)` returns `{ ok, code? }`; exhaustive tests for every row of the PRD table plus forbidden combinations. Invoice machine for INV-04 as well. |
| P3-03 | Quotation templates | QT-01 | M2 | 3:20–3:50 | P2-04, P2-05 | CRUD with lines editor; validity days ≥ 1; Admin and Staff |
| P3-04 | Subscriptions CRUD | SUB-01, 02, 04, PLAN-04, 05 | M1 | 3:15–3:50 | ⚑P3-01, ⚑P2-04, P2-05, P1-05 | Create/edit with lines; numbering; plan-fee line auto-synced when the plan changes; minimum-quantity validation; editing rules by status; `GET /:id/preview` returns pricing; list with status counts, search and filters |
| P3-05 | Transitions, renewal, audit | SUB-03, 06, 07, QT-03 | M1 | 3:50–4:30 | ⚑P3-02, ⚑P3-04 | `TransitionsService.apply` with row lock + machine + side effects + audit; all action endpoints; send emails a quotation; renewal per SUB-06 (only once); `GET /:id/history` |
| P3-06 | From template | QT-02 | M2 | 3:50–4:05 | ⚑P3-03, ⚑P3-04 | `POST /subscriptions/from-template` copies everything into a DRAFT |
| P3-07 | Subscriptions UI | SUB-05 | M3 | 3:15–4:30 | P3-04..06, ⚑P0-07 | List with status chips and counts; form with lines editor and live totals (shared engine); detail with StatusBar, only the allowed action buttons, invoices tab (filled in Phase 4), discounts panel (filled in Phase 5) and history timeline |

## Phase 4 — Billing engine and invoices · T+4:30 → T+5:45

**Goal:** billing day needs no typing. Nothing is billed twice or skipped.
**Exit demo:** activate a subscription → its first invoice appears; click **Run billing now** twice → no duplicates; open the invoice PDF; send it and see the email in Mailpit.

| ID | Task | PRD | Owner | Slot | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|
| P4-01 | Invoice generator | INV-01..03, TAX-02, 03 | M1 | 4:30–5:00 | ⚑P3-05 | `createForPeriod(tx, sub, n)` per ARCHITECTURE §6.5: snapshot lines and customer, numbering, auto-confirm setting, audit; unique conflict treated as already billed. **Integration tests:** same period twice → 1 invoice; cancelled invoice → regenerate allowed. |
| P4-02 | Billing run and lifecycle jobs | INV-01, SUB-03, 07, ADM-03 | M1 | 5:00–5:45 | ⚑P4-01 | `runBilling()` with advisory lock; activation of due subscriptions (+ first invoice); catch-up of missed periods; respects expiry; skips PAUSED; closes expired (autoClose or renewed); per-subscription error isolation; `BillingRun` record; cron `30 0 * * *` in the business time zone; `POST /billing/run`. **Tests:** run twice gives the same invoices; 3 missed months gives 3 invoices; pause/resume skips paused periods. |
| P4-03 | Invoice actions | INV-04, 05, 06 | M2 | 4:30–5:05 | P4-01, ⚑P3-02 | Confirm, bulk confirm, cancel (reason; blocked with payments), regenerate; derived `isOverdue`; list filters `view=paid\|outstanding\|overdue`, status, customer, date range |
| P4-04 | Invoice PDF and send | INV-05 | M2 | 5:05–5:45 | P4-03 | `pdfkit` PDF with company settings, customer snapshot, lines, discounts, taxes, totals and payment status; `GET /:id/pdf`; send emails it as an attachment and sets `sentAt` |
| P4-05 | Invoices and billing-runs UI | INV-04..06, ADM-03 | M3 | 4:30–5:45 | P4-02..04 | Invoice list with quick views (All/Paid/Outstanding/Overdue) and bulk confirm; invoice detail (document-style layout per DESIGN, action bar, payments section); subscription Invoices tab; Admin Billing runs page with a **Run billing now** button |

## Phase 5 — Discounts and payments · T+4:05 → T+6:30

**Goal:** better prices apply themselves, and money is matched to invoices.
**Exit demo:** attach a 10% discount with usage limit 1 → the next invoice shows it and the one after does not; record a partial and then a full payment → the invoice becomes PAID.

| ID | Task | PRD | Owner | Slot | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|
| P5-01 | Discount rules | DISC-01 | M2 | 4:05–4:30 | ⚑P2-03 | Admin CRUD with scope + product picker, thresholds, dates, usage limit; staff read-only; `usageCount` read-only; seed adds 2 discounts |
| P5-02 | Discounts on subscriptions | DISC-02..06 | M1 | 5:45–6:30 | ⚑P5-01, ⚑P4-01 | Attach/detach endpoints (Admin, Staff); generator locks discount rows, applies the engine, writes `DiscountUsage`, increments the count; cancelling an invoice releases its usage; subscription discounts panel with Active/Expired/Used up chips. **Concurrency test:** limit 1 with 2 parallel generations → exactly one use. |
| P5-03 | Payments | PAY-01..04 | M2 | 5:45–6:15 | ⚑P4-03 | Record payment (row lock; ≤ amount due; date ≤ today), partial payments, auto PAID; Admin delete with reason + audit; payments list with filters; **Record payment** dialog on invoice detail and on overdue rows |

## Phase 6 — Customer portal, reports, settings · T+5:45 → T+7:30

**Goal:** customers self-serve, and the finance lead gets one screen.
**Exit demo:** a customer accepts a quotation and downloads an invoice; a customer cannot open another customer's invoice (404); the finance dashboard shows the KPIs, charts and overdue list with filters.

| ID | Task | PRD | Owner | Slot | Depends on | Acceptance criteria |
|---|---|---|---|---|---|---|
| P6-01 | Portal API | PORTAL-01..05 | M1 | 6:30–6:55 | ⚑P3-05, P4-04, P5-03 | `/portal/*` endpoints that reuse services, always scoped by the JWT's `customerId`; actions limited by the machine and plan flags. **Isolation e2e test:** foreign IDs return 404. |
| P6-02 | Portal UI | PORTAL-01..05 | M3 | 6:50–7:30 | P6-01, ⚑P0-07 | Portal home, subscription detail with allowed actions, invoices with PDF download, profile and change password; PortalLayout per DESIGN; mobile-first |
| P6-03 | Reports API | RPT-01..05 | M2 | 6:15–6:45 | P5-03 | `summary`, `revenue-series`, `subscriptions-by-status`, `overdue` via aggregate SQL; filters for date range, plan and customer; tested against known seed numbers |
| P6-04 | Finance dashboard UI | RPT-01..04 | M3 | 6:05–6:50 | P6-03 | KPI cards, revenue chart, status chart, overdue table with **Record payment**; filters in the URL; skeleton loading |
| P6-05 | Settings UI | ADM-01 | M3 | 5:45–6:05 | ⚑P0-06, ⚑P1-06 | Admin settings form (company, currency, time zone, auto-confirm, quotation validity, footer); values used by the PDF and billing |

## Phase 7 — Hardening and demo readiness · T+6:45 → T+8:00

**Goal:** fast, safe and polished.
**Exit demo:** the full scripted walkthrough (see P7-06) runs end to end on the large dataset in under 2 s per page.

| ID | Task | Owner | Slot | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| P7-01 | Large seed | M1 | 6:55–7:15 | P5-03 | `seed-large.ts`: 10k subscriptions, about 50k invoices, about 40k payments with realistic status mix and dates over 18 months; runs in < 3 minutes (batched `createMany`) |
| P7-02 | Performance pass | M1 | 7:15–7:35 | ⚑P7-01, P6-04 | `EXPLAIN ANALYZE` the top 8 endpoints; add missing indexes (including `pg_trgm` for search if needed); every page < 2 s and list APIs p95 < 500 ms; results logged in PROGRESS |
| P7-03 | E2E tests | M2 | 7:05–7:40 | P6-02, P6-04 | Playwright: signup→portal; staff quote→confirm→activate→invoice→payment→PAID; overdue appears on dashboard; customer isolation |
| P7-04 | Security review | M2 | 6:45–7:05 | P6-* | Checklist: every route has roles; throttling; no secrets in logs; cookie flags; CORS; Zod on all inputs; portal scoping; dependency audit (`pnpm audit`) |
| P7-05 | UX polish | M3 | 7:30–7:50 | P6-* | Empty, loading and error states everywhere; toasts; confirm dialogs for destructive actions; keyboard and focus check; 360px check; dark mode check |
| P7-06 | README and demo script | M1 | 7:35–7:50 | P7-03 | README: setup, scripts, seed logins, architecture summary. `DEMO.md`: a 7-minute walkthrough following the brief's "month at Brightloop" scenes. |

---

## Hand-offs between members

These are the moments one member's work unblocks another's. Announce each one in the team chat the moment it merges.

| When | From → To | What lands | Unblocks |
|---|---|---|---|
| T+0:20 | M1 → all | Scaffold (P0-01) | P0-05, P0-07 |
| T+1:05 | M1 → M2 | Schema migrated (P0-03) | P0-04 integration with Prisma, P0-06 |
| T+1:30 | M2 → M1, M3 | API core and domain services (P0-04, P0-06) | All API modules, P1-* |
| T+2:00 | M2 → M3 | Auth endpoints (P1-01) | P1-06 wired to the real API |
| T+2:15 | M2 → M1 | `@Roles()` and guards (P1-02) | Roles on P1-04, P1-05 and every later controller |
| T+3:00 | M2 → M1 | Pricing engine (P3-01) | P3-04 preview, later P4-01 |
| T+3:15 | M1 → M2, M3 | Variants picker (P2-04) | P3-03, P3-04, lines editor in P3-07 |
| T+3:20 | M2 → M1, M3 | State machines (P3-02) | P3-05 and action buttons in P3-07 |
| T+3:50 | M1 → M2 | Subscriptions CRUD (P3-04) | P3-06 |
| T+5:00 | M1 → M2, M3 | Invoice generator (P4-01) | P4-03 integration, P4-05 data |
| T+5:05 | M2 → M3 | Invoice actions (P4-03) | P4-05 actions, P5-03 |
| T+6:15 | M2 → M1, M3 | Payments (P5-03) | P6-01, P6-04 Record payment, P7-01 |
| T+6:45 | M2 → M3 | Reports API (P6-03) | P6-04 wired to real data |
| T+6:55 | M1 → M3 | Portal API (P6-01) | P6-02 wired to real data |
