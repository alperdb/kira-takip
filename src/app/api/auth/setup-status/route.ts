import { NextResponse } from 'next/server';
import { authPrisma } from '@/lib/auth-db';

export async function GET() {
  try {
    const count = await authPrisma.user.count();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
