<div align="center">
  <img src="./public/images/logo/logo.svg" alt="Verri P Water" />
</div>

<br/>

# Verri P Water Operations Management System

A full-featured ERP-style operations dashboard for Verri P Water Inc — a Nigerian sachet/bottle water company. Built with **Next.js 16**, **React 19**, **TypeScript**, **MongoDB**, and **Tailwind CSS v4**.

Manages the entire supply chain: factories → depots → trucks → inventory → transfers → sales → costs.

## Overview

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router, standalone output) |
| UI | React 19, Tailwind CSS v4 |
| Database | MongoDB + Mongoose 9 |
| Auth | JWT (httpOnly cookies) + bcryptjs |
| Charts | ApexCharts + react-apexcharts |
| Calendar | FullCalendar |
| PDF Reports | html2canvas + jsPDF |
| Docker | Multi-stage build + docker-compose (app + MongoDB 7) |

## Features

- **Dashboard** — aggregated metrics, revenue/cost charts, business advice, production recording
- **Factories** — CRUD management with capacity tracking
- **Depots** — CRUD management with location and manager tracking
- **Trucks** — CRUD management with assignment to factories/depots
- **Products** — CRUD with bulk import (sachet/bottle categories)
- **Inventory** — stock levels per product per location
- **Sales** — record sales with auto-inventory deduction, filter by product/customer/date, PDF export
- **Costs** — 6 categories (production, transport, maintenance, salary, utility, other)
- **Transfers** — 4-state workflow (pending → in-transit → delivered/cancelled)
- **Production** — record batches with auto-inventory increment
- **Activity Log** — comprehensive audit trail with entity/action/product/date filters, expandable detail
- **Reports** — domain-specific PDF reports with scope/product/date filters
- **Notifications** — low-stock alerts + in-transit transfer alerts
- **Users** — admin-only user management with 4 roles
- **Analysis** — admin-only business analysis view

## Role-Based Access

| Role | Scoped To |
|------|-----------|
| admin | Full access |
| factory-manager | Own factory data only |
| depot-manager | Own depot data only |
| driver | Limited view |

## Getting Started

### Prerequisites

- Node.js 20.x or later
- MongoDB instance (local or Atlas)

### Installation

```bash
git clone https://github.com/smartedgemediaco-creator/verri-p-water-ops-v3.git
cd verri-p-water-ops-v3
npm install
```

### Environment Variables

Create `.env.local`:

```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

### Seed Database (optional)

```bash
npx tsx scripts/seed.ts
```

### Reset Database (keeps admin user)

```bash
npx tsx scripts/reset.ts
```

### Start Dev Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Docker

```bash
docker-compose up
```

## Default Login

- **Email:** `admin@verrip.com.ng`
- **Password:** `admin123`

## License

MIT
