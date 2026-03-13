import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

function getDbPath(): string {
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

  // Flush WAL to main DB file before copying
  await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(FULL)');

  const data     = fs.readFileSync(dbPath);
  const filename = buildFilename();

  // Save a server-side copy to /backups
  const backupsDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(backupsDir, filename), data);

  return { data, filename };
}
