import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const SQLITE_MAGIC = Buffer.from('SQLite format 3\x00');

function getDbPath(): string {
  const url = process.env.DATABASE_URL ?? '';
  const filePath = url.replace(/^file:/, '');
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function isValidSQLite(buf: Buffer): boolean {
  if (buf.length < 16) return false;
  return buf.subarray(0, 16).equals(SQLITE_MAGIC);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file     = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Yedek dosyası seçilmedi' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Dosya boş' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate: must be a real SQLite database
    if (!isValidSQLite(buffer)) {
      return NextResponse.json(
        { error: 'Geçersiz yedek dosyası. Lütfen .backup uzantılı Kira Takip yedeği seçin.' },
        { status: 400 }
      );
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

      // Also clear the global singleton so it reconnects to the new file on next use
      const g = globalThis as { prisma?: unknown };
      delete g.prisma;

      // Write the restored database
      fs.writeFileSync(dbPath, buffer);

      // Also remove WAL and SHM leftover files if they exist (they belong to old DB)
      for (const ext of ['-wal', '-shm']) {
        const f = dbPath + ext;
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }

      // Clean up safety copy
      if (fs.existsSync(oldBackup)) fs.unlinkSync(oldBackup);

      return NextResponse.json({ ok: true });
    } catch (writeErr: unknown) {
      // Attempt rollback to safety copy
      if (fs.existsSync(oldBackup)) {
        try { fs.copyFileSync(oldBackup, dbPath); } catch { /* ignore */ }
      }
      throw writeErr;
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
