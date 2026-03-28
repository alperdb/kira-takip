import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { restoreBackup } from '@/lib/backup/restoreBackup';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const formData = await req.formData();
    const file     = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Yedek dosyası seçilmedi' }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Dosya boş' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await restoreBackup(session.id, buffer);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
