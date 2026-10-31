# PRD — Brightloop Subscription Management System

> **Source of truth for WHAT to build.**
> Read with: `ARCHITECTURE.md` (how), `RULES.md` (constraints), `PHASES.md` (order), `DESIGN.md` (look & feel), `PROGRESS.md` (status).
> If code and this document disagree, this document wins. If this document is ambiguous, pick the simplest reading, implement it, and record it in the Decisions log in `PROGRESS.md`.

Version 1.0 · 31 Oct 2026

---

## 1. Summary

One web platform that runs the full life of a subscription business: set up products, variants, plans, taxes and discounts; turn quotations into subscriptions; generate invoices automatically on billing day; record payments; and report recurring revenue. It has three audiences: an **Admin**, **Internal staff**, and **Customers** (through a self-service portal).

The fictional company is **Brightloop Software**, which sells business software billed monthly or yearly, add-ons customers switch on and off, and products with variants (e.g. a "Brand" attribute where *Odoo* adds 560 to the price).

## 2. Problem

| Today | Target |
|---|---|
| Subscriptions tracked in a spreadsheet | Subscriptions are records with a lifecycle visible to everyone |
| Renewals remembered by whoever notices | Expiry, renewal and auto-close handled by rules and scheduled jobs |
| Invoices typed by hand | Invoices generated automatically from subscriptions on billing day |
| Payments matched by scrolling bank statements | Payments recorded against invoices, and paid/outstanding/overdue status is visible instantly |
| Revenue reports built manually each quarter | Live finance dashboard with filters |

## 3. Goals and success metrics

1. **No invoice billed twice or skipped.** This is enforced by the database, not by convention.
2. **Zero manual invoice typing.** Every recurring invoice is generated from its subscription.
3. **The finance lead's four questions** (active subscriptions, revenue in, money owed, overdue invoices) are answered on one screen.
4. **Every page responds in under 2 seconds** with 10,000 subscriptions, 50,000 invoices and 40,000 payments seeded.
5. **Customers self-serve**: they can view and manage subscriptions and invoices without emailing anyone.

## 4. Non-goals (v1)

- Online payment gateway integration. Payments are recorded by staff and the method is a field.
- Multi-currency and multi-company. There is a single currency, configurable in settings, defaulting to INR.
- Proration. Mid-cycle changes take effect from the next invoice.
- Usage-based or metered billing.
- Credit notes and refunds. Invoices are cancelled instead.
- Automated dunning emails. Only the overdue list is in scope; reminders are a stretch goal.
- Native mobile apps. The web app is responsive down to 360px.

## 5. Users and roles

| Role | Who | Summary of access |
|---|---|---|
| **ADMIN** | Owner or operations head | Everything. Only role that can create staff, taxes, discounts and settings. |
| **STAFF** | Internal sales, support and finance team | Day-to-day work: customers, quotations, subscriptions, invoices, payments, reports. Cannot manage staff, taxes, discount rules or settings. |
| **CUSTOMER** | Brightloop's customers | Portal only: their own subscriptions, invoices and profile. |

### 5.1 Permission matrix

| Capability | ADMIN | STAFF | CUSTOMER |
|---|---|---|---|
| Create staff users / deactivate users | ✅ | ❌ | ❌ |
| Manage settings | ✅ | ❌ | ❌ |
| Manage taxes | ✅ | read | ❌ |
| Manage discount rules | ✅ | read | ❌ |
| Attach or remove a discount on a subscription | ✅ | ✅ | ❌ |
| Manage products, variants, attributes | ✅ | read | ❌ |
| Manage plans | ✅ | read | ❌ |
| Manage payment terms | ✅ | read | ❌ |
| Manage quotation templates | ✅ | ✅ | ❌ |
| Create and invite customers | ✅ | ✅ | ❌ |
| Create and edit subscriptions, run transitions | ✅ | ✅ | own: accept/decline quotation, pause/resume/close/renew if plan allows |
| Invoices: view, confirm, cancel, send, print, regenerate | ✅ | ✅ | own: view and download |
| Record payments | ✅ | ✅ | ❌ |
| Delete a payment | ✅ | ❌ | ❌ |
| Run billing now / view billing runs | ✅ | view | ❌ |
| Reports dashboard | ✅ | ✅ | ❌ |
| Audit history on records | ✅ | ✅ | ❌ |

