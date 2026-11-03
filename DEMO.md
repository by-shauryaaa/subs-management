# Brightloop — Evaluator Demo Walkthrough (7-Minute Script)

> This script walks through a realistic "Month at Brightloop" covering all primary personas: **Admin**, **Sales Staff**, **Customer Portal**, and **Finance Lead**.

---

## Prerequisites & Environment Setup

Ensure the application is running locally:

```sh
# 1. Start database & mailpit services
docker compose up -d

# 2. Apply migrations & seed demo dataset
pnpm db:migrate
pnpm db:seed

# Optional: Run the large dataset generator (50+ customers, 100+ subscriptions, 200+ invoices)
# pnpm db:seed:large

# 3. Start development servers
pnpm dev
```

- **Frontend**: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- **API**: [http://127.0.0.1:4000/api/v1](http://127.0.0.1:4000/api/v1)
- **Mailpit Web UI**: [http://127.0.0.1:8025](http://127.0.0.1:8025)

---

## Credentials Cheat Sheet

| Persona | Email | Password | Role / Access |
|---|---|---|---|
| **Admin** | `admin@brightloop.local` | `Admin@12345` | Full access, settings, billing runs, user management |
| **Sales Staff** | `priya@brightloop.local` | `Staff@12345` | Quotations, subscriptions, catalog, invoices |
| **Customer** | `ananya@nimbuslabs.in` | `Customer@123` | Self-serve portal, quotations, invoices, profile |

---

## Step-by-Step Walkthrough

### Scene 1: Executive Overview & Catalog Configuration (Admin)
1. Navigate to [http://127.0.0.1:5173/login](http://127.0.0.1:5173/login).
2. Log in as **Admin** (`admin@brightloop.local` / `Admin@12345`).
3. **Dashboard (`/app/dashboard`)**:
   - Observe live financial KPIs: **Monthly Recurring Revenue (MRR)**, **Revenue Collected**, **Outstanding Balances**, and **Overdue Amounts**.
   - Review subscription breakdown by status (Active, Quotation, Draft, Paused, Closed).
4. **Catalog Inspection**:
   - Navigate to **Catalog → Plans**: Note recurring plans (Monthly Starter, Monthly Pro, Yearly Business).
   - Navigate to **Catalog → Products**: View products with Brand variants (e.g., Odoo Brand +₹560 extra, Generic Brand +₹0).
   - Navigate to **Configuration → Discounts**: Inspect active discount rules (`WELCOME10`, `SUMMER2026`, `VOLUME15`).
   - Navigate to **Sales → Quotation Templates**: View pre-configured quotation templates (e.g., "Enterprise Cloud Pack").

---

### Scene 2: Rapid Quoting from Template (Sales Staff)
1. Switch to or log in as **Sales Staff** (`priya@brightloop.local` / `Staff@12345`).
2. Navigate to **Sales → Subscriptions**.
3. Click **New subscription** or instantiate from a template:
   - Select Customer: `Ananya Sharma (Nimbus Labs)`.
   - Select Plan: `Monthly Pro`.
   - Add lines or load template lines:
     - *Brightloop CRM* (Odoo variant) × 2 seats @ ₹1,560.00
     - *Cloud Hosting* × 1 instance @ ₹2,500.00
   - Attach Discount: Select **WELCOME10** (10% subscription-wide discount).
4. Save the subscription:
   - Notice the status starts in **DRAFT**.
   - Click **Send quotation**: Status transitions to **QUOTATION**.
   - Note the validity expiration timestamp automatically assigned based on template rules (`QT-03`).
   - An automated quote notification is dispatched to Mailpit.

---

### Scene 3: Self-Service Customer Portal
1. Open an incognito browser window or log out.
2. Navigate to [http://127.0.0.1:5173/login](http://127.0.0.1:5173/login) and log in as **Customer** (`ananya@nimbuslabs.in` / `Customer@123`).
3. **Customer Portal (`/portal`)**:
   - View active subscriptions, outstanding amount due, and pending quotations.
   - Click into the newly sent quotation: observe the itemized transparent pricing, GST tax calculation, and applied discount breakdown.
   - Click **Invoices**: View billing history and payment statuses.

---

### Scene 4: Confirmation, Activation & Automated Billing
1. In the Staff / Admin session, confirm the quotation:
   - Click **Confirm**: Status transitions from `QUOTATION` → `CONFIRMED`.
   - Click **Activate**: Status transitions to `ACTIVE`.
2. **Instant Invoice Generation**:
   - Navigating to the **Invoices** tab on the subscription reveals the first cycle invoice generated automatically (`INV/2026/00001`).
   - Click the invoice to view the immutable snapshot lines, GST summary, and payment term due date.
   - Click **Download PDF**: The system renders a clean itemized PDF via `pdfkit`.
   - Click **Send email**: The invoice PDF is delivered directly to the customer's inbox. Verify in [Mailpit](http://127.0.0.1:8025).

---

### Scene 5: Automated Billing Runs (Advisory Locking Engine)
1. Navigate to **Admin → Billing Runs** (`/app/admin/billing-runs`).
2. Click **Run billing now**:
   - The billing engine acquires a PostgreSQL advisory transaction lock.
   - Any subscriptions with periods due are processed without manual data entry.
3. Click **Run billing now** again:
   - Demonstrates idempotency: no duplicates are generated; already-billed periods are skipped.

---

### Scene 6: Payment Recording & Reconciliation
1. Navigate to **Billing → Invoices**.
2. Select any unpaid invoice with status `CONFIRMED`.
3. Click **Record Payment**:
   - Enter payment details: Amount (full balance), Method (`BANK_TRANSFER` or `UPI`), Note/Reference.
   - Submit: In an ACID transaction with row-level locking, the payment is recorded, `amountPaid` updates, and the invoice transitions to **PAID**.

---

### Scene 7: Auditing & Performance Pass
1. Navigate back to any subscription and click the **History** tab:
   - Inspect the complete audit trail showing actors (`Priya`, `System`), state transitions (`DRAFT` → `QUOTATION` → `CONFIRMED` → `ACTIVE`), and timestamps.
2. Check database scale performance with `pnpm db:seed:large` to verify snappy queries across large datasets with full index coverage.
