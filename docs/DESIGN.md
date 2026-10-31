> USER APPROVED REVISION (31 Oct 2026): The supplied dark hero reference supersedes original branding. Use black surfaces, white pill buttons, blue highlights, Instrument Sans UI and Instrument Serif editorial headings. Keep Brightloop billing content, semantic status colors, responsive layouts and light mode. Video and motion belong to the auth brand panel, with static fallback and reduced-motion support.

# DESIGN — Brightloop visual system

> Every screen uses these tokens. Components never contain hex values, pixel font sizes or arbitrary Tailwind values. Everything maps to the CSS variables below (see `RULES.md`).

---

## 1. Personality

**Calm, precise, trustworthy.** This is a finance tool people use all day, so the screens are dense but never cramped. Color carries **meaning** (status, money owed, a primary action), not decoration. The brand idea of a *bright loop* shows up as a deep teal (steady, recurring) with one warm amber accent (the "bright" moment) used sparingly.

Design principles:
1. **Numbers first.** Amounts are tabular, right-aligned and always formatted.
2. **Status at a glance.** Every record shows its status as a badge and a lifecycle bar.
3. **One primary action per view.** Secondary actions are outline or ghost buttons.
4. **No dead ends.** Every empty state has a next step.

## 2. Color tokens

Define these in `apps/web/src/styles/globals.css` on `:root` and under `.dark`, then map them into the Tailwind theme and shadcn's variable names (`--background`, `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, `--destructive`, ...).

### Light

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F7F9F8` | App background |
| `--surface` | `#FFFFFF` | Cards, tables, dialogs, inputs |
| `--surface-muted` | `#F0F4F2` | Table header, hover rows, sidebar |
| `--border` | `#E1E8E5` | Dividers, input borders |
| `--border-strong` | `#C9D4CF` | Focused or selected outlines (non-brand) |
| `--text` | `#0F1A17` | Primary text |
| `--text-muted` | `#5A6B65` | Secondary text, labels, helper text |
| `--text-subtle` | `#8A9993` | Placeholders, disabled |
| `--primary` | `#0F766E` | Primary buttons, links, active nav, focus ring |
| `--primary-hover` | `#0B5F58` | Primary hover and pressed |
| `--primary-fg` | `#FFFFFF` | Text on primary |
| `--primary-soft` | `#E3F3F0` | Selected nav background, subtle highlights |
| `--accent` | `#E8A23A` | Brand dot, highlights, "Confirmed" status, chart secondary |
| `--accent-soft` | `#FCF1DF` | Accent badge background |
| `--success` | `#15803D` | Active, Paid |
| `--success-soft` | `#E6F4EA` | |
| `--warning` | `#B45309` | Paused, expiring soon |
| `--warning-soft` | `#FEF2E1` | |
| `--danger` | `#B91C1C` | Overdue, destructive actions, errors |
| `--danger-soft` | `#FDEBEB` | |
| `--info` | `#1D4ED8` | Quotation, Confirmed invoice, informational |
| `--info-soft` | `#E8EEFD` | |

### Dark

| Token | Hex |
|---|---|
| `--bg` | `#0B1210` |
| `--surface` | `#111A18` |
| `--surface-muted` | `#17221F` |
| `--border` | `#24312D` |
| `--border-strong` | `#34443F` |
| `--text` | `#E6EEEB` |
| `--text-muted` | `#9AABA5` |
| `--text-subtle` | `#6C7C77` |
| `--primary` | `#2DB3A3` |
| `--primary-hover` | `#4CC7B8` |
| `--primary-fg` | `#04201C` |
| `--primary-soft` | `#0F2E2A` |
| `--accent` | `#F2B65C` |
| `--accent-soft` | `#2E2412` |
| `--success` / `-soft` | `#4ADE80` / `#10291A` |
| `--warning` / `-soft` | `#FBBF24` / `#2E2410` |
| `--danger` / `-soft` | `#F87171` / `#2E1414` |
| `--info` / `-soft` | `#7AA2FF` / `#131E3A` |

All text and background pairs above meet WCAG AA (4.5:1 for body text). The default theme follows the OS setting, with a toggle in the user menu.