The server enforces this matrix on every endpoint. Hiding UI elements is not access control.

---

## 6. Features and acceptance criteria

Each feature has an ID. Tasks in `PHASES.md` reference these IDs.

### 6.1 Authentication and accounts (AUTH)

**AUTH-01 Sign up (customer self-service)**
- Fields: full name, email, password, confirm password. Creates a `User` with role `CUSTOMER` and a linked `Customer`.
- Email is trimmed, lower-cased and unique. A duplicate returns `409 EMAIL_TAKEN` with the message "An account with this email already exists."
- **Password rule:** at least 9 characters ("more than eight"), at least one uppercase letter, one lowercase letter, and one special character (any non-alphanumeric). The same Zod schema is used on the client and the server, and on every password set or reset.
- On success the user is logged in and lands on `/portal`.

**AUTH-02 Login**
- Email and password. Any failure returns the generic message "Invalid email or password." Deactivated users get `403 ACCOUNT_DISABLED`.
- Rate limit: 5 attempts per minute per IP+email.
- Redirect after login: CUSTOMER goes to `/portal`; ADMIN and STAFF go to `/app/dashboard`.

**AUTH-03 Forgot and reset password**
- "Forgot password" always returns 200, whether or not the email exists.
- Emails a link `${WEB_URL}/reset-password?token=...`. The token is valid for 30 minutes, is single-use, and is stored only as a SHA-256 hash.
- A successful reset revokes all of the user's refresh tokens.

**AUTH-04 Logout** revokes the current refresh token and clears the cookie.

**AUTH-05 Staff creation (Admin only)**
- Admin enters name and email. This creates a `STAFF` user with no password and emails an invite link (same token mechanism as AUTH-03, type `INVITE`, valid for 72 hours) to set the password.

**AUTH-06 Customer creation by Admin or Staff**
- Fields: name, email, company name, phone, billing address, tax ID. Creates a `CUSTOMER` user with an invite email for portal access.

**AUTH-07 Deactivate user (Admin)**
- A deactivated user cannot log in and their refresh tokens are revoked. Their records remain.

### 6.2 Products and variants (CAT)

**CAT-01 Product** has these fields:
- name (required)
- type: `SERVICE` or `GOODS`
- sales price (≥ 0)
- cost price (≥ 0)
- notes
- default taxes (many)
- active flag

**CAT-02 Attributes and values**: for example, attribute *Brand* with values *Odoo* (price extra 560) and *Generic* (price extra 0). Price extra must be ≥ 0.

**CAT-03 Variants**
- Every product automatically gets one **default variant** (name "Default", price extra 0).
- Admin can add variants by picking attribute values. The variant's price extra is pre-filled with the sum of the selected values' price extras and can be edited.
- **Variant price = product sales price + variant price extra.** Example: a product priced 1,000 with variant Brand=Odoo costs 1,560.

**CAT-04** Products and variants referenced by any subscription, template or invoice cannot be deleted, only archived (`isActive=false`). Archived items do not appear in pickers.

### 6.3 Plans (PLAN)

**PLAN-01 Fields**
- name
- price: the plan's base recurring fee per billing period, ≥ 0
- billing period: `DAILY`, `WEEKLY`, `MONTHLY` or `YEARLY`
- minimum quantity (integer ≥ 1)
- available from / available until (optional dates)
- option flags: `autoClose`, `closable`, `pausable`, `renewable`
- active flag

**PLAN-02 Availability**: a plan can be chosen for a *new* subscription only if it is active and today falls within the available-from and available-until window (each bound is open if empty).

**PLAN-03 Option meanings**

