import { NextRequest, NextResponse } from 'next/server';
import { readOfficeSettings, writeOfficeSettings } from '@/lib/officeSettings';

export async function GET() {
  try {
    return NextResponse.json(readOfficeSettings());
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body    = await req.json();
    const updated = writeOfficeSettings(body);
    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
