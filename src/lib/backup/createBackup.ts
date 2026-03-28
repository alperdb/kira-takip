import { getUserDb, getUserDbPath } from '@/lib/user-db';
import fs from 'fs';
import path from 'path';

function buildFilename(userId: number): string {
  const now  = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  const hh   = String(now.getHours()).padStart(2, '0');
  const min  = String(now.getMinutes()).padStart(2, '0');
  return `kiratakip-user${userId}-backup-${yyyy}-${mm}-${dd}-${hh}${min}.db`;
}

export async function createBackup(userId: number): Promise<{ data: Buffer; filename: string }> {
  const dbPath = getUserDbPath(userId);

  if (!fs.existsSync(dbPath)) {
    throw new Error('Veritabanı dosyası bulunamadı');
  }

  // Flush WAL to main DB file before copying.
  const db = getUserDb(userId);
  await db.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL)');

  const data     = fs.readFileSync(dbPath);
  const filename = buildFilename(userId);

  // Save a server-side copy to /backups (best-effort)
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