| Flag | Meaning |
|---|---|
| `autoClose` | When a subscription on this plan reaches its expiry date, the system closes it automatically. |
| `closable` | The subscription may be closed early, before its expiry date, by staff or by the customer. Admin can force-close any subscription with a reason. |
| `pausable` | The subscription may be paused and resumed. Paused periods are not billed. |
| `renewable` | The subscription may be renewed into a new term. |

**PLAN-04 Plan fee**: if `plan.price > 0`, a subscription on this plan automatically gets a **plan-fee line**. Its description is "{Plan name} — base fee", quantity is 1, unit price is the plan price, and it has no taxes by default (staff may add them). This line cannot be deleted while that plan is selected. It is excluded from the minimum-quantity check and from product-scoped discounts.

**PLAN-05 Minimum quantity**: every non-plan-fee line on a subscription must have `quantity ≥ plan.minQuantity`.

### 6.4 Quotation templates (QT)

**QT-01** Template fields:
- name
- validity days (≥ 1)
- plan
- payment term
- notes
- lines: variant, quantity, optional unit-price override

**QT-02 New subscription from template**: copies the plan, payment term, lines and notes into a new **DRAFT** subscription linked to the template. The sales rep then picks the customer and start date.

**QT-03 Validity**: when a subscription is sent as a quotation (DRAFT → QUOTATION), its quotation expiry date is set to today + the template's validity days. If there is no template, it uses the setting `defaultQuotationValidityDays` (default 30). After that date, confirming is blocked and the quotation shows an **Expired** badge. Re-sending resets the date.

### 6.5 Subscriptions (SUB)

**SUB-01 Fields**
- number, auto-assigned in the form `SUB/2026/00001` (yearly sequence)
- customer
- plan
- start date
- expiry date (optional; must be after the start date)
- payment term
- notes
- lines

