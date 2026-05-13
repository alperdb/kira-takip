import { NextRequest, NextResponse } from 'next/server';
import { authPrisma } from '@/lib/auth-db';
import { ensureUserDb } from '@/lib/user-db';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/auth';

// DEV ONLY — never runs in packaged builds (NODE_ENV=production at build time eliminates this).
// Allows `npm run dev` to work without running through the setup wizard every time.
// Credentials: admin / admin123  — local dev convenience, not shipped to end users.
async function devSeedDefaultAdmin() {
  const count = await authPrisma.user.count();
  if (count === 0) {
    const hash = await bcrypt.hash('admin123', 12);
    const user = await authPrisma.user.create({
      data: { username: 'admin', passwordHash: hash, role: 'admin' },
    });
    await ensureUserDb(user.id);
  }
}

// Simple in-memory rate limiter: max 5 attempts per IP per 15 minutes
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS  = 5;
const WINDOW_MS     = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now   = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function resetRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'production') {
      await devSeedDefaultAdmin();
    }

    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'local';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Çok fazla başarısız giriş denemesi. 15 dakika sonra tekrar deneyin.' },
        { status: 429 }
      );
    }

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Kullanıcı adı ve şifre gerekli' }, { status: 400 });
    }

    const user = await authPrisma.user.findUnique({ where: { username } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 });
    }

    resetRateLimit(ip);

    // Clean expired sessions for this user
    await authPrisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lt: new Date() } },
    });

    // Create new session
    const token     = randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await authPrisma.session.create({ data: { id: token, userId: user.id, expiresAt } });

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
