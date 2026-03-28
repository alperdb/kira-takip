import { cookies } from 'next/headers';
import { authPrisma } from '@/lib/auth-db';
import { SESSION_COOKIE } from '@/lib/auth-constants';
export { SESSION_COOKIE, SESSION_TTL_MS } from '@/lib/auth-constants';

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await authPrisma.session.findUnique({
    where: { id: token },
    include: { user: { select: { id: true, username: true, role: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await authPrisma.session.delete({ where: { id: token } }).catch(() => {});
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