**SUB-02 Lines**
- Fields: product variant, description (defaults to "{Product} ({Variant})"), quantity (integer), unit price (defaults to the variant price), taxes (default to the product's default taxes).
- The line shows **amount = quantity × unit price**, before discount and tax.
- The form shows a live totals preview (subtotal, discounts, taxes, total) computed by the shared pricing engine.

**SUB-03 Lifecycle**

```
DRAFT → QUOTATION → CONFIRMED → ACTIVE ⇄ PAUSED
  └────────┴────────────┴──────────┴───────┴──→ CLOSED
```

| From | Action | To | Who | Conditions | Side effects |
|---|---|---|---|---|---|
| DRAFT | `send` | QUOTATION | Admin, Staff | ≥ 1 product line; plan available; customer set | Set `quotationExpiresAt`; email the customer a link to the portal |
| QUOTATION | `revert` | DRAFT | Admin, Staff | — | Clear `quotationExpiresAt` |
| QUOTATION | `confirm` (staff) / `accept` (customer) | CONFIRMED | Admin, Staff, owning Customer | today ≤ `quotationExpiresAt` | `confirmedAt` |
| DRAFT, QUOTATION, CONFIRMED | `cancel` (staff) / `decline` (customer, from QUOTATION only) | CLOSED | Admin, Staff, owning Customer | — | `closeReason` = "Cancelled" or "Declined" |
| CONFIRMED | `activate` | ACTIVE | Admin, Staff, or the daily job | `startDate ≤ today` | `activatedAt`; `billingCycleIndex = 0`; `nextBillingDate = startDate`; **first invoice generated immediately** |
| ACTIVE | `pause` | PAUSED | Admin, Staff, owning Customer | `plan.pausable` | `pausedAt`; billing stops |
| PAUSED | `resume` | ACTIVE | Admin, Staff, owning Customer | — | Advance `billingCycleIndex` until the period start is ≥ today; paused periods are never billed |
| ACTIVE, PAUSED | `close` | CLOSED | Admin, Staff, owning Customer | `plan.closable` (Admin may force with a reason) | `closedAt`, `closeReason`; no further invoices; existing invoices are untouched |
| ACTIVE | auto-expire | CLOSED | Daily job | `plan.autoClose` and `today ≥ expiryDate` | `closeReason` = "Expired" |
| ACTIVE, CLOSED | `renew` | new subscription in CONFIRMED | Admin, Staff, owning Customer | `plan.renewable`; `expiryDate` set; not already renewed | See SUB-06 |

Any transition not listed in this table is rejected with `409 INVALID_TRANSITION`. Every transition writes an audit log entry.

**SUB-04 Editing rules**
- In DRAFT and QUOTATION, everything is editable.
- From CONFIRMED onward, the customer and plan are locked. Lines (add/remove add-ons, change quantity), taxes on lines and the expiry date can still be edited by Admin and Staff, and changes apply from the **next** invoice.
- In CLOSED, nothing is editable.

**SUB-05 Visibility**
- The list shows status filter chips with counts for each status, plus search by number or customer.
- The detail page has a status bar showing the lifecycle, the available action buttons (only the allowed ones), linked invoices, attached discounts, and an audit history timeline.

**SUB-06 Renewal**
- Creates a new subscription with status CONFIRMED and `parentId` pointing to the old one.
- It copies the customer, plan, payment term, lines and attached discounts.
- Start date = the old expiry date (or today if that date has passed). Expiry date = new start + the same term length as the previous term.
- The old subscription keeps running until its expiry and is then closed by the expiry job, whether or not its plan is `autoClose`.
- A subscription can be renewed only once.

**SUB-07 Expiry without auto-close**
- If the plan is not `autoClose`, billing stops at the expiry date: no period whose start date is on or after the expiry date is billed.
- The subscription shows an **"Expired — action needed"** badge (a derived flag) until someone renews or closes it.

### 6.6 Invoicing (INV)

**INV-01 Automatic generation, billed in advance**
- The first invoice is created when the subscription is activated, for the period `[startDate, startDate + 1 period)`.
- Each later invoice is created when `nextBillingDate ≤ today`.
- A daily billing run happens at 00:30 business time, and Admin has a **Run billing now** button.
- **Catch-up:** if several periods are due (for example after downtime), one invoice is created per missed period.
- No period starting on or after `expiryDate` is billed. Periods are always billed in full (no proration).

**INV-02 Content**
- number, in the form `INV/2026/00001`, assigned at creation
- a customer snapshot (name, email, company, billing address, tax ID)
- the subscription reference and billing period
- invoice date (= the period start for recurring invoices)
- due date = invoice date + payment term days
- currency
- **snapshot lines**: description, quantity, unit price, subtotal, discount amount, taxes, total
- totals: subtotal, discount total, tax total, total, amount paid, amount due

Changing a product, plan or tax later never changes an existing invoice.

**INV-03 Idempotency**: there is **at most one non-cancelled invoice per (subscription, period start)**. A partial unique index in the database enforces this.

**INV-04 States**

```
DRAFT → CONFIRMED → PAID
  └────────┴──→ CANCELLED   (only when amountPaid = 0)
```

- When the setting `autoConfirmInvoices = true` (the default), generated invoices are created as **CONFIRMED**; otherwise as **DRAFT**.
- Draft invoices can be confirmed one at a time or in bulk.
- An invoice becomes **PAID** automatically when `amountPaid = total`.

**INV-05 Actions**
- **Confirm** (from DRAFT)
- **Cancel** (DRAFT or CONFIRMED, requires a reason, only if no payments have been recorded)
- **Send** (CONFIRMED or PAID): emails the PDF to the customer and sets `sentAt`
- **Print / Download PDF** (any status)
- **Regenerate** (from a CANCELLED recurring invoice): creates a new invoice for the same period using the subscription's current lines and pricing

**INV-06 Overdue** is derived, not a stored state: `status = CONFIRMED AND dueDate < today`. It is shown as a red **Overdue** badge.

**INV-07** Invoice lines are not hand-edited in v1. To change an invoice, cancel it and regenerate it.

### 6.7 Taxes (TAX)

- **TAX-01** Admin manages taxes. Fields: name (unique, e.g. "GST 18%"), rate in percent (0–100, 2 decimal places), description, active flag.
- **TAX-02** Products have default taxes. These are copied to subscription lines (staff can edit them per line) and then applied on invoices.
- **TAX-03** Prices are **tax-exclusive**. For each line and each tax, `tax = roundHalfUp(netLineAmount × rate / 100, 2)`. Multiple taxes on one line add up; they are not compounded.

### 6.8 Discounts (DISC)

**DISC-01 Rules (Admin only to create, edit or archive)**
- name
- optional unique code
- type: `FIXED` or `PERCENTAGE`
- value: > 0; a percentage must be ≤ 100
- scope: `PRODUCTS` (with a list of products) or `SUBSCRIPTION` (the whole subscription)
- minimum purchase amount (optional)
- minimum quantity (optional)
- start date and end date
- usage limit (optional; empty means unlimited)
- usage count (read-only)
- active flag

**DISC-02 Attaching**: Admin or Staff attaches a discount to a subscription from its detail page. After that it applies automatically to every invoice while it is eligible. Nobody needs to remember it.

**DISC-03 Eligibility**, checked at invoice time against the invoice date. All of these must hold:
- the discount is active
- `startDate ≤ invoiceDate ≤ endDate`
- `usageLimit` is empty or `usageCount < usageLimit`
- the minimum quantity is met: for `PRODUCTS` scope, the matching line's quantity; for `SUBSCRIPTION` scope, the total quantity of non-plan-fee lines
- the minimum purchase is met: for `PRODUCTS` scope, the subtotal of matching lines; for `SUBSCRIPTION` scope, the invoice subtotal before discounts

**DISC-04 Calculation**: see `ARCHITECTURE.md §6.6`. In short:
- Product-scoped discounts are applied first, per matching line. A `FIXED` value is taken off each matching line, capped at that line's amount.
- Subscription-scoped discounts are applied next, on what remains, and allocated across lines in proportion to each line's remaining amount.
- Discounts stack in the order they were attached. No line goes below 0.
- Taxes are computed on the discounted amount.

**DISC-05 Usage counting**
- Each invoice on which a discount produced an amount greater than 0 uses it **once**.
- Cancelling that invoice releases the use.
- When a discount expires or is used up, it simply stops applying. The subscription shows an "Expired" or "Used up" chip on it.

**DISC-06** The invoice shows the discount amount per line, the discount total, and the names of the discounts applied.

### 6.9 Payments (PAY)

- **PAY-01** Record a payment against a **CONFIRMED** invoice. Fields: method (`BANK_TRANSFER`, `UPI`, `CARD`, `CASH`, `CHEQUE`, `OTHER`), amount (> 0 and ≤ amount due), date (≤ today), note.
- **PAY-02** Partial payments are allowed. `amountPaid` is updated in the same transaction. When it equals the total, the invoice becomes **PAID** and `paidAt` is set.
- **PAY-03** Admin can delete a payment. A reason is required and the deletion is audited. The invoice returns to CONFIRMED if it is no longer fully paid.
- **PAY-04** The payments list has filters for date range, method and customer. The invoice list has quick filters: **All / Paid / Outstanding / Overdue**.

### 6.10 Customer portal (PORTAL)

- **PORTAL-01 Home**: active subscriptions, next billing date, total outstanding, and quotations awaiting acceptance.
- **PORTAL-02 Subscriptions**: list and detail (plan, lines, dates, status, invoices). The actions shown are only those allowed by the state machine and plan flags: accept/decline, pause/resume, close, renew.
- **PORTAL-03 Invoices**: list and detail with a PDF download, showing paid, outstanding and overdue status.
- **PORTAL-04 Profile**: edit name, phone, company, billing address and tax ID, and change password (old password plus new password following the rule).
- **PORTAL-05 Isolation**: a customer can only reach their own records. Any other ID returns **404**, not 403.

### 6.11 Reports and finance dashboard (RPT)

**RPT-01 KPI cards**, filtered by date range (default: the current month):

| KPI | How it is measured |
|---|---|
| Active subscriptions | Count now |
| MRR | See RPT-05 |
| Revenue collected | Sum of payments in the range |
| Invoiced | Sum of totals of CONFIRMED and PAID invoices dated in the range |
| Outstanding | Sum of `total − amountPaid` over all CONFIRMED invoices, now |
| Overdue | Count and amount |

**RPT-02 Charts**: revenue collected per month for the last 12 months (bars), and subscriptions by status (horizontal bars).

**RPT-03 Overdue table**, sorted by days overdue (descending): invoice number, customer, due date, days overdue, amount due, and a quick **Record payment** button.

**RPT-04 Filters**: date range, plan, customer. Filters live in the URL so a view can be shared.

**RPT-05 MRR**: for each ACTIVE subscription, the sum of its lines' `quantity × unitPrice` (before tax and discount), normalized to a month:
- DAILY × 30
- WEEKLY × 52 / 12
- MONTHLY × 1
- YEARLY / 12

The dashboard labels this "MRR (list price)".

**RPT-06** CSV export of the overdue table and the invoice list is a stretch goal.

### 6.12 Admin settings and operations (ADM)

**ADM-01 Settings**:
- company name, address and tax ID (printed on invoices)
- currency code (default `INR`)
- business time zone (default `Asia/Kolkata`)
- `autoConfirmInvoices` (default true)
- `defaultQuotationValidityDays` (default 30)
- invoice footer note

**ADM-02 Users page**: list staff and customers, create staff, deactivate users.

**ADM-03 Billing runs page**: each run's date, trigger (SCHEDULED or MANUAL), subscriptions processed, invoices created and failures with reasons.

**ADM-04 Audit timeline** on the subscription, invoice and customer detail pages: who did what, and when.

---

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Every page is interactive in **< 2 s** and list APIs have p95 **< 500 ms**, with 10k subscriptions, 50k invoices and 40k payments seeded. All lists are paginated server-side (default 25, max 100). |
| Correctness | Money is stored as `NUMERIC(12,2)` and rounded half-up to 2 decimal places per line. Totals are always recomputed on the server. |
| Reliability | Billing is idempotent and transactional, and a failure on one subscription does not stop the run. Jobs are safe to re-run. |
| Security | Passwords hashed with argon2id. Short-lived JWT access token held in memory; refresh token in an httpOnly cookie. RBAC on the server. Rate-limited auth endpoints. Zod validation on every input. `helmet` and strict CORS. No secrets in the repository. |
| Auditability | Every state change and financial action is written to `AuditLog`. |
| Usability | Responsive from 360px wide, keyboard navigable, WCAG AA contrast, clear empty, loading and error states. |
| Time | All business dates (billing, due, expiry) are computed in the configured business time zone. Timestamps are stored in UTC. |

## 8. Traceability: scenes in the brief → features

| Brief scene | Features |
|---|---|
| A new customer signs up | AUTH-01..07, roles in §5 |
| Launching a new plan | CAT-01..04, PLAN-01..05, TAX-01 |
| Turning a quote into a subscription | QT-01..03, SUB-01..07 |
| Billing day | INV-01..07, TAX-02..03 |
| A customer asks for a better price | DISC-01..06 |
| The money comes in | PAY-01..04, INV-06 |
| The finance lead, at the end of the month | RPT-01..06, §7 Performance |
| Customers manage their own subscriptions | PORTAL-01..05 |

## 9. Glossary

| Term | Meaning |
|---|---|
| **Billing period** | The span one invoice covers (a day, week, month or year). |
| **Billing cycle index (n)** | The number of periods already billed. Period *n* starts at `startDate + n × period`. |
| **Plan-fee line** | The automatic subscription line carrying the plan's base price. |
| **Amount due** | `total − amountPaid` on an invoice. |
| **Outstanding** | A CONFIRMED invoice with an amount due greater than 0. |
| **Overdue** | An outstanding invoice whose due date is before today. |
| **MRR** | Monthly recurring revenue: list-price recurring amount normalized to a month. |
