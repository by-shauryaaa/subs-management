# RULES — How to build Brightloop

> Binding rules for every team member writing code in this repository. When a rule conflicts with convenience, the rule wins. When a rule conflicts with `PRD.md`, raise it in the `PROGRESS.md` Blockers section instead of guessing.

---

## 1. Team workflow (do this every time)

1. **Read before coding:** `PRD.md` → `ARCHITECTURE.md` → `RULES.md` → `DESIGN.md` (for UI work) → `PROGRESS.md`.
2. **Take the next task in your own lane** (M1, M2 or M3) in `PHASES.md`. Its hard dependencies (marked ⚑) must be ✅ in `PROGRESS.md`; soft ones may still be in progress (build against the `ARCHITECTURE.md` contract). Mark it 🟡 In progress, with your name and the time, **before** starting.
3. **Stay in scope.** Build only what the task and its PRD feature IDs describe. Write ideas down as Backlog in `PROGRESS.md` and do not implement them.
4. **Ambiguity:** follow the PRD. If the PRD is silent, choose the simplest option that is consistent with the existing code, implement it, and add a `D-xxx` entry in the `PROGRESS.md` Decisions log.
5. **Contract changes:** if you change the Prisma schema, an endpoint, a shared schema or the folder layout, update `ARCHITECTURE.md` in the same change.
6. **Finish:** run `pnpm lint && pnpm typecheck && pnpm test`. Every check must pass before you mark the task ✅ and add a log entry (see the format in `PROGRESS.md`).
7. **Never** mark a task done with failing checks, TODO stubs on the critical path, or mocked data in the UI.

### Hackathon mode

The time box changes **how** we work, not **what** we build. Nothing in `PRD.md` is cut.

- **Stay in your lane** and on your slot in `PHASES.md`. If you finish early, help on the critical path first: P0-03, P1-01, P3-04, P3-05, P4-01, P4-02, P5-03.
- **Never wait on a soft dependency.** Build against the documented schema and endpoints, and use seed data until the real piece merges.
- **Single owners:** only M1 edits `schema.prisma`; M2 owns `packages/shared` (others may add a schema for their own module and tell M2).
- **Merge small and often.** Merge to `main` when a task is done and at every checkpoint. `main` must always run.
- **Say it early.** If you are 15 minutes over a slot, tell the team right away (see the overrun protocol in `PHASES.md`).
- **Write the tests named in the task inside the task's slot.** Do not leave them for the end.

## 2. USE

