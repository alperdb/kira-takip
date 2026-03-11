import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export const SESSION_COOKIE = 'kira_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: { select: { id: true, username: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: token } }).catch(() => {});
    return null;
  }

  return session.user;
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  );
}
