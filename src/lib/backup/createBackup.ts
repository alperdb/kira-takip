import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

function getDbPath(): string {
  // ELECTRON_DB_PATH is set by electron/main.js — always correct in packaged builds
  if (process.env.ELECTRON_DB_PATH) return process.env.ELECTRON_DB_PATH;
  const url = process.env.DATABASE_URL ?? '';
  const filePath = url.replace(/^file:/, '');
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function buildFilename(): string {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const hh   = String(now.getHours()).padStart(2, '0');
  const min  = String(now.getMinutes()).padStart(2, '0');
  return `kiratakip-backup-${yyyy}-${mm}-${dd}-${hh}${min}.db`;
}

export async function createBackup(): Promise<{ data: Buffer; filename: string }> {
  const dbPath = getDbPath();

  if (!fs.existsSync(dbPath)) {
    throw new Error('Veritabanı dosyası bulunamadı');
  }

  // Flush WAL to main DB file before copying.
  // Must use $queryRawUnsafe — PRAGMA wal_checkpoint returns result rows,
  // which $executeRawUnsafe rejects in SQLite.
  await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL)');

  const data     = fs.readFileSync(dbPath);
  const filename = buildFilename();

  // Save a server-side copy to /backups (best-effort — may fail in packaged app)
  try {
    const backupsDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(backupsDir, filename), data);
  } catch {
    // Ignore — client download is unaffected by server-side copy failure
  }

  return { data, filename };
}
