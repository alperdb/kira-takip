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
npm run electron:dev           # run in Electron (dev mode)
npm run electron:build:win     # Windows installer → dist/Kira Takip-*-Setup.exe   (run on Windows)
npm run electron:build:mac     # macOS DMG → dist/Kira Takip-*-x64.dmg / *-arm64.dmg  (run on macOS)
```

On first launch the app creates the SQLite database automatically and prompts for initial setup (admin password + office info).

### Installing from a Release

**Windows**
1. Download `Kira Takip-*-Setup.exe` from the Releases page
2. Run the installer — no admin rights required if installing to a user directory
3. Launch **Kira Takip** from the Start Menu or Desktop shortcut

**macOS**
1. Download `Kira Takip-*-arm64.dmg` (Apple Silicon) or `*-x64.dmg` (Intel) from the Releases page
2. Open the DMG and drag **Kira Takip** to your Applications folder
3. On first launch: right-click → Open to bypass Gatekeeper (unsigned build)

## Notes

- Each installation creates its own local database
- No test data is included by default
- Designed for local/offline usage

## Status

Initial public release (v1.0)

## License

MIT — see [LICENSE](./LICENSE).
