# Water-Ops v3 — AGENTS.md

## Project Overview

**Verri P Water Inc Operations Management System** — a full-featured ERP-style dashboard for a Nigerian sachet/bottle water company. Built with Next.js 16 + React 19 + TypeScript + MongoDB + Tailwind CSS v4.

Manages the entire supply chain: factories → depots → trucks → inventory → transfers → sales → costs.

## Key Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, standalone output, Turbopack) |
| UI | React 19, Tailwind CSS v4 |
| Database | MongoDB + Mongoose 9 |
| Auth | JWT (httpOnly cookies) + bcryptjs |
| Charts | ApexCharts + react-apexcharts |
| Calendar | FullCalendar |
| Icons | Custom SVGs (svgr) + Lucide React |
| PDF Reports | html2canvas + jsPDF |
| Docker | Multi-stage build + docker-compose (app + MongoDB 7) |
| Linting | ESLint flat config (eslint.config.mjs) |
| Font | Outfit (Google Fonts) |
| Date Picker | Flatpickr |

## Project Structure

```
src/
├── app/
│   ├── (admin)/              # Protected routes with sidebar layout
│   │   ├── costs/, depots/, factories/, stock/, notifications/
│   │   ├── products/, profile/, reports/, sales/, transfers/
│   │   ├── trucks/, users/, activity/, analysis/
│   │   ├── calendar/, blank/, customers/, staff/, suppliers/
│   │   ├── raw-materials/, scheduled-operations/, truck-loads/
│   │   ├── payment-transactions/, pos-devices/, wastage/
│   │   ├── disputes/, driver/, settings/, onboarding/
│   │   └── factories/[id]/, depots/[id]/, trucks/[id]/, products/[id]/
│   ├── (full-width-pages)/       # Public routes (signin, signup, 404)
│   └── api/                      # CRUD routes per entity
├── components/                   # Shared UI components
├── context/                      # AuthContext, SidebarContext, ThemeContext
├── hooks/                        # useGoBack, useModal
├── icons/                        # ~58 SVG components
├── layout/                       # AppHeader, AppSidebar, Backdrop, SidebarWidget
└── lib/
    ├── auth.ts                   # JWT, hash, getUserFromRequest
    ├── dateFormat.ts             # formatDate utility
    ├── db.ts                     # MongoDB connection singleton
    ├── logActivity.ts            # Activity logging helper
    ├── toast.tsx                 # react-hot-toast helpers
    └── models/                   # 42 Mongoose models (see below)
```

## Cog Architecture — Decentralized Entity Model

Every entity is an **independent cog**. Entities NEVER embed foreign keys to other entities in their schema.
Relationships are managed through **connector gears** — separate models that link cogs together.

```
┌─────────────────────────────────────────────────────┐
│                  CONNECTOR GEARS                      │
│  StaffAssignment ↔ DriverAssignment ↔ UserRole      │
│  CustomerAccount ↔ PosDeviceAssignment               │
│  SupplierContract                                    │
└─────────────────────────────────────────────────────┘
           ↕         ↕         ↕         ↕
┌─────────────────────────────────────────────────────┐
│                 ENTITY COGS (Independent)            │
│  Factory | Depot | Truck | Product | RawMaterial    │
│  Staff | User | Customer | Supplier                 │
│  PosDevice | Asset | Batch | DeliveryRoute          │
└─────────────────────────────────────────────────────┘
           ↕         ↕         ↕         ↕
┌─────────────────────────────────────────────────────┐
│           TRANSACTIONAL RECORDS (Events)             │
│  Production | Sale | Transfer | Cost | Wastage      │
│  PurchaseOrder | GRN | BillOfMaterials | QC         │
│  Invoice | PaymentReceipt | FuelLog                 │
│  Attendance | Leave | Trip | Stock | TruckLoad      │
│  ServiceRecord | ScheduledOperation | Dispute       │
└─────────────────────────────────────────────────────┘
```

### Entity Cogs (standalone, no FK references)

