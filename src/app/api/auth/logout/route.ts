import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SESSION_COOKIE } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
