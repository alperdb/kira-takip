# Kira Takip

Rental and property management application for Turkish landlords.

## Features

- **Properties & Units** — manage multiple buildings and individual units
- **Tenants & Contracts** — track lease agreements, renewals, and terminations
- **Rent Charges & Payments** — generate monthly charges, record payments, monitor overdue accounts
- **Expenses** — log property expenses and track net income
- **Reports** — monthly summaries, building income, tenant balances, overdue analysis, payment history
- **CSV Export** — Excel-compatible exports for all financial data (UTF-8 BOM, semicolon delimiter)
- **PDF Contracts** — generate signed-ready rental contract PDFs from templates
- **Exchange Rates** — live TCMB (Turkish Central Bank) rates for multi-currency rent
- **Dashboard** — KPIs, collection rate, occupancy, 6-month trend charts

## Stack

- **Next.js 14** (App Router) + **React 19**
- **Prisma** ORM + **SQLite** database
- **Electron** for desktop packaging (Windows / macOS)
- **Recharts** for charts, **PDFKit** for PDF generation

## Usage

### Web (development)

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev        # http://localhost:3001
```

### Desktop (Electron)

```bash
npm run electron:dev          # development
npm run electron:build        # production build → dist/
```

On first launch the app creates the SQLite database automatically and prompts for initial setup (admin password + office info).

## Database

The database file is stored in the OS user data directory (`app.getPath('userData')`), not in the project folder. It is never committed to the repository.

## License

MIT — see [LICENSE](./LICENSE).