| Cog | Fields | Notes |
|-----|--------|-------|
| `Factory` | name, location, capacity, isActive | Pure location |
| `Depot` | name, location, isActive | No `manager` field |
| `Truck` | plateNumber, chassisNumber, engineNumber, capacity, isActive | No `driverName` or `assignedTo` |
| `Product` | name, unit, category(sachet/bottle), description, unitPrice | |
| `RawMaterial` | name, unit, category, currentStock, minimumStock, unitCost | No `supplierId` |
| `Staff` | name, phone, email, salary, employmentType, startDate, isActive | No `role`/`department`/`location` |
| `User` | name, email, password, isActive | No `role`/`factoryId`/`depotId`/`truckId` |
| `Customer` | name, phone, email, address, businessName, customerType, isActive | |
| `Supplier` | name, phone, email, address, supplyType, materialProvided, isActive | |
| `PosDevice` | terminalSerial, name, provider(moniepoint/opay/palmpay), isActive | No `locationType/Id` |
| `Asset` | name, type, serialNumber, purchaseDate, purchaseCost, currentValue, location | Fixed asset register |
| `Batch` | batchNumber, productionId, productId, quantity, date, expiryDate, status | Traceability |
| `DeliveryRoute` | name, description, depotId, waypoints, isActive | Route planning |

### Connector Gears (relationship links)

| Connector | Links | Purpose |
|-----------|-------|---------|
| `StaffUserLink` | Staff ↔ User (1:1 required) | Every system user MUST be a staff member |
| `StaffAssignment` | Staff ↔ Factory/Depot + Role + Department | Who works where as what |
| `DriverAssignment` | Staff(driver) ↔ Truck + License | Which driver drives which truck |
| `UserRole` | User ↔ Role(admin/factory-mgr/depot-mgr/driver) + Scope | User's role + managed entity |
| `CustomerAccount` | Customer ↔ PriceTier + CreditLimit + Terms | Financial relationship |
| `PosDeviceAssignment` | PosDevice ↔ Factory/Depot | Where a POS terminal is placed |
| `SupplierContract` | Supplier ↔ PaymentTerms + LeadTime | Contract terms per supplier |

### Transactional Records (link entities by reference — events, not relationships)

```
Production ──factoryId──→ Factory
Production ──productId──→ Product

Stock ──locationType+locationId──→ Factory | Depot | Truck
Stock ──productId──→ Product

Sale ──locationType+locationId──→ Factory | Depot | Truck
Sale ──productId──→ Product | Customer
Sale ──paymentMethod──→ cash | pos | transfer | credit

Transfer ──fromType+fromId──→ Factory | Depot | Truck
Transfer ──toType+toId──────→ Factory | Depot | Truck
Transfer ──truckId──→ Truck | productId──→ Product

Cost ──locationType+locationId──→ Factory | Depot | Truck

Wastage ──locationType+locationId──→ Factory | Depot | Truck
Wastage ──source──→ production | transfer | sale | storage | other

PurchaseOrder ──supplierId──→ Supplier | items──→ RawMaterial
GoodsReceivedNote ──purchaseOrderId──→ PurchaseOrder
BillOfMaterials ──productId──→ Product | items──→ RawMaterial
QualityCheck ──batchId──→ Batch | productId──→ Product
Invoice ──customerId──→ Customer | saleId──→ Sale
PaymentReceipt ──invoiceId──→ Invoice | customerId──→ Customer
FuelLog ──truckId──→ Truck | driverId──→ Staff
Attendance ──staffId──→ Staff
Leave ──staffId──→ Staff | approvedBy──→ User
Trip ──truckId──→ Truck | driverId──→ Staff | routeId──→ DeliveryRoute
```

## Stock Stats — Data Flow

`GET /api/stock/stats` aggregates across **6 collections:**

| Stat | Source | Aggregation |
|------|--------|-------------|
| `totalProduced` | Production | Sum of all `quantity` |
| `totalSold` | Sale | Sum of all `quantity` |
| `totalAvailable` | Stock | Sum of all `quantity` |
| `factoryStock` | Stock | Sum where `locationType="factory"` |
| `depotStock` | Stock | Sum where `locationType="depot"` |
| `truckStock` | Stock | Sum where `locationType="truck"` |
| `locationCount` | Stock | Distinct `(locationType, locationId)` pairs |
| `pendingTransferQty` | Transfer | Sum where `status="pending"` |
| `inTransitQty` | Transfer | Sum where `status="in-transit"` |
| `totalWastage` | Wastage | Sum of all `quantity` |
| `productionLoss` | Wastage | Sum where `source="production"` |
| `transferLoss` | Wastage | Sum where `source="transfer"` |
| `saleLoss` | Wastage | Sum where `source="sale"` |
| `storageLoss` | Wastage | Sum where `source="storage"` |
| `otherLoss` | Wastage | Sum where `source="other"` |

