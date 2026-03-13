import { NextResponse } from 'next/server';
import { createBackup } from '@/lib/backup/createBackup';

export async function GET() {
  try {
    const { data, filename } = await createBackup();

    return new NextResponse(data as unknown as BodyInit, {
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
