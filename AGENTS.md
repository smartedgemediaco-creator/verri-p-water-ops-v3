# Water-Ops v3 — AGENTS.md

## Project Overview

**Verri P Water Inc Operations Management System** — a full-featured ERP-style dashboard for a Nigerian sachet/bottle water company. Built with Next.js 16 + React 19 + TypeScript + MongoDB + Tailwind CSS v4.

Manages the entire supply chain: factories → depots → trucks → inventory → transfers → sales → costs.

## Key Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, standalone output) |
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

## Project Structure

```
src/
├── app/
│   ├── (admin)/          # Protected routes with sidebar layout
│   ├── (full-width-pages)/ # Public routes (signin, signup, 404)
│   └── api/              # 15 endpoint groups (auth, factories, depots, trucks, products, inventory, sales, costs, transfers, analysis, dashboard/charts, activity, notifications, users, import/products)
├── components/           # Domain components (charts, form, tables, ui, etc.)
├── context/              # AuthContext, SidebarContext, ThemeContext
├── hooks/                # useGoBack, useModal
├── icons/                # ~57 SVG components
├── layout/               # AppHeader, AppSidebar, Backdrop, SidebarWidget
└── lib/                  # db.ts, auth.ts, logActivity.ts, models/ (11 Mongoose models)
```

## Routing

| Route | Page |
|-------|------|
| `/` | Dashboard |
| `/signin`, `/signup` | Auth |
| `/factories`, `/depots`, `/trucks`, `/products` | CRUD lists + new/edit |
| `/inventory` | Stock levels |
| `/sales`, `/costs` | Transactions + new |
| `/transfers` | Transfers + new |
| `/analysis` | Business analysis |
| `/reports` | PDF report generation |
| `/notifications` | Low stock + in-transit alerts |
| `/activity` | Audit log |
| `/users` | User management |
| `/calendar`, `/profile`, `/blank` | Misc pages |

## Auth

- JWT in httpOnly cookie, 7-day expiry
- Admin layout guards unauthenticated access
- Roles: admin, factory-manager, depot-manager, driver
- Seed user: `admin@verripwater.com` / `admin123`

## Key Conventions

- All pages use `"use client"` — SPA-style data fetching in useEffect
- Path alias `@/` → `./src/*`
- Mongoose connection singleton in `lib/db.ts`
- Activity logging via `logActivity()` on CRUD endpoints
- Sales POST auto-decrements inventory
- SVGs imported as React components: `import { PlusIcon } from "@/icons"`

## Commands

- `npm run dev` — Dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npx tsx scripts/seed.ts` — Seed database

## Docker

- `docker-compose up` — Starts app + MongoDB 7
- Dockerfile uses `node:20-alpine` with standalone output

## Environment Variables

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Secret for JWT signing
