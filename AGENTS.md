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
│   │   ├── costs/, depots/, factories/, inventory/, notifications/
│   │   ├── products/, profile/, reports/, sales/, transfers/
│   │   ├── trucks/, users/, activity/, analysis/
│   │   ├── calendar/, blank/
│   │   ├── payment-transactions/  # NEW — untracked, WIP
│   │   └── pos-devices/          # NEW — untracked, WIP
│   ├── (full-width-pages)/       # Public routes (signin, signup, 404)
│   └── api/
│       ├── analysis/             # Business analysis aggregation
│       ├── auth/                 # login, register, me, change-password
│       ├── costs/                # CRUD
│       ├── dashboard/charts/     # Sales/cost aggregation charts
│       ├── depots/               # CRUD + [id]
│       ├── factories/            # CRUD + [id]
│       ├── import/products/      # Bulk product import
│       ├── inventory/            # CRUD + [id]/activity + stats/
│       ├── notifications/        # Low stock + in-transit alerts
│       ├── payment-transactions/ # NEW — untracked, WIP
│       ├── pos-devices/          # NEW — untracked, WIP
│       ├── production/           # POST only (creates production + upserts inventory)
│       ├── products/             # CRUD + [id]
│       ├── sales/                # CRUD + [id] + stats/ (WIP)
│       ├── transfers/            # CRUD + [id] (status updates)
│       ├── trucks/               # CRUD + [id]
│       ├── users/                # CRUD
│       ├── wastage/              # NEW — WIP
│       └── webhooks/             # NEW — untracked, WIP
├── components/
│   ├── auth/                    # SignInForm
│   ├── business/                # BusinessAdviceCard
│   ├── charts/                  # ProductionForm, RecordCostForm, PaymentMethodChart (WIP)
│   ├── common/                  # PageBreadCrumb
│   ├── form/                    # date-picker, Select, input/*, etc.
│   ├── icons/                   # EntityIcons (WaterDrop, Truck, Factory)
│   ├── ui/                      # table, button, badge, AutoAmount (NEW)
│   └── user-profile/            # ChangePasswordCard (NEW)
├── context/                     # AuthContext, SidebarContext, ThemeContext
├── hooks/                       # useGoBack, useModal
├── icons/                       # ~58 SVG components (chevron-right added)
├── layout/                      # AppHeader, AppSidebar, Backdrop, SidebarWidget
└── lib/
    ├── auth.ts                  # hashPassword, getUserFromRequest
    ├── dateFormat.ts            # formatDate utility (NEW)
    ├── db.ts                    # MongoDB connection singleton
    ├── logActivity.ts           # Activity logging helper
    ├── toast.tsx                # Toast notification helpers (NEW)
    └── models/
        ├── index.ts             # Re-exports all models
        ├── ActivityLog.ts       # Audit trail
        ├── Cost.ts              # Expense records
        ├── Depot.ts             # Distribution depots
        ├── Factory.ts           # Production factories
        ├── Inventory.ts         # Stock levels per location+product
        ├── PaymentTransaction.ts # NEW — POS transaction matching
        ├── PosDevice.ts         # NEW — POS terminal registry
        ├── Product.ts           # Product catalog
        ├── Production.ts        # Production batch records
        ├── Sale.ts              # Sales transactions
        ├── Transfer.ts          # Stock transfers between locations
        ├── Truck.ts             # Delivery trucks
        ├── User.ts              # User accounts
        └── Wastage.ts           # NEW — Spoilage/wastage tracking
```

## Data Model Relationships

```
Production ──factoryId──→ Factory
Production ──productId──→ Product
(Production POST also upserts Inventory for that factory+product)

Inventory ──locationType + locationId──→ Factory | Depot | Truck (refPath)
Inventory ──productId──→ Product

Sale ──locationType + locationId──→ Factory | Depot
Sale ──productId──→ Product
(Sale POST auto-decrements Inventory at that location)

Transfer ──fromType+fromId──→ Factory | Depot
Transfer ──toType+toId──────→ Factory | Depot
Transfer ──truckId──────────→ Truck
Transfer ──productId────────→ Product

Cost ──locationType + locationId──→ Factory | Depot

Wastage ──locationType + locationId──→ Factory | Depot | Truck
Wastage ──source: production|transfer|sale|storage|other

