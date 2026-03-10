import { NextResponse } from 'next/server';
import { getTodayRates } from '@/lib/tcmb';

export async function GET() {
  try {
    const rates = await getTodayRates();
    if (!rates) {
      return NextResponse.json(
        { error: 'TCMB kur verisi alınamadı. Lütfen daha sonra tekrar deneyin.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ ...rates, fetchedAt: new Date().toISOString() });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
