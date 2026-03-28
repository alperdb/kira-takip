import { PrismaClient } from '@/generated/auth-client';
import path from 'path';

function getAuthDbUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    const appData = process.env.APPDATA || process.env.HOME || '';
    return `file:${path.join(appData, 'kira-app', 'kira-takip', 'auth.db')}`;
  }
  return `file:${path.join(process.cwd(), 'prisma', 'auth.db')}`;
}

const globalForAuth = globalThis as unknown as { authPrisma: PrismaClient };

export const authPrisma: PrismaClient =
  globalForAuth.authPrisma ??
  (globalForAuth.authPrisma = new PrismaClient({
    datasources: { db: { url: getAuthDbUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  }));