PaymentTransaction ──posDeviceId──→ PosDevice
PaymentTransaction ──saleId────────→ Sale
```

## Inventory Stats — Data Flow

`GET /api/inventory/stats` aggregates across **6 collections:**

| Stat | Source | Aggregation |
|------|--------|-------------|
| `totalProduced` | Production | Sum of all `quantity` |
| `totalSold` | Sale | Sum of all `quantity` |
| `totalAvailable` | Inventory | Sum of all `quantity` |
| `factoryStock` | Inventory | Sum where `locationType="factory"` |
| `depotStock` | Inventory | Sum where `locationType="depot"` |
| `truckStock` | Inventory | Sum where `locationType="truck"` |
| `locationCount` | Inventory | Distinct `(locationType, locationId)` pairs |
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
| `/` | Dashboard | Polls `/api/analysis` + `/api/inventory/stats` every 15s |
| `/signin`, `/signup` | Auth | signup deleted; signin only |
| `/factories` | Factory list + CRUD | |
| `/depots` | Depot list + CRUD | |
| `/trucks` | Truck list + CRUD | |
| `/products` | Product list + CRUD + import | |
| `/inventory` | Stock levels + activity drills | Polls every 15s |
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
- Admin layout guards unauthenticated access
- Roles: **admin**, **factory-manager**, **depot-manager**, **driver**
- Seed user: `admin@verripwater.com` / `admin123`
- Seed script (`scripts/seed.ts`) clears ALL collections and creates only the admin user

## Key Conventions

- All pages use `"use client"` — SPA-style data fetching in useEffect
- Path alias `@/` → `./src/*`
- Mongoose connection singleton in `lib/db.ts`
- Activity logging via `logActivity()` on CRUD endpoints
- Sales POST auto-decrements inventory at that location
- Production POST auto-upserts inventory at that factory (using `$inc` + `upsert: true`)
- Transfer status transitions: `pending` → `in-transit` → `delivered` (or `cancelled`)
- SVGs imported as React components: `import { PlusIcon } from "@/icons"`
- API polling intervals: 15s for dashboard + inventory pages
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

### Inventory Page
- `setDateError` on line 293 was a call to a nonexistent setter (removed). Date validation is derived from `startDate` / `endDate` state values.

### Transfers Page
- `confirmDelivered` function expects a `Transfer` argument. `onClick` must wrap it: `onClick={() => confirmDelivered(spoilageTarget)}`

### Analysis API
- Role-based filtering was missing on inventory aggregation (fixed). Factory/depot managers now see only their own location's inventory in analysis.

## SVG Icons (`src/icons/index.tsx`)

Exports: DownloadIcon, BellIcon, MoreDotIcon, FileIcon, GridIcon, AudioIcon, VideoIcon, BoltIcon, PlusIcon, BoxIcon, CloseIcon, CheckCircleIcon, AlertIcon, InfoIcon, ErrorIcon, ArrowUpIcon, FolderIcon, ArrowDownIcon, ArrowRightIcon, GroupIcon, BoxIconLine, ShootingStarIcon, DollarLineIcon, TrashBinIcon, AngleUpIcon, AngleDownIcon, PencilIcon, CheckLineIcon, CloseLineIcon, ChevronDownIcon, PaperPlaneIcon, EnvelopeIcon, LockIcon, UserIcon, CalenderIcon, EyeIcon, EyeCloseIcon, TimeIcon, CopyIcon, ChevronLeftIcon, ChevronRightIcon, UserCircleIcon, ListIcon, TableIcon, PageIcon, TaskIcon, PieChartIcon, BoxCubeIcon, PlugInIcon, DocsIcon, MailIcon, HorizontaLDots, ChevronUpIcon, ChatIcon

Plus custom entity icons in `@/components/icons/EntityIcons`: WaterDropIcon, TruckIcon, FactoryIcon

## Seed Script (`scripts/seed.ts`)

Clears ALL 12 collections: User, Factory, Depot, Truck, Product, Inventory, Sale, Cost, Transfer, Production, Wastage, ActivityLog, PaymentTransaction, PosDevice

Creates only the admin user. Workflow from empty state:
1. Create Factories → Depots → Trucks → Products (via UI)
2. Record Production (auto-creates Inventory)
3. Transfer stock between locations
4. Record Sales (auto-decrements Inventory)
5. Record Costs

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
| Inventory Stats | Aggregation API across 6 collections (`GET /api/inventory/stats`) |
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

**Cleanup (commit `87eeba1`):**
- Replaced `Record<string, any>` with `Record<string, unknown>` across 15 files
- Replaced `catch (e: any)` with `catch (e: unknown)` + `instanceof Error` across 5 files
- Refactored `ThemeContext` to use lazy `useState` init (no more `useEffect` flash)
- Removed unused `useEffect` import from onboarding page
- Added eslint-disable comments where `any` is unavoidable
- Fixed filter/type annotations in analysis, costs, depots, disputes, factories, transfers, wastage APIs
- Fixed `getScopeFilter` return type, `logActivity` metadata type, `ActivityLog` model type
