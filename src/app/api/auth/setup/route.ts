import { NextRequest, NextResponse } from 'next/server';
import { authPrisma } from '@/lib/auth-db';
import { ensureUserDb } from '@/lib/user-db';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    // Only allow setup when no users exist
    const count = await authPrisma.user.count();
    if (count > 0) {
      return NextResponse.json({ error: 'Kurulum zaten tamamlanmış' }, { status: 409 });
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 });
    }
    if (username.trim().length < 3) {
      return NextResponse.json({ error: 'Kullanıcı adı en az 3 karakter olmalı' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Şifre en az 6 karakter olmalı' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await authPrisma.user.create({
      data: { username: username.trim(), passwordHash: hash, role: 'admin' },
    });
    await ensureUserDb(user.id);

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