All stats support role-based scoping (factory-manager → own factory, depot-manager → own depot) and optional filters (locationType, locationId, productId, startDate, endDate).

## Routing

| Route | Page | Notes |
|-------|------|-------|
| `/` | Dashboard | Polls `/api/analysis` + `/api/stock/stats` every 15s |
| `/signin`, `/signup` | Auth | signup deleted; signin only |
| `/factories` | Factory list + CRUD | |
| `/depots` | Depot list + CRUD | |
| `/trucks` | Truck list + CRUD | |
| `/products` | Product list + CRUD + import | |
| `/stock` | Stock levels + activity drills | Polls every 15s |
| `/sales` | Sales list + new sale | Credit settlement support |
| `/costs` | Costs list + new cost | |
| `/transfers` | Transfers + status actions | Dispatch/Confirm/Cancel workflow with spoilage modal |
| `/analysis` | Business analysis | Per-entity sales/costs/profit/inventory |
| `/reports` | PDF report generation | html2canvas → jsPDF |
| `/notifications` | Low stock + in-transit alerts | |
| `/activity` | Audit log | Paginated, entity-filtered |
| `/users` | User management | |
| `/profile` | User profile + change password | |
| `/calendar`, `/blank` | Misc | Calendar uses FullCalendar |

## Auth

- JWT in httpOnly cookie, 7-day expiry
- Role + scope stored in JWT payload at login (queried from `UserRole` model)
- Admin layout guards unauthenticated access
- Roles: **admin**, **factory-manager**, **depot-manager**, **driver**
- Seed user: `admin@verripwater.com` / `admin123`

### Auth Data Flow
1. **Login**: Finds User by email → verifies `StaffUserLink` exists (user must be staff) → queries `UserRole` for role/scope → embeds in JWT + response
2. **Middleware**: `getUserFromRequest()` reads role/scope from JWT payload (NOT from DB)
3. **Critical**: `User` model has NO `role`/`factoryId`/`depotId`/`truckId` fields — these live in `UserRole`
4. **Critical**: Every `User` MUST have a `StaffUserLink` to an active `Staff` record — enforced at login + creation

## Key Conventions

- All pages use `"use client"` — SPA-style data fetching in useEffect
- Path alias `@/` → `./src/*`
- Mongoose connection singleton in `lib/db.ts`
- Activity logging via `logActivity()` on CRUD endpoints
- Sales POST auto-decrements stock at that location
- Production POST auto-upserts stock at that factory (using `$inc` + `upsert: true`)
- Transfer status transitions: `pending` → `in-transit` → `delivered` (or `cancelled`)
- SVGs imported as React components: `import { PlusIcon } from "@/icons"`
- API polling intervals: 15s for dashboard + stock pages
- Toast notifications for all CRUD actions via `@/lib/toast`
- Type-safety: prefer `Record<string, unknown>` over `Record<string, any>`; use `catch (e: unknown)` + `instanceof Error` checks over `catch (e: any)`
- Theme: use `useState` lazy initializer (`() => localStorage.getItem(...)`) for client-only state instead of `useEffect` to sync from localStorage
- Lint suppressions: add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` inline when `any` is unavoidable (e.g., jsvectormap d.ts, populateLocation helpers)

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsx scripts/seed.ts` | Seed database (clears all, creates admin only) |

## Docker

- `docker-compose up` — Starts app + MongoDB 7
- Dockerfile uses `node:20-alpine` with standalone output

## Environment Variables

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Secret for JWT signing

## Tailwind CSS v4 Notes

- **No `tailwind.config.*` file** — all config is CSS-based via `@theme` block in `globals.css`
- Uses `@import "tailwindcss"` at the top of `globals.css`
- Custom color palettes defined: `brand`, `gray`, `blue-light`, `success`, `error`, `warning`, `orange`, `theme-pink`, `theme-purple`
- Standard Tailwind colors (green, blue, red, purple, indigo, teal, cyan, pink, violet, emerald, yellow, amber, sky) are **explicitly overridden with hex values** in `@theme` for html2canvas compatibility
- **Known issue:** html2canvas cannot parse `oklab()` color function (Tailwind v4 default). The fix is to define colors with hex values in `@theme`.
- Opacity modifiers (`/10`, `/[0.12]`) use `color-mix(in srgb, ...)` when base colors are hex values — compatible with html2canvas

## Known Issues & Gotchas

