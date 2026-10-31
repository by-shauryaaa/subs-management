# M3 task checklist

Status: implemented screens are not marked complete until their full acceptance criteria and backend integration pass.

| Task | Frontend status | Remaining work |
|---|---|---|
| P0-07 Web shell | Complete | Continue visual QA with real data |
| P1-06 Authentication | Forms, session restore, logout and role guards implemented | Shared Zod schemas, field-error mapping and real API verification |
| P1-07 Users/customers | CRUD screens, detail and invite action implemented | Live API verification and audit history |
| P2-01 Taxes | CRUD/archive and staff read-only UI implemented | Shared schema and real uniqueness/authorization checks |
| P2-02 Payment terms | CRUD and non-negative day inputs implemented | Shared schema and API verification |
| P2-05 Plans | CRUD, flags, dates and availability helper/test implemented | Shared schema, seeds and integration |
| P3-07 Subscriptions | List, create, detail, tabs, invoices/history implemented | From-template, shared pricing/machine and live preview |
| P4-05 Invoices/billing runs | Lists, detail, bulk confirm, actions, PDF, payment form and billing runs implemented | API verification, company settings/snapshot rendering |
| P6-05 Settings | Admin form implemented | M2 SettingsService, confirmed key names and integration |
| P6-04 Finance dashboard | KPIs, charts, overdue list, date filters implemented | Confirm report response shapes and default period |
| P6-02 Customer portal | Home, lists/details, profile/password forms implemented | Shared machine, profile contracts, live isolation tests |
| P7-05 UX polish | Themes, responsive layouts, loading/error/empty states and toasts | Full keyboard/mobile/dark QA and custom confirmation dialogs |

## Latest checks
Lint, workspace typecheck, 10 web tests and production build passed. Browser sign-in preview inspected. Current data workflows have not been verified against running backend services. No mock financial records or auth bypass added.

## Team input needed
M2: shared auth/config schemas, pricing engine, state machines, auth/domain services and response contracts. M1: resource endpoint implementations and seed data. Latest main now includes M1 infrastructure/schema commit e43d3b8; integration is in progress.

M1 e43d3b8 integrated. Subscription editing/taxes/discount management and dashboard plan/customer filters added. Lint, workspace typecheck, 10 web + 87 API + 1 shared tests and production build passed. These tests do not verify live financial workflows or database integration. Local environment copied from supplied example; Docker is unavailable here.
