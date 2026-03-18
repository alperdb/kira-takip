import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const SQLITE_MAGIC = Buffer.from('SQLite format 3\x00');

function getDbPath(): string {
  // ELECTRON_DB_PATH is set by electron/main.js — always correct in packaged builds
  if (process.env.ELECTRON_DB_PATH) return process.env.ELECTRON_DB_PATH;
  const url = process.env.DATABASE_URL ?? '';
  const filePath = url.replace(/^file:/, '');
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

export function isValidSQLite(buf: Buffer): boolean {
  if (buf.length < 16) return false;
  return buf.subarray(0, 16).equals(SQLITE_MAGIC);
}

export async function restoreBackup(buffer: Buffer): Promise<void> {
  if (!isValidSQLite(buffer)) {
    throw new Error('Geçersiz yedek dosyası. Lütfen geçerli bir Kira Takip yedeği seçin.');
  }

  const dbPath    = getDbPath();
  const oldBackup = dbPath + '.pre-restore';

  // Save a safety copy of current DB before overwriting
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, oldBackup);
  }

  try {
    // Disconnect Prisma so the DB file is not locked
    await prisma.$disconnect();

    // Clear the global singleton so it reconnects to the new file on next use
    const g = globalThis as { prisma?: unknown };
    delete g.prisma;

    // Write the restored database
    fs.writeFileSync(dbPath, buffer);

    // Remove WAL and SHM leftover files (they belong to old DB)
    for (const ext of ['-wal', '-shm']) {
      const f = dbPath + ext;
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }

    // Clean up safety copy
    if (fs.existsSync(oldBackup)) fs.unlinkSync(oldBackup);
  } catch (writeErr: unknown) {
    // Attempt rollback to safety copy
    if (fs.existsSync(oldBackup)) {
      try { fs.copyFileSync(oldBackup, dbPath); } catch { /* ignore */ }
    }
    throw writeErr;
  }
}
