import { NextRequest, NextResponse } from 'next/server';
import { authPrisma } from '@/lib/auth-db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);

  if (session.id === userId)
    return NextResponse.json({ error: 'Kendi hesabınızı silemezsiniz' }, { status: 400 });

  const total = await authPrisma.user.count();
  if (total <= 1)
    return NextResponse.json({ error: 'Son kullanıcı silinemez' }, { status: 400 });

  // Delete sessions first
  await authPrisma.session.deleteMany({ where: { userId } });
  await authPrisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

  const { id } = await params;
  const userId = parseInt(id, 10);
  const { password } = await req.json();

  if (!password || password.length < 6)
    return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });

  const passwordHash = await bcrypt.hash(password, 12);
  await authPrisma.user.update({ where: { id: userId }, data: { passwordHash } });

  // Invalidate all existing sessions for this user (except current if changing own)
  if (session.id !== userId) {
    await authPrisma.session.deleteMany({ where: { userId } });
  }

  return NextResponse.json({ ok: true });
}
