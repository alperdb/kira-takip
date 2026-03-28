import { NextRequest, NextResponse } from 'next/server';
import { authPrisma } from '@/lib/auth-db';
import { ensureUserDb } from '@/lib/user-db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const users = await authPrisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { username, password, role } = await req.json();

  if (!username || username.trim().length < 3)
    return NextResponse.json({ error: 'Kullanıcı adı en az 3 karakter olmalı' }, { status: 400 });
  if (!password || password.length < 6)
    return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });

  const exists = await authPrisma.user.findUnique({ where: { username: username.trim() } });
  if (exists)
    return NextResponse.json({ error: 'Bu kullanıcı adı zaten alınmış' }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await authPrisma.user.create({
    data: { username: username.trim(), passwordHash, role: role ?? 'admin' },
    select: { id: true, username: true, role: true, createdAt: true },
  });
  await ensureUserDb(user.id);

  return NextResponse.json({ user }, { status: 201 });
}
