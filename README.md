# Kira Takip

Mülk ve kira yönetim uygulaması.

## Teknolojiler

- Next.js 16 (App Router) + TypeScript
- Prisma 5 + PostgreSQL (Supabase)
- Tailwind CSS 4
- Electron (desktop)

## Kurulum

```bash
npm install
cp .env.example .env   # DATABASE_URL ekle
npm run dev            # http://localhost:3001
```

## Electron (Desktop)

```bash
# Geliştirme
npm run dev            # Terminal 1
npm run electron:dev   # Terminal 2

# Production build
npm run electron:build # dist/ klasörüne .exe üretir
```

## Ortam Değişkenleri

```env
DATABASE_URL=postgresql://...
```