### Pre-existing TS Errors (untracked new files — NOT caused by recent fixes)
- `payment-transactions/page.tsx` — `useSearchParams` type mismatch
- `pos-devices/page.tsx` — `required` prop missing from `InputProps`
- `PaymentMethodChart.tsx` — ApexCharts formatter type mismatch

### Crash Safety Defensive Patterns
These were fixed across the codebase. Always use these patterns in new code:
- `(thing ?? 0).toLocaleString()` instead of `thing.toLocaleString()`
- `(thing ?? "").slice(-6)` instead of `thing.slice(-6)`
- `thing?.toString() ?? ""` instead of `thing.toString()`
- `Array.isArray(a?.things) ? a.things : []` before calling `.reduce()` / `.map()`

### Reports / html2canvas
- **`color-mix(in oklab, ...)` crash (CRITICAL):** Tailwind v4 generates `color-mix(in oklab, var(--color-X), N%, transparent)` for ALL opacity modifier classes (e.g., `bg-blue-500/10`, `dark:text-white/90`). html2canvas v1.4.x cannot parse `oklab` as a color interpolation method in `color-mix()`. The fix is in `reports/page.tsx` — the `onclone` callback injects a `<style>` block with explicit `rgba()` overrides for every `dark:bg-*/N`, `dark:border-*/N`, and `dark:text-white/90` class used in the report. **If you add new dark-mode opacity modifier classes to the report, add corresponding overrides in that `onclone` block.**
- **Standard `oklab()` color function crash:** html2canvas v1.4.x also does not support the CSS `oklab()` color function for direct color values. Always define colors as hex values in `@theme` block. All standard Tailwind v4 color families (red, green, blue, purple, etc.) must have hex overrides for every shade used — otherwise Tailwind's default falls back to `oklab()`.
- Dynamic Tailwind classes (e.g., `bg-${color}-50`) **do not work** with Tailwind v4 JIT. Use static class lookup objects instead.
### Stock Page

- `setDateError` on line 293 was a call to a nonexistent setter (removed). Date validation is derived from `startDate` / `endDate` state values.

### Transfers Page
- `confirmDelivered` function expects a `Transfer` argument. `onClick` must wrap it: `onClick={() => confirmDelivered(spoilageTarget)}`

### Analysis API
- Role-based filtering was missing on stock aggregation (fixed). Factory/depot managers now see only their own location's stock in analysis.

## SVG Icons (`src/icons/index.tsx`)

Exports: DownloadIcon, BellIcon, MoreDotIcon, FileIcon, GridIcon, AudioIcon, VideoIcon, BoltIcon, PlusIcon, BoxIcon, CloseIcon, CheckCircleIcon, AlertIcon, InfoIcon, ErrorIcon, ArrowUpIcon, FolderIcon, ArrowDownIcon, ArrowRightIcon, GroupIcon, BoxIconLine, ShootingStarIcon, DollarLineIcon, TrashBinIcon, AngleUpIcon, AngleDownIcon, PencilIcon, CheckLineIcon, CloseLineIcon, ChevronDownIcon, PaperPlaneIcon, EnvelopeIcon, LockIcon, UserIcon, CalenderIcon, EyeIcon, EyeCloseIcon, TimeIcon, CopyIcon, ChevronLeftIcon, ChevronRightIcon, UserCircleIcon, ListIcon, TableIcon, PageIcon, TaskIcon, PieChartIcon, BoxCubeIcon, PlugInIcon, DocsIcon, MailIcon, HorizontaLDots, ChevronUpIcon, ChatIcon

Plus custom entity icons in `@/components/icons/EntityIcons`: WaterDropIcon, TruckIcon, FactoryIcon

## Seed Script (`scripts/seed.ts`)

Clears ALL 42 collections. Creates admin user + admin `UserRole`.

Workflow from empty state:
1. Create Factories → Depots → Trucks → Products (via UI)
2. Assign Staff via StaffAssignment + DriverAssignment
3. Record Production (auto-creates Stock)
4. Transfer stock between locations
5. Record Sales (auto-decrements Stock)
6. Record Costs

## Completed Features (Session: May 2026)

The following were delivered as part of commit `8d4ed81` (feat: complete WIP features):

