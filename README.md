# Kira Takip

**A rental and property management dashboard for Turkish landlords and property managers.**

Kira Takip is a self-hosted web application for managing rental properties end-to-end — from tenant onboarding and contract creation to monthly receivables, payment tracking, and printable contract PDF generation.

---

## Overview

Managing rental properties across multiple buildings involves tracking dozens of tenants, contracts with different terms, monthly charges, and payment histories. Kira Takip consolidates all of this into a single, clean dashboard.

The application follows a structured data model: owners hold properties, properties contain units, units are leased to tenants via contracts, and contracts generate monthly rent charges that tenants pay against.

---

## Key Features

- **Property & Owner Management** — Maintain a registry of property owners, buildings, and individual units with occupancy status.
- **Tenant Management** — Store tenant contact details, ID numbers, and lease history. Each tenant has a dedicated detail page with full payment history.
- **Rental Contract Management** — Create and manage rental agreements with configurable start/end dates, rent amounts, payment day, deposit, and multi-currency support (TRY, USD, EUR, GBP, CHF).
- **Contract PDF Generation** — Generate printable, legally-structured rental contract PDFs from a Turkish-law compliant template. Download and print for signing.
- **Receivable Tracking** — Automatically generate monthly rent charges per active contract. Charges are marked as pending, partial, overdue, or paid.
- **Payment Registration** — Record full or partial payments against charges with date, method (bank/cash/EFT/cheque), reference number, and notes. FIFO distribution across open charges.
- **Payment History** — Per-tenant and per-contract payment history with running balance-after calculations.
- **Dashboard Analytics** — Monthly KPI cards for total receivables, collections, overdue amounts, and occupancy rate. Six-month revenue chart and budget summary.
- **Upcoming Payments Widget** — Contracts with payments due in the next 14 days, color-coded by urgency.
- **Overdue Monitoring** — Real-time list of overdue charges with tenant, unit, days-overdue information, and direct one-click payment recording from the dashboard.
- **Expiring Contracts Widget** — Tracks contracts expiring within 30, 60, or 90 days.
- **Expense Tracking** — Record property-level expenses by category. Monthly totals feed into net income calculations.
- **Financial Reports** — Monthly breakdown of receivables, collections, expenses, and net income with CSV export.
- **CSV Export Suite** — Seven export types: monthly summary, contracts, payments, tenant payment history, property income report, receivables aging analysis, and raw receivables.
- **Contract Renewal** — Renew active contracts directly from the contracts list. Pre-filled modal copies previous terms; updating dates and rent creates a new contract while closing the old one.
- **TCMB Exchange Rates** — Live Turkish Central Bank rates for foreign-currency contracts.
- **Rent Increase Management** — Apply CPI-indexed or manual rent increases with full audit history per contract.
- **Dark Mode** — System-aware theme with manual toggle.

---

## Screenshots

> Screenshots will be added before public release.

### Dashboard

![Dashboard](docs/screenshots/dashboard.png)

### Tenant Management

![Tenants](docs/screenshots/tenants.png)

### Contract Creation

![Contract Creation](docs/screenshots/contract-creation.png)

### Payments

![Payments](docs/screenshots/payments.png)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database ORM | Prisma |
| Database | SQLite (dev) / PostgreSQL (production) |
| Runtime | Node.js 18+ |
| PDF Generation | PDFKit |
| Desktop Shell | Electron |
| Icons | Lucide React |

---

## Installation

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Web Application

```bash
# 1. Clone the repository
git clone https://github.com/alperdb/kira-takip.git
cd kira-takip

# 2. Install dependencies
npm install

# 3. Configure environment
# Create a .env file and set DATABASE_URL (see Environment Variables below)

# 4. Set up the database
npx prisma migrate dev

# 5. Start the development server
npm run dev
# Runs at http://localhost:3001
```

### Environment Variables

Create a `.env` file in the project root:

```env
# SQLite (development)
DATABASE_URL="file:./dev.db"
```

```env
# PostgreSQL (production)
DATABASE_URL="postgresql://user:password@host:5432/kira_takip"
```

> **Note:** Never commit your `.env` file. It is listed in `.gitignore`.

### Desktop Build (Electron)

Kira Takip ships as a self-contained Windows desktop application built with Electron. The packaged `.exe` embeds the Next.js server, Prisma, and SQLite — no external dependencies required.

#### Development mode

Run both commands in separate terminals:

```bash
npm run dev            # Terminal 1: Next.js dev server (port 3001)
npm run electron:dev   # Terminal 2: Electron shell (connects to dev server)
```

#### Production build — Windows portable `.exe`

Prerequisites: Node.js 18+, npm 9+.

```bash
# 1. Build Next.js in standalone mode
npm run build

# 2. Copy static assets into the standalone bundle
node electron/copy-static.js

# 3. Package with electron-builder → output in dist/
npx electron-builder
```

Or run all steps with a single command:

```bash
npm run electron:build
```

The output is placed in `dist/`. On Windows, the default target is a **portable `.exe`** (no installer, runs directly). To change the target, edit the `build.win.target` field in `package.json`.

#### Data persistence

Application data (SQLite database) is stored in the OS user data directory:

| Platform | Path |
|----------|------|
| Windows  | `%APPDATA%\Kira Takip\kira-takip\kira.db` |
| macOS    | `~/Library/Application Support/Kira Takip/kira-takip/kira.db` |
| Linux    | `~/.config/Kira Takip/kira-takip/kira.db` |

The database is created automatically on first launch using `electron/sqlite-schema.sql`. It persists across restarts and app updates.

