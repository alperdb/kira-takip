import { NextRequest, NextResponse } from 'next/server';
import { restoreBackup } from '@/lib/backup/restoreBackup';

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
    await restoreBackup(buffer);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
