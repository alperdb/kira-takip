# KiraTakip — Claude Code Instructions

## Project

Desktop rental management app. Stack: Next.js 16 (App Router) + Prisma + SQLite + Electron.

Domain: Owner → Property → Unit → Tenant → Contract → RentCharge → Payment

### Turkish UI term → code model mapping

| UI label      | Prisma model / field        |
|---------------|-----------------------------|
| Mülk Sahibi   | `Owner`                     |
| Bina          | `Property` (`title` field, not `name`) |
| Daire         | `Unit`                      |
| Kiracı        | `Tenant`                    |
| Sözleşme      | `Contract` (`paymentDay` field, not `paymentDayOfMonth`) |
| Alacak        | `RentCharge`                |
| Ödeme         | `Payment`                   |

## Auto-proceed (no confirmation needed)

Proceed without asking for these actions:
- Editing any source file in `src/`, `electron/`, `prisma/`, `public/`
- Creating or deleting files in the project directory
- Cleaning `dist/`, `.next/`, build artifacts
- Running build commands (`npm run build`, `npm run electron:build:win`, etc.)
- Updating `package.json`, `next.config.ts`, `tsconfig.json`, `.env`, `.gitignore`
- Creating or updating `README.md`, `LICENSE`, `CLAUDE.md`
- Running tests (`npm test`)

## Ask before acting

- `git push` or uploading to GitHub/remote
- Deleting the SQLite database in `AppData` or `prisma/dev.db`
- Any action affecting files outside this project directory
- Force-pushing or rewriting git history

## Architecture rules

- All business logic lives in API routes (`src/app/api/`)
- Do not add cloud auth, remote DB, or external services
- Keep Prisma schema changes backward-compatible; never drop columns without migration
- `asar: false` must stay in `package.json` (Prisma binary cannot execute inside asar)

## Next.js rules (Next.js 16 / App Router)

- Every server-component page that queries the DB **must** export `export const dynamic = 'force-dynamic'` at the top — otherwise Next.js pre-renders it at build time against an empty DB and the production app always shows empty data.
- `params` and `searchParams` in page components are **Promises** — always `await` them:
  ```ts
  export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
  }
  ```
- `TableSkeleton` is self-contained (includes its own `<table>` wrapper) — do not wrap it in `<table><tbody>` manually.

## Dev vs production

- `devSeedDefaultAdmin()` in `login/route.ts` is intentional — dev convenience only
- It is compiled out in production builds (Next.js replaces `NODE_ENV` at build time)
- Do not remove the `NODE_ENV !== 'production'` guard
- Dev DB: `prisma/dev.db` — Production DB: `AppData/Roaming/kira-app/kira-takip/kira.db`
