import { NextRequest, NextResponse } from 'next/server';
import { readOfficeSettings, writeOfficeSettings } from '@/lib/officeSettings';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    return NextResponse.json(readOfficeSettings(session.id));
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = { TRY: '₺', USD: '$', EUR: '€' };

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    const body    = await req.json();
    if (body.currencyCode && CURRENCY_SYMBOLS[body.currencyCode]) {
      body.currency = CURRENCY_SYMBOLS[body.currencyCode];
    }
    const updated = writeOfficeSettings(session.id, body);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
