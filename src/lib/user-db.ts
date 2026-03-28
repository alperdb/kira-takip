import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

function getDataDir(): string {
  if (process.env.NODE_ENV === 'production') {
    const appData = process.env.APPDATA || process.env.HOME || '';
    return path.join(appData, 'kira-app', 'kira-takip');
  }
  return path.join(process.cwd(), 'prisma');
}

export function getUserDbPath(userId: number): string {
  return path.join(getDataDir(), `user-${userId}.db`);
}

function getTemplatePath(): string {
  return path.join(process.cwd(), 'prisma', 'user-template.db');
}

export function ensureUserDb(userId: number): void {
  const dbPath = getUserDbPath(userId);
  if (!fs.existsSync(dbPath)) {
    const template = getTemplatePath();
    if (!fs.existsSync(template)) {
      throw new Error(`user-template.db bulunamadı: ${template}`);
    }
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(template, dbPath);
  }
}

// Cache: one PrismaClient per userId, stored on globalThis for HMR stability
const globalForUserDbs = globalThis as unknown as { userDbs: Map<number, PrismaClient> };
if (!globalForUserDbs.userDbs) globalForUserDbs.userDbs = new Map();

export function getUserDb(userId: number): PrismaClient {
  const cache = globalForUserDbs.userDbs;
  if (!cache.has(userId)) {
    ensureUserDb(userId);
    cache.set(userId, new PrismaClient({
      datasources: { db: { url: `file:${getUserDbPath(userId)}` } },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    }));
  }
  return cache.get(userId)!;
}