#### Changing the build target

To produce an NSIS installer instead of a portable exe, change `package.json`:

```json
"win": {
  "target": "nsis",
  "icon": "electron/icon.ico"
}
```

Then re-run `npm run electron:build`.

### Database Commands

```bash
npx prisma migrate dev     # Apply migrations (development)
npx prisma migrate deploy  # Apply migrations (production)
npx prisma studio          # Open interactive database browser
```

---

## Usage Workflow

The typical workflow follows the natural hierarchy of rental management:

1. **Add owners** — Register property owners with contact and identity details.
2. **Create properties** — Add buildings under owners with address and city.
3. **Add units** — Create individual units (apartments, offices) within each property.
4. **Add tenants** — Register tenants with name, phone, national ID, and address.
5. **Create a contract** — Link a tenant to a vacant unit. Set rent amount, start date, payment day, deposit, and currency. Preview the contract data, then download the signed contract as a PDF.
6. **Generate monthly charges** — On the Receivables page, click "Alacak Oluştur" to generate charges for the current month across all active contracts.
7. **Record payments** — When a tenant pays, click "Ödeme Al" on the charge row or the contract detail page. Enter amount, date, method, and optional notes.
8. **Monitor the dashboard** — Track overdue payments, upcoming due dates, expiring contracts, and monthly financials.
9. **Export reports** — Go to Reports to view the monthly breakdown and export CSV for accounting.

---

## Project Structure

```
kira-takip/
├── prisma/
│   └── schema.prisma              # Data model
├── src/
│   ├── app/
│   │   ├── page.tsx               # Dashboard (server component)
│   │   ├── owners/                # Property owner management
│   │   ├── properties/            # Building management
│   │   ├── units/                 # Unit management
│   │   ├── tenants/               # Tenant list + [id] detail page
│   │   ├── contracts/             # Contract list + [id] detail (PDF, increases, renewal)
│   │   ├── charges/               # Receivables and payment recording
│   │   ├── expenses/              # Expense tracking
│   │   ├── reports/               # Financial reports + CSV export
│   │   └── api/                   # REST API routes (Next.js route handlers)
│   │       ├── contracts/         # CRUD, PDF, payment history, expiring
│   │       ├── charges/           # CRUD, payment recording
│   │       ├── tenants/           # CRUD, payment history
│   │       ├── expenses/          # CRUD
│   │       ├── reports/           # Monthly financial aggregation
│   │       └── dashboard/         # KPI data, upcoming payments
│   ├── components/
│   │   ├── dashboard/             # KpiCard, ChartCard, OverdueList, UpcomingPayments, ExpiringContracts
│   │   ├── ui/                    # Design system: Card, Modal, Badge, DataTable, Toast, Form
│   │   ├── PaymentModal.tsx       # Reusable payment recording modal
│   │   └── PaymentHistoryCard.tsx # Reusable payment history display
│   ├── lib/
│   │   ├── charges.ts             # Charge generation, FIFO payment distribution, overdue logic
│   │   ├── contractPdf.ts         # PDF rendering with PDFKit
│   │   ├── templateEngine.ts      # Contract template variable binding
│   │   ├── rentCalc.ts            # Rent increase calculations (TUFE, manual)
│   │   ├── tcmb.ts                # TCMB exchange rate fetcher
│   │   └── format.ts              # Turkish locale formatting utilities
│   └── templates/
│       └── kira_sozlesmesi.txt    # Rental contract template with {{placeholders}}
├── electron/
│   └── main.js                    # Electron main process
└── package.json
```

---

## Data Model

```
Owner
 └── Property (building)
      └── Unit (apartment / office)
           └── Contract (tenant lease)
                ├── RentCharge (monthly receivable)
                │    └── Payment (cash / bank / EFT / cheque)
                ├── ContractIncrease (rent adjustment history)
                └── DepositTransaction (deposit ledger)

Tenant ──────────────────────────────────────────────────┘
Expense (per property, categorised)
ExchangeRate (TCMB daily snapshot)
```

---

## Roadmap

- [ ] Authentication and multi-user support
- [ ] Tenant portal — read-only view of payment history
- [ ] Scheduled monthly charge generation
- [ ] Payment reminder notifications (email / SMS)
- [ ] Bulk rent increase across selected contracts
- [ ] Property document storage
- [ ] Docker Compose deployment setup
- [ ] Mobile layout improvements

---

## Security & Privacy

- **No real customer data is included in this repository.** All data used in development is sample/demo data.
- **Environment variables must not be committed.** Your `.env` file contains database credentials and must remain local.
- **This application is designed for self-hosted, single-user use.** There is currently no authentication layer. Do not expose the application to the public internet without adding one.
- Personal data fields (national ID, phone, address) are stored only in your local or self-hosted database. The only external network request is a read-only call to the TCMB exchange rate API, which contains no personal data.

---

## Project Status

**Active development — core features complete, not yet production-ready for multi-user deployments.**

Implemented and functional:
- Full CRUD for the Owner → Property → Unit → Tenant → Contract hierarchy
- Monthly charge generation and FIFO payment recording
- Contract PDF generation and download (Turkish-law compliant template)
- Contract editing and renewal from the contracts list page
- Payment history per tenant and per contract
- Dashboard KPIs, charts, and monitoring widgets with overdue quick-pay
- Expense tracking and financial reports with 7-type CSV export suite

Not yet implemented: authentication, scheduled jobs, email notifications.

---

## License

This project does not yet have a public license. A license will be specified before the first stable release.

---

*Built for Turkish property management workflows. UI language: Turkish.*
