import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

function getDbPath(): string {
  const url = process.env.DATABASE_URL ?? '';
  const filePath = url.replace(/^file:/, '');
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

export async function GET() {
  try {
    const dbPath = getDbPath();

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Veritabanı dosyası bulunamadı' }, { status: 404 });
    }

    // Flush WAL to main DB file before copying
    await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(FULL)');

    const data     = fs.readFileSync(dbPath);
    const today    = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `kira-backup-${today}.backup`;

    return new NextResponse(data, {
      headers: {
        'Content-Type':        'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(data.length),
      },
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
