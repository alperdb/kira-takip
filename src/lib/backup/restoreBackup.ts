import { getUserDb, getUserDbPath } from '@/lib/user-db';
import fs from 'fs';

const SQLITE_MAGIC = Buffer.from('SQLite format 3\x00');

export function isValidSQLite(buf: Buffer): boolean {
  if (buf.length < 16) return false;
  return buf.subarray(0, 16).equals(SQLITE_MAGIC);
}

export async function restoreBackup(userId: number, buffer: Buffer): Promise<void> {
  if (!isValidSQLite(buffer)) {
    throw new Error('Geçersiz yedek dosyası. Lütfen geçerli bir Kira Takip yedeği seçin.');
  }

  const dbPath    = getUserDbPath(userId);
  const oldBackup = dbPath + '.pre-restore';

  // Save a safety copy of current DB before overwriting
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, oldBackup);
  }

  try {
    // Disconnect per-user Prisma client so the DB file is not locked
    const db = getUserDb(userId);
    await db.$disconnect();

    // Clear per-user singleton from globalThis so it reconnects on next use
    const g = globalThis as { userDbs?: Map<number, unknown> };
    g.userDbs?.delete(userId);

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
