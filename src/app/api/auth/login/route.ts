import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/auth';

// On first call, seed default admin if no users exist
async function ensureDefaultAdmin() {
  const count = await prisma.user.count();
  if (count === 0) {
    const hash = await bcrypt.hash('admin123', 12);
    await prisma.user.create({
      data: { username: 'admin', passwordHash: hash, role: 'admin' },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
    }

    // Clean expired sessions for this user
    await prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    // Create new session
    const token     = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session.create({ data: { id: token, userId: user.id, expiresAt } });

    const res = NextResponse.json({ ok: true, username: user.username, role: user.role });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly:  true,
      sameSite:  'lax',
      path:      '/',
      expires:   expiresAt,
    });
    return res;
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