### Language and structure
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true` everywhere.
- **pnpm** workspaces. Import the shared package as `@brightloop/shared`.
- **Zod schemas from `packages/shared/src/schemas`** for every request body and query, on both the API (via `ZodValidationPipe`) and the web (via `zodResolver`). Define each schema once.
- **Enums from `packages/shared/src/enums.ts`**. They must mirror the Prisma enums exactly.
- NestJS layering: **Controller** (HTTP, validation, roles) → **Service** (business logic, transactions) → **Prisma**. Controllers contain no logic beyond calling a service.

### Data and money
- **Prisma** for all database access.
- **`decimal.js`** (through `packages/shared/src/money.ts`) for every money calculation. Round `ROUND_HALF_UP` to 2 decimal places.
- Money in JSON is a **string** (`"1560.00"`). Business dates are `"YYYY-MM-DD"`. Timestamps are ISO in UTC.
- **`prisma.$transaction`** for any operation that writes more than one row or reads-then-writes financial state.
- **Row locks** (`SELECT ... FOR UPDATE`) when changing invoice payment state, discount usage, subscription status or billing cursors.
- **Business dates** come from `todayInTz(settings.timezone)` in `packages/shared/src/dates.ts`. Never use `new Date()` for business dates.
- Billing periods come from `periodStart(startDate, period, n)`, which always anchors on `startDate`.
- Document numbers come from `NumberingService`.

### State and business rules
- Subscription and invoice status changes go **only** through `TransitionsService` and the invoice actions service, which consult the shared state machines.
- Prices, taxes, discounts and totals are **always recomputed on the server** with the shared pricing engine.
- Write an `AuditLog` entry for every transition, invoice action, payment and discount change.

### Security
- `argon2id` for passwords. Store only SHA-256 hashes of refresh, reset and invite tokens.
- Access token **in memory** on the client; refresh token in an **httpOnly cookie**.
- `@Roles()` on every non-public controller method, per the PRD §5.1 matrix.
- Portal endpoints always scope by the `customerId` from the JWT, never from the request.
- Parameterized SQL only: Prisma, or `$queryRaw` with tagged templates.
- Use `helmet`, CORS restricted to `WEB_URL`, and `@nestjs/throttler` on auth routes.

### Frontend
- TanStack Query for all server data. Use React state only for UI state.
- shadcn/ui components themed through the CSS variables in `DESIGN.md`.
- `<Money>`, `formatDate()`, `<StatusBadge>` and `<StatusBar>` for every monetary amount, date and status.
- Filters, sort and pagination are stored in **URL search parameters**.
- Every data view has loading (skeleton), empty and error states.
- Show only the actions the shared state machine allows for this role, status and plan.

### Performance
- Paginate every list (default 25, max 100). Use `select` for only the columns needed.
- Compute reports with aggregate SQL. Add an index for every new filter or sort column.

### Quality
- **Required tests:** the pricing engine, period math, the state machines, billing idempotency (running twice creates no duplicates), discount usage limits, the RBAC matrix, and portal isolation.
- Nest `Logger` with context. Structured messages, never secrets.
- Conventional Commits that reference the task: `feat(P4-01): invoice generator with idempotent periods`.

## 3. AVOID

| ❌ Don't | ✅ Instead |
|---|---|
| JavaScript `number` / floats for money | `Decimal` in code, `NUMERIC(12,2)` in the database, strings in JSON |
| Firebase, Supabase, Appwrite, or any other backend-as-a-service or hosted auth | Our own NestJS API, PostgreSQL and JWT auth |
| Another ORM or query builder (TypeORM, Sequelize, Knex, Drizzle) | Prisma |
| `$queryRawUnsafe` or string-concatenated SQL | `$queryRaw` tagged templates |
| Raw SQL for normal CRUD | Prisma. Raw SQL only for row locks, advisory locks, the partial index migration and report aggregates. |
| `prisma.subscription.update({ data: { status } })` from anywhere | `TransitionsService.apply(...)` |
| Business logic in controllers or React components | Services (API), shared pure functions (pricing, state, dates) |
| Trusting totals, prices or `customerId` sent by the client | Recompute on the server; take identity from the JWT |
| Hard-deleting invoices, subscriptions or customers | Cancel, close or archive. Only Admin may delete a payment, and it is audited. |
| Hardcoded or mock data in UI screens | Real API calls (seed the database instead) |
| Loading whole tables into memory or filtering lists in JS | Server-side pagination, filters and aggregates |
| N+1 queries in loops | `include`/`select` or one batched `findMany({ where: { id: { in } } })` |
| `any`, `@ts-ignore`, disabling ESLint rules | Proper types; `unknown` plus narrowing |
| `console.log` in committed code | Nest `Logger` (API); remove from web |
| Tokens in `localStorage` or `sessionStorage` | In-memory access token, httpOnly refresh cookie |
| Hex colors, pixel font sizes or arbitrary Tailwind values in components | `DESIGN.md` tokens and Tailwind theme classes |
| Adding a dependency not listed in `ARCHITECTURE.md §2` | Use what is there. If truly needed, add a Decisions log entry explaining why. |
| Changing `schema.prisma` without a migration | `prisma migrate dev --name <change>` and commit the migration |
| Editing an applied migration | Create a new migration |
| `new Date()` for billing, due or expiry math | `todayInTz()` and the shared date helpers |
| Adding periods to the previous period (date drift) | `periodStart(startDate, period, n)` |
| Revealing whether an email exists (login, forgot password) | Generic messages |
| Returning 403 for a customer accessing another customer's record | 404 |
| Committing `.env` or secrets | `.env.example` only |
| Giant files (> ~300 lines) | Split by responsibility |

## 4. Conventions

| Thing | Convention | Example |
|---|---|---|
| Files and folders | kebab-case | `invoice-generator.service.ts` |
| Classes, types, React components | PascalCase | `InvoiceGeneratorService`, `StatusBadge` |
| Variables and functions | camelCase | `nextBillingDate` |
| Prisma models | PascalCase singular | `SubscriptionLine` |
| Database columns | camelCase (Prisma default) | `"amountPaid"` |
| API paths | `/api/v1/` + kebab-case plural nouns; verbs for actions | `/quotation-templates`, `/subscriptions/:id/confirm` |
| Error codes | UPPER_SNAKE | `INVALID_TRANSITION`, `EMAIL_TAKEN`, `PAYMENT_EXCEEDS_DUE` |
| Query keys (web) | `[resource, params]` | `['invoices', { view: 'overdue', page: 1 }]` |
| Document numbers | `PREFIX/YYYY/NNNNN` | `SUB/2026/00042`, `INV/2026/01337` |
| Branches | `<member>/<task-id>-short-name`, merged to `main` within ~45 min | `m1/P4-01-invoice-generator` |
| Commits | Conventional + task ID | `fix(P5-03): reject overpayment` |

### Standard error codes
`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `ACCOUNT_DISABLED`, `TOKEN_INVALID_OR_EXPIRED`, `INVALID_TRANSITION`, `QUOTATION_EXPIRED`, `PLAN_UNAVAILABLE`, `BELOW_MIN_QUANTITY`, `PLAN_NOT_PAUSABLE`, `PLAN_NOT_CLOSABLE`, `PLAN_NOT_RENEWABLE`, `ALREADY_RENEWED`, `INVOICE_HAS_PAYMENTS`, `PAYMENT_EXCEEDS_DUE`, `INVOICE_NOT_PAYABLE`, `DISCOUNT_NOT_APPLICABLE`, `IN_USE_ARCHIVE_INSTEAD`, `BILLING_ALREADY_RUNNING`, `RATE_LIMITED`, `NAME_TAKEN`, `VARIANT_EXISTS`.

## 5. Definition of Done (per task)

- [ ] The acceptance criteria in `PHASES.md` and the referenced PRD IDs are met.
- [ ] The API is validated with shared Zod schemas, guarded with the correct roles, and has audit entries where required.
- [ ] The UI uses design tokens, has loading, empty and error states, and works at 360px and 1440px.
- [ ] Required tests are added and passing; `pnpm lint`, `pnpm typecheck` and `pnpm test` are green.
- [ ] Seed data is updated if the feature needs demo data.
- [ ] `ARCHITECTURE.md` is updated if any contract changed.
- [ ] `PROGRESS.md` has the task marked ✅ and a log entry added.

## 6. Demo-safety rules

- `pnpm db:seed` must always produce a working demo:
  - 1 admin, 2 staff, about 8 customers
  - taxes: GST 5%, 12% and 18%
  - payment terms: Immediate, Net 15, Net 30
  - products with a Brand attribute (Odoo +560, Generic +0)
  - plans: Monthly Starter, Monthly Pro, Yearly Business, Weekly Trial
  - 2 quotation templates and 2 discounts
  - subscriptions in every status, invoices in every status, some overdue
- Seed credentials are printed to the console after seeding and listed in the README.
- Never let a feature depend on real email delivery. Mailpit captures everything locally.
