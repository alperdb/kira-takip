# KiraTakip

Desktop property and rent management application built for real estate offices and individual property owners managing multiple rental units.

## Features

- Property, building, and unit management
- Tenant management
- Contract lifecycle tracking
- Receivable and payment tracking
- Financial summaries and dashboard KPIs
- CSV export (Excel-friendly)
- Contract PDF generation
- Global search (⌘K)
- Tenant financial timeline
- Payment reliability indicator

## Tech Stack

- Next.js (App Router)
- Electron (Desktop)
- SQLite (local persistent database)

## Highlights

- Clean SaaS-style UI (Apple/Linear inspired)
- Fully local data storage (no cloud dependency)
- Consistent financial formatting (TRY)
- Production-ready export system (CSV + PDF)
- Stable desktop behavior with persistent database

## Usage

### Development

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev        # http://localhost:3001
```

### Desktop Build

```bash
npm run electron:dev          # run in Electron (dev)
npm run electron:build        # production build → dist/
```

On first launch the app creates the SQLite database automatically and prompts for initial setup (admin password + office info).

## Notes

- Each installation creates its own local database
- No test data is included by default
- Designed for local/offline usage

## Status

Initial public release (v1.0)

## License

MIT — see [LICENSE](./LICENSE).