### Status → color mapping (single source: `status-badge.tsx`)

| Entity | Status | Badge style (text on soft background, with a 6px dot) |
|---|---|---|
| Subscription | DRAFT | neutral (`--text-muted` on `--surface-muted`) |
| | QUOTATION | info |
| | QUOTATION + expired | warning, label "Expired quote" |
| | CONFIRMED | accent |
| | ACTIVE | success |
| | ACTIVE + past expiry, not auto-closed | warning, label "Expired — action needed" |
| | PAUSED | warning |
| | CLOSED | neutral, muted text |
| Invoice | DRAFT | neutral |
| | CONFIRMED | info, label "Open" |
| | CONFIRMED + overdue | danger, label "Overdue · N days" |
| | PAID | success |
| | CANCELLED | neutral, struck-through number |
| Discount chip | Active / Expired / Used up | success / neutral / warning |

### Chart palette (in order)
`--primary`, `--accent`, `--info`, `--success`, `--warning`, `--text-subtle`. Gridlines use `--border`; axis labels use `--text-muted`.

## 3. Typography

Loaded from Google Fonts with `display=swap`:

| Role | Family | Weights | Notes |
|---|---|---|---|
| Headings and display | **Manrope** | 600, 700 | Geometric, friendly, compact |
| UI and body | **Inter** | 400, 500, 600 | Use `font-feature-settings: "cv11", "ss01"`; **all numbers use `tabular-nums`** |
| Codes and mono | **JetBrains Mono** | 400, 500 | Document numbers (`SUB/2026/00042`), IDs, tokens |