| Feature | Details |
|---------|---------|
| Wastage Tracking | Model, API routes (`GET`, `POST`), management page, dashboard integration |
| Disputes System | Model, API routes, management page, `AdminEditButton` reusable component |
| POS Devices | Model (`PosDevice`), API routes, device management page |
| Payment Transactions | Model (`PaymentTransaction`), API routes, manual entry, auto-convert-to-sale |
| Webhooks | API routes for Moniepoint, OPay, PalmPay integration |
| Driver Portal | Dashboard with assigned truck inventory & transfer actions |
| Settings Page | Factory-reset capability, system configuration |
| Onboarding Wizard | 10-step getting-started flow with localStorage progress tracking |
| Change Password | API route + profile page integration |
| Stock Stats | Aggregation API across 6 collections (`GET /api/stock/stats`) |
| Sales Stats | API route (`GET /api/sales/stats`) |
| Command Palette | Cmd+K palette wired into app header |
| Toast Notifications | `react-hot-toast` library integrated across all CRUD operations |
| AutoAmount | UI component for formatted currency display |
| dateFormat | `formatDate()` utility function |
| ConfirmDialog | Reusable confirmation dialog component |
| RecordCostForm | Inline cost recording form |
| PaymentMethodChart | ApexCharts pie chart for payment method breakdown |
| Dashboard Overhaul | Role-based cards, payment chart, wastage stats, stock overview |
| Sidebar Update | Added links for Wastage, POS Devices, POS Transactions, Disputes, Driver Portal, Activity Log, Getting Started, Settings |

## Email Service — Planned Integration

### Purpose
Transactional emails for staff invitations and password resets, with branded templates matching Verri P Water's identity.

### Provider Options (Free Tier)

| Provider | Free Tier | SMTP | API | Notes |
|----------|-----------|------|-----|-------|
| **Zoho Mail** (you have `admin@verrip.com.ng`) | Free 5 users, 5GB/user, SMTP relay | ✅ | ✅ Zoho API | Already have domain; SMTP: `smtp.zoho.com` port 587 |
| **Resend** | 100 emails/day, 3000/mo | ❌ | ✅ REST API | Best DX, React Email templates |
| **Brevo (Sendinblue)** | 300 emails/day | ✅ | ✅ | SMTP: `smtp-relay.brevo.com` port 587; good limits |
| **SendGrid** | 100 emails/day | ✅ | ✅ | SMTP: `smtp.sendgrid.net` port 587; mature but low limit |
| **Mailgun** | 100 emails/day (first 3 mo: 5000/mo) | ✅ | ✅ | SMTP: `smtp.mailgun.org` port 587 |

**Recommendation for Verri P:** Zoho SMTP relay is the simplest given you already own the domain and have a mailbox. If Zoho's SMTP relay proves unreliable for transactional volume, **Brevo** (300/day free) is the best fallback.

### Email Use Cases

#### 1. Staff Invitation
Triggered when an admin creates a User record with `staffEmail` or when a new user account is created.
- **To:** the invited staff member's email
- **Link:** `https://app.verripwater.com/auth/set-password?token=<JWT>`
- **Token:** JWT signed with `JWT_SECRET`, 48-hour expiry, embedded with `userId` and `type: "invite"`
- **Flow:** Create User (isActive: false) → Send invite email → User clicks link → Set password → User activated

#### 2. Password Reset
Triggered from the sign-in page "Forgot Password?" link.
- **To:** the user's email (lookup by email in User model)
- **Link:** `https://app.verripwater.com/auth/reset-password?token=<JWT>`
- **Token:** JWT signed with `JWT_SECRET`, 1-hour expiry, embedded with `userId` and `type: "reset"`
- **Flow:** User enters email → If exists, send reset email → User clicks link → Enter new password → Password updated

### API Architecture

**New files needed:**
```
src/
├── lib/
│   ├── email.ts              # Email client (SMTP or Resend), send() wrapper
│   └── emailTemplates.ts     # Branded HTML templates
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── invite/route.ts       # POST — send invite, create user
│   │   │   ├── forgot-password/route.ts  # POST — send reset email
│   │   │   ├── reset-password/route.ts   # POST — verify token + update password
│   │   │   └── set-password/route.ts     # POST — verify invite token + set password
│   │   └── ...
│   └── (full-width-pages)/
│       ├── set-password/page.tsx     # Set password form (invite flow)
│       └── reset-password/page.tsx   # Reset password form
```

**Existing files to modify:**
- `src/lib/auth.ts` — add `createInviteToken()`, `createResetToken()`, `verifyEmailToken()`
- `src/app/(admin)/users/new/page.tsx` — trigger invite email after user creation

