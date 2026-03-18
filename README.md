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
npm run electron:build:win     # build only (no GitHub upload)
```

On first launch the app creates the SQLite database automatically and prompts for initial setup (admin password + office info).

### Publishing a Release

1. Set version in `package.json` (e.g. `1.1.0`)
2. Create `.env.release` in the project root (never committed):
   ```
   GITHUB_TOKEN=your_personal_access_token
   ```
3. Run:
   ```bash
   npm run release
   ```
   This builds the app, creates `dist/KiraTakip-v{version}-portable.zip`, and publishes it to GitHub Releases automatically.

The GitHub token needs `repo` scope. Create one at: https://github.com/settings/tokens

### Installing from a Release (Windows)

1. Go to the [Releases](../../releases) page
2. Download `KiraTakip-v*-portable.zip`
3. Extract the ZIP to any folder
4. Run `Kira Takip.exe`

No installation required. Data is stored locally in `AppData\Roaming\Kira Takip\`.
On first launch the app will ask you to create an admin password.

## Notes

- Each installation creates its own local database
- No test data is included by default
- Designed for local/offline usage

## Status

Initial public release (v1.0)

## License

MIT — see [LICENSE](./LICENSE).