Fallbacks: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif` and `ui-monospace, SFMono-Regular, Menlo, monospace`.

### Type scale (rem, base 16px; the app body is 14px for density)

| Token | Size / line-height | Weight | Family | Use |
|---|---|---|---|---|
| `display` | 1.875rem / 2.25rem (30/36) | 700 | Manrope | KPI values, auth hero |
| `h1` | 1.5rem / 2rem (24/32) | 700 | Manrope | Page titles |
| `h2` | 1.25rem / 1.75rem (20/28) | 600 | Manrope | Section titles, card titles |
| `h3` | 1rem / 1.5rem (16/24) | 600 | Manrope | Sub-sections, dialog titles |
| `body-lg` | 1rem / 1.5rem | 400 | Inter | Portal body, empty-state text |
| `body` | 0.875rem / 1.25rem (14/20) | 400 | Inter | Default app text, table cells, inputs |
| `body-strong` | 0.875rem / 1.25rem | 600 | Inter | Emphasis, totals |
| `small` | 0.8125rem / 1.125rem (13/18) | 400 | Inter | Helper text, secondary cell lines |
| `caption` | 0.75rem / 1rem (12/16) | 500, uppercase, letter-spacing 0.04em | Inter | Table headers, KPI labels, overlines |
| `mono` | 0.8125rem / 1.125rem | 500 | JetBrains Mono | Document numbers |

Rules: headings are sentence case; no more than 3 sizes per view besides the scale; never use italics for emphasis (use weight).

## 4. Spacing, radius, elevation, motion

- **Spacing:** 4px base. Use the Tailwind scale 1, 2, 3, 4, 6, 8, 12 (4–48px). Card padding 20–24px; stacked form fields 16px apart; page sections 32px apart.
- **Radius:** `--radius-sm 6px` (badges, inputs), `--radius-md 8px` (buttons, cards), `--radius-lg 12px` (dialogs, KPI cards). Status badges are fully rounded pills.
- **Elevation:** flat by default with 1px borders. `--shadow-sm: 0 1px 2px rgb(15 26 23 / 0.06)` for cards; `--shadow-lg: 0 12px 32px rgb(15 26 23 / 0.12)` for dialogs, popovers and dropdowns. In dark mode, rely on borders rather than shadows.
- **Motion:** 150ms `ease-out` for hover and press, 200ms for dialogs and sheets. Respect `prefers-reduced-motion`. No decorative animation.
- **Focus:** `2px` ring in `--primary` with a `2px` offset on every interactive element. Never remove outlines.

## 5. Layout

### App (Admin/Staff): `AppLayout`
- **Sidebar** 248px (collapsible to a 64px icon rail), background `--surface-muted`, right border.
  - Logo at the top.
  - Nav groups with caption headers:
    - **Overview:** Dashboard
    - **Sales:** Subscriptions, Quotation templates, Customers
    - **Billing:** Invoices, Payments
    - **Catalog:** Products, Plans, Attributes
    - **Configuration:** Taxes, Payment terms, Discounts
    - **Admin:** Users, Billing runs, Settings (Admin only)
  - Active item: `--primary-soft` background, `--primary` text, 3px left indicator.
- **Top bar** 56px: page breadcrumb on the left; on the right, search (⌘K stretch goal), theme toggle and user menu (name, role badge, logout).
- **Content:** max width 1440px, 24px padding (16px under 768px).
- **Page header:** H1, an optional muted description, and actions aligned right (one primary).
- Under 1024px the sidebar becomes a sheet opened from a hamburger button.

### Portal (Customer): `PortalLayout`
- Top navigation (64px) with logo, Home, Subscriptions, Invoices and profile menu. Content max width 1040px, centered. Body text uses `body-lg`. Friendlier spacing (cards over tables on mobile).

### Auth pages: `AuthLayout`
- Split screen at ≥ 1024px: on the left, a brand panel (`--primary` background) with the logo, one line of copy ("Recurring billing, without the spreadsheet.") and a subtle concentric-loop line pattern in `--primary-hover`; on the right, a 400px form card. Single column on mobile.

### Logo
Wordmark **brightloop** in Manrope 700, lowercase, `--text`, preceded by a glyph: a 2.5px-stroke ring in `--primary` with a small filled `--accent` dot on its upper right, suggesting a loop with a bright moment. Build it as an inline SVG component; no image files.

## 6. Components

| Component | Spec |
|---|---|
| **Button** | Heights: sm 32, md 36 (default), lg 44. Variants: `primary` (filled), `secondary` (surface + border), `ghost`, `destructive` (filled danger), `link`. Icons 16px with an 8px gap. Loading state shows a spinner and disables the button, keeping its width. |
| **Input / Select / Combobox** | 36px tall, `--surface` background, `--border`, focus border `--primary` + ring. Label above (`small` 500, `--text`), helper/error text below (`small`; errors in `--danger` with an icon). Required fields are marked with `*` in `--danger`. |
| **MoneyInput** | Right-aligned, tabular numbers, currency prefix in `--text-muted`, accepts only 2 decimal places. |
| **DatePicker** | Shows `31 Oct 2026` and sends `YYYY-MM-DD`. |
| **DataTable** | Header row on `--surface-muted` with `caption` text. Row height 44px; hover `--surface-muted`; no zebra stripes; 1px row dividers. **Numbers right-aligned**; status column uses `StatusBadge`; the first column (number or name) is the link (mono for documents). Sticky header. Footer has pagination ("1–25 of 3,412"; page size 25/50/100). Toolbar above: search, filter chips, view tabs. Selection checkboxes only where bulk actions exist (invoice bulk confirm). |
| **StatusBadge** | Pill, height 22px, `caption`-size text in sentence case (not uppercase), 6px dot, colors per §2 mapping. |
| **StatusBar** | Horizontal stepper on detail pages (like a document status bar): steps `Draft → Quotation → Confirmed → Active → Closed` (Paused shown as a branch label on Active). Done steps are `--primary` with a check, the current step is `--primary` filled, future steps are `--border-strong`. Action buttons sit to its left. |
| **KPI card** | Radius 12px, padding 20px. Caption label, `display` value (tabular), optional delta or sub-line in `small` `--text-muted`, 20px icon in a `--primary-soft` circle. The overdue card uses `--danger` for its value when > 0. |
| **Document view (invoice/quotation)** | A paper-like card on `--surface`, max width 880px. Header with company block on the left and number (mono, h2), status badge and dates on the right. Bill-to block. Lines table. Totals block right-aligned (Subtotal, Discounts in `--success` as negative values, Taxes, **Total** in `h2`, Paid, **Amount due**). Payments list below. Mirror this layout in the PDF. |
| **Lines editor** | Editable table rows: variant combobox (shows final price), description, qty (stepper), unit price (MoneyInput), taxes (multi-select chips), amount (read-only). "+ Add line" ghost button. The plan-fee row has a lock icon and is tinted `--surface-muted`. A totals panel updates live. |
| **Dialog / Sheet** | Dialog for confirmations and short forms (≤ 6 fields), radius 12px, max width 480–560px. Destructive confirm shows the consequence ("This cancels INV/2026/00042. Discount usage will be released.") and a typed reason where required. |
| **Toast** | sonner, bottom-right; success uses a `--success` icon, errors show the API `message`. |
| **Empty state** | 40px lucide icon in a `--primary-soft` circle, h3 title, one muted line, and one primary action (e.g. "Create your first plan"). |
| **Skeletons** | Match the final layout (table rows, KPI cards). Never show a full-page spinner. |
| **Timeline (history)** | Vertical list: actor avatar or initials (system = loop glyph), action text ("Priya confirmed the quotation"), from→to badges, relative time with an exact timestamp on hover. |

## 7. Formatting

- **Money:** `Intl.NumberFormat('en-IN', { style: 'currency', currency: settings.currency })`, giving `₹1,56,000.00`. Always 2 decimal places. Negative amounts (discounts) show as `−₹560.00` in `--success` on documents.
- **Dates:** `31 Oct 2026` (`D MMM YYYY`); with time: `31 Oct 2026, 13:47`; relative ("3 days ago") only in timelines.
- **Billing period:** `1 Oct – 31 Oct 2026` (display the exclusive end minus one day).
- **Overdue:** "Overdue · 12 days".
- **Document numbers:** mono, never truncated.
- **Empty values:** `—` in `--text-subtle`.

## 8. Iconography

lucide-react, 16px inline and 20px in nav and KPI cards, stroke 1.75. Suggested icons:

| Area | Icon |
|---|---|
| Dashboard | `LayoutDashboard` |
| Subscriptions | `Repeat` |
| Quotation templates | `FileStack` |
| Customers | `Users` |
| Invoices | `Receipt` |
| Payments | `Wallet` |
| Products | `Package` |
| Plans | `CalendarClock` |
| Attributes | `Tags` |
| Taxes | `Percent` |
| Payment terms | `Clock` |
| Discounts | `BadgePercent` |
| Users | `UserCog` |
| Billing runs | `PlayCircle` |
| Settings | `Settings` |
| Overdue | `AlertTriangle` |

## 9. Accessibility

- WCAG AA contrast. Never use color alone: badges always have text, and overdue also has an icon.
- Every input has a `<label>`. Errors are linked with `aria-describedby`. Dialogs trap focus and close on Esc.
- Tables use proper `<th scope>`. Sort buttons announce the sort direction.
- Hit targets are ≥ 36px on desktop and ≥ 44px on touch.
- Full keyboard path through the key flows (create subscription, record payment).

## 10. Key screens (layout notes)

1. **Dashboard:** a filter bar (date range, plan, customer), then a row of 6 KPI cards (3 columns at md, 6 at xl): Active subscriptions, MRR, Revenue collected, Invoiced, Outstanding, Overdue. Below, a 2-column row with Revenue by month (bar, 2/3 width) and Subscriptions by status (horizontal bars, 1/3). Then a full-width overdue invoices table.
2. **Subscriptions list:** status chips with counts (All · Draft 12 · Quotation 8 · Confirmed 3 · Active 412 · Paused 5 · Closed 97), search, plan/customer filters, then the table (Number, Customer, Plan, Next billing, Status, MRR).
3. **Subscription detail:** header (number, customer, status badge) and the StatusBar with actions. Two columns: on the left, a tabbed card (Lines | Invoices | History); on the right, a summary card (plan, period, dates, payment terms, next billing, totals) and a Discounts panel.
4. **Invoice detail:** the action bar (Confirm / Send / Download PDF / Record payment / Cancel) above the Document view.
5. **Portal home:** a greeting, 3 summary cards (Active subscriptions, Next billing, Amount due with a "View invoices" button), "Quotations awaiting you" cards with Accept/Decline, and a recent invoices list.