### Email Sender Implementation (`lib/email.ts`)

Two possible implementations:

**Option A — Nodemailer + SMTP (works with any provider):**
```typescript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // e.g. smtp.zoho.com
  port: Number(process.env.SMTP_PORT), // 587
  secure: false,                      // true for 465
  auth: {
    user: process.env.SMTP_USER,      // admin@verrip.com.ng
    pass: process.env.SMTP_PASS,      // app-specific password
  },
});

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  await transporter.sendMail({
    from: `"Verri P Water" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}
```

**Option B — Resend API (simpler, better deliverability):**
```typescript
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  await resend.emails.send({
    from: "Verri P Water <noreply@verrip.com.ng>",
    to,
    subject,
    html,
  });
}
```

### Branded Email Templates (`lib/emailTemplates.ts`)

Design spec:
- **Header:** Verri P Water logo (SVG inline or base64-encoded to avoid external image loading issues)
- **Primary Color:** Brand hex from `@theme` (currently the `brand` palette in globals.css)
- **Font:** Outfit (matching the app font) — use `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap')` in the email `<head>`
- **Background:** `#F9FAFB` (body), white card body
- **Footer:** "Verri P Water Inc — 100% Pure & Safe Drinking Water. Nigeria." with unsubscribe link if applicable

Template structure:
```typescript
export function inviteEmail({ name, link }: { name: string; link: string }): string { /* HTML */ }
export function resetPasswordEmail({ name, link }: { name: string; link: string }): string { /* HTML */ }
export function welcomeEmail({ name }: { name: string }): string { /* HTML */ }
```

HTML template skeleton:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
    body { font-family: 'Outfit', Arial, sans-serif; background: #F9FAFB; margin: 0; padding: 0; }
    .container { max-width: 480px; margin: 0 auto; padding: 24px; }
    .card { background: #FFFFFF; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo img { height: 48px; }
    .btn { display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    .btn-primary { background: #465FFF; color: #FFFFFF; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><!-- Verri P Water logo SVG/IMG --></div>
    <div class="card">
      <h2 style="margin:0 0 8px; font-size:18px; color:#1F2937;">{{title}}</h2>
      <p style="color:#6B7280; font-size:14px; line-height:1.6;">{{body}}</p>
      <div style="text-align:center; margin:24px 0;">
        <a href="{{link}}" class="btn btn-primary">{{cta}}</a>
      </div>
    </div>
    <div class="footer">
      Verri P Water Inc &bull; Nigeria<br>
      <a href="mailto:support@verrip.com.ng" style="color:#465FFF;">support@verrip.com.ng</a>
    </div>
  </div>
</body>
</html>
```

### Environment Variables (New)

```
# SMTP (use with Zoho or any SMTP)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=587
SMTP_USER=admin@verrip.com.ng
SMTP_PASS=<app-password-from-zoho>

# OR Resend
RESEND_API_KEY=re_xxxxx

# Email
EMAIL_FROM="Verri P Water <noreply@verrip.com.ng>"
APP_URL=https://app.verripwater.com
```

### Implementation Notes

- **Passwordless invite:** The invite link lets them set their own password — no temporary password generation needed
- **Rate limiting:** Add a cooldown (60s) on forgot-password to prevent abuse
- **Logging:** Log all outgoing emails in the Activity Log with type `email_invite` or `email_reset`
- **Docker:** If using SMTP, no extra services needed. If using Resend, npm package is lightweight
- **Token cleanup:** Expired tokens can be silently ignored (the verify route simply returns "link expired")
- **Email branding consistency:** Use the same `brand-500` hex (`#465FFF`) that the app uses for buttons and links
- **Dark mode:** Email templates should NOT use dark mode — most email clients strip `<meta name="color-scheme">`. Use light-only colors with high contrast ratios.
- Replaced `Record<string, any>` with `Record<string, unknown>` across 15 files
- Replaced `catch (e: any)` with `catch (e: unknown)` + `instanceof Error` across 5 files
- Refactored `ThemeContext` to use lazy `useState` init (no more `useEffect` flash)
- Removed unused `useEffect` import from onboarding page
- Added eslint-disable comments where `any` is unavoidable
- Fixed filter/type annotations in analysis, costs, depots, disputes, factories, transfers, wastage APIs
- Fixed `getScopeFilter` return type, `logActivity` metadata type, `ActivityLog` model type
