# TCMB Döviz Kuru Entegrasyonu — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** TCMB resmi XML endpoint'inden USD/EUR/GBP/CHF kurlarını çekip dashboard widget, sözleşme formu TRY hint ve yabancı dövizli alacaklarda kur kaydı olarak entegre et.

**Architecture:** In-memory 1h TTL cache (lib/tcmb.ts) + lazy ExchangeRate DB upsert (günlük). Alacak oluşturulurken kullanılan kur RentCharge'a kalıcı yazılır. Dashboard server component, form client fetch.

**Tech Stack:** Next.js 16 App Router, Prisma 5 + SQLite, fast-xml-parser, TCMB resmi XML endpoint (https://www.tcmb.gov.tr/kurlar/today.xml).

**Yasal uyum:** Yalnızca TCMB resmi endpoint. HTML scraping, robots.txt ihlali, rate-limit aşımı, üçüncü parti kaynak yasak.

---

### Task 1: fast-xml-parser kur ve Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npm install fast-xml-parser`
- Run: `npx prisma migrate dev --name add_exchange_rates`

**Step 1: fast-xml-parser yükle**

```bash
cd /c/Users/steam/Desktop/ClaudeProjects/kira-app
npm install fast-xml-parser
```

Expected: `added 1 package` (veya benzer).

**Step 2: schema.prisma'ya ExchangeRate modeli ekle**

`prisma/schema.prisma` dosyasında `// ─── 10. EXPENSES` bloğunun altına ekle:

```prisma
// ─── 11. EXCHANGE_RATES ──────────────────────────────────────
model ExchangeRate {
  id          Int      @id @default(autoincrement())
  date        DateTime
  currency    String
  buyingRate  Float    @map("buying_rate")
  sellingRate Float    @map("selling_rate")
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([date, currency])
  @@map("exchange_rates")
}
```

**Step 3: RentCharge modeline iki alan ekle**

`prisma/schema.prisma` içindeki `RentCharge` modelinde `notes` alanından sonra ekle:

```prisma
  exchangeRate     Float?   @map("exchange_rate")
  chargeAmountTry  Float?   @map("charge_amount_try")
```

Tam model şu hale gelir (`createdAt` öncesi):
```prisma
  notes         String?
  exchangeRate  Float?   @map("exchange_rate")
  chargeAmountTry Float? @map("charge_amount_try")
  createdAt     DateTime @default(now()) @map("created_at")
```

**Step 4: Migration uygula**

```bash
npx prisma migrate dev --name add_exchange_rates
```

Expected çıktı:
```
The following migration(s) have been created and applied:
migrations/XXXXXX_add_exchange_rates/migration.sql
```

**Step 5: Prisma client'i yenile**

```bash
npx prisma generate
```

Expected: `Generated Prisma Client ...`

**Step 6: Doğrula**

```bash
npx prisma studio
```

Tarayıcıda `exchange_rates` tablosunu ve `rent_charges.exchange_rate` kolonunu gör. Sonra Ctrl+C.

---

### Task 2: lib/tcmb.ts — TCMB fetch + in-memory cache + DB upsert

**Files:**
- Create: `src/lib/tcmb.ts`

**Step 1: Dosyayı oluştur**

`src/lib/tcmb.ts`:

```ts
import { XMLParser } from 'fast-xml-parser';
import { prisma } from './db';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CHF';
export const SUPPORTED: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'CHF'];

export type RateEntry = { buying: number; selling: number };
export type RateMap = Record<CurrencyCode, RateEntry>;

// ── Process-level cache ──────────────────────────────────────
let _cache: { rates: RateMap; fetchedAt: Date } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 saat

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';

function dayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ── TCMB XML çek + parse ─────────────────────────────────────
async function fetchFromTCMB(): Promise<RateMap | null> {
  try {
    const res = await fetch(TCMB_URL, { cache: 'no-store' });
    if (!res.ok) return null;

    const xml    = await res.text();
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);

    // TCMB XML yapısı: Tarih_Date.Currency (tekil → array normalize)
    const raw: unknown = parsed?.Tarih_Date?.Currency;
    const list: unknown[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const map = {} as RateMap;
    for (const cur of list) {
      const obj  = cur as Record<string, unknown>;
      const code = (obj['@_CurrencyCode'] ?? obj['CurrencyCode']) as string;
      if (!SUPPORTED.includes(code as CurrencyCode)) continue;

      const buying  = Number(obj.ForexBuying);
      const selling = Number(obj.ForexSelling);
      if (isNaN(buying) || isNaN(selling) || buying <= 0 || selling <= 0) continue;

      map[code as CurrencyCode] = { buying, selling };
    }

    if (Object.keys(map).length === 0) return null;
    return map;
  } catch {
    return null;
  }
}

// ── Lazy DB upsert (fire-and-forget) ─────────────────────────
async function saveToDb(rates: RateMap): Promise<void> {
  const date = dayStart(new Date());
  await Promise.all(
    SUPPORTED
      .filter(c => rates[c])
      .map(currency =>
        prisma.exchangeRate.upsert({
          where:  { date_currency: { date, currency } },
          create: { date, currency, buyingRate: rates[currency].buying, sellingRate: rates[currency].selling },
          update: { buyingRate: rates[currency].buying, sellingRate: rates[currency].selling },
        }),
      ),
  );
}

// ── Public API ────────────────────────────────────────────────

/** Bugünün kurlarını döndür (cache → TCMB → null). */
export async function getTodayRates(): Promise<RateMap | null> {
  const now = new Date();

  if (_cache && now.getTime() - _cache.fetchedAt.getTime() < CACHE_TTL_MS) {
    return _cache.rates;
  }

  const rates = await fetchFromTCMB();
  if (!rates) return _cache?.rates ?? null; // Son geçerli cache

  _cache = { rates, fetchedAt: now };
  saveToDb(rates).catch(console.error); // Async, hata engelleme
  return rates;
}

/** currency için bugünün alış kurunu döndür (örn. 1 USD = 32.15 TRY). */
export async function getRate(currency: string): Promise<number | null> {
  if (!SUPPORTED.includes(currency as CurrencyCode)) return null;
  const rates = await getTodayRates();
  return rates?.[currency as CurrencyCode]?.buying ?? null;
}
```

**Step 2: TypeScript derleme kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: hata yok (veya sadece tcmb.ts dışı mevcut hatalar).

---

### Task 3: /api/exchange-rates GET endpoint

**Files:**
- Create: `src/app/api/exchange-rates/route.ts`

**Step 1: Dosyayı oluştur**

```ts
import { NextResponse } from 'next/server';
import { getTodayRates } from '@/lib/tcmb';

export async function GET() {
  try {
    const rates = await getTodayRates();
    if (!rates) {
      return NextResponse.json(
        { error: 'TCMB kur verisi alınamadı. Lütfen daha sonra tekrar deneyin.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ ...rates, fetchedAt: new Date().toISOString() });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
```

**Step 2: Dev server başlat ve test et**

```bash
npm run dev
```

Yeni terminal:
```bash
curl http://localhost:3000/api/exchange-rates
```

Expected (örnek):
```json
{
  "USD": { "buying": 32.4215, "selling": 32.5123 },
  "EUR": { "buying": 34.8012, "selling": 34.9201 },
  "GBP": { "buying": 40.1234, "selling": 40.2341 },
  "CHF": { "buying": 35.5012, "selling": 35.6123 },
  "fetchedAt": "2026-03-03T11:30:00.000Z"
}
```

Not: TCMB hafta sonu/tatilde son işgünü kurunu verir. Hata durumunda `{ "error": "..." }` + 503 döner.

---

### Task 4: generateMonthlyCharges — yabancı dövizli alacaklarda kur kaydı

**Files:**
- Modify: `src/lib/charges.ts`

**Step 1: import ekle**

`src/lib/charges.ts` dosyasının başına (mevcut `import { prisma }` satırından sonra):

```ts
import { getRate } from './tcmb';
```

**Step 2: generateMonthlyCharges içinde FX logic ekle**

`generateMonthlyCharges` fonksiyonunda, `await prisma.rentCharge.create({...})` bloğunu şu şekilde güncelle:

Mevcut kod (`await prisma.rentCharge.create` öncesinde):
```ts
    await prisma.rentCharge.create({
      data: {
        contractId:   contract.id,
        unitId:       contract.unitId,
        tenantId:     contract.tenantId,
        dueDate,
        chargeAmount: finalAmount,
        periodStart,
        periodEnd,
        status:       'pending',
      },
    });
```

Yeni kod — `finalAmount` hesabından hemen sonra, `create` öncesine FX bloğu ekle:

```ts
    // ── Dövizli sözleşmeler için TCMB kuru ──────────────────
    let exchangeRate:    number | undefined;
    let chargeAmountTry: number | undefined;

    if (contract.currency !== 'TRY') {
      const rate = await getRate(contract.currency);
      if (rate === null) {
        throw new Error(
          `${contract.currency} için TCMB kur verisi alınamadı — ` +
          `alacak oluşturulamadı (contract: ${contract.id})`
        );
      }
      exchangeRate    = rate;
      chargeAmountTry = Math.round(finalAmount * rate * 100) / 100;
    }

    await prisma.rentCharge.create({
      data: {
        contractId:      contract.id,
        unitId:          contract.unitId,
        tenantId:        contract.tenantId,
        dueDate,
        chargeAmount:    finalAmount,
        periodStart,
        periodEnd,
        status:          'pending',
        exchangeRate,
        chargeAmountTry,
      },
    });
```

**Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | grep "charges.ts"
```

Expected: çıktı yok (hata yok).

**Step 4: Manuel doğrulama**

Dev server çalışıyorsa:
```bash
curl -X POST "http://localhost:3000/api/charges?action=generate" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Expected: `{ "created": N, "targetDate": "..." }` (TRY sözleşmeler için N ≥ 0).

---

### Task 5: RateBand — dashboard kur bandı

**Files:**
- Create: `src/components/dashboard/RateBand.tsx`
- Modify: `src/app/page.tsx`

**Step 1: RateBand bileşenini oluştur**

`src/components/dashboard/RateBand.tsx`:

```tsx
import { getTodayRates, SUPPORTED } from '@/lib/tcmb';

export async function RateBand() {
  const rates = await getTodayRates();
  if (!rates) return null;

  const now     = new Date();
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    }}>
      {SUPPORTED.filter(c => rates[c]).map(code => (
        <div key={code} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 8,
          background: 'var(--surface)', border: '1px solid var(--border)',
          fontSize: '0.8125rem',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--muted)', fontSize: '0.75rem' }}>
            {code}
          </span>
          <span style={{
            fontWeight: 700, color: 'var(--text)',
            fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem',
          }}>
            ₺{rates[code].buying.toLocaleString('tr-TR', { minimumFractionDigits: 4 })}
          </span>
        </div>
      ))}
      <span style={{
        marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--subtle)',
        whiteSpace: 'nowrap',
      }}>
        TCMB · {timeStr}
      </span>
    </div>
  );
}
```

**Step 2: page.tsx'e RateBand import et ve ekle**

`src/app/page.tsx` başına import ekle:

```ts
import { RateBand } from '@/components/dashboard/RateBand';
```

`src/app/page.tsx` içinde `{/* ── KPI Row ── */}` bloğundan hemen önce ekle:

```tsx
      {/* ── Kur Bandı ── */}
      <RateBand />
```

Sonuç sırası şu olmalı:
```
<PageHeader ... />
<RateBand />
{/* KPI Row */}
<BudgetSummary ... />
{/* Chart row */}
<OverdueList ... />
```

**Step 3: Doğrula**

Tarayıcıda `http://localhost:3000` aç. PageHeader ile KPI kartları arasında kur bandı gözükmelidir:
```
[ USD ₺32,4215 ]  [ EUR ₺34,8012 ]  [ GBP ₺40,1234 ]  [ CHF ₺35,5012 ]   TCMB · 14:30
```

---

### Task 6: ContractModal — dövizli kira için TRY karşılığı hint

**Files:**
- Modify: `src/app/contracts/ContractModal.tsx`

**Step 1: State ekle**

`ContractModal.tsx` içinde mevcut state tanımlarının yanına ekle:

```tsx
const [rates, setRates] = useState<Record<string, { buying: number; selling: number }> | null>(null);
```

**Step 2: useEffect ile kurları çek (modal açıldığında)**

Mevcut `const router = useRouter();` satırından sonra:

```tsx
useEffect(() => {
  fetch('/api/exchange-rates')
    .then(r => r.ok ? r.json() : null)
    .then(data => { if (data && !data.error) setRates(data); })
    .catch(() => {});
}, []);
```

**Step 3: TRY hint hesapla**

Mevcut form alanlarından hemen önce (return JSX içinde, `<Modal>` içinde), değişkeni tanımla:

```tsx
const tryHint = (() => {
  if (form.currency === 'TRY' || !form.rentAmount || !rates) return null;
  const rate = rates[form.currency]?.buying;
  if (!rate) return null;
  const tryAmount = Number(form.rentAmount) * rate;
  const dateStr   = new Date().toLocaleDateString('tr-TR');
  return `≈ ₺${tryAmount.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} (TCMB alış, ${dateStr})`;
})();
```

**Step 4: Kira Tutarı alanına hint ekle**

`ContractModal.tsx` içinde `rentAmount` field'ını bul. Şu an nasıl görünüyor:

```tsx
<Field label="Kira Tutarı" required error={errors.rentAmount}>
  <NumberInput ... />
</Field>
```

`hint` prop'u ekle (tryHint varsa):

```tsx
<Field label="Kira Tutarı" required error={errors.rentAmount} hint={tryHint ?? undefined}>
  <NumberInput
    value={form.rentAmount}
    onChange={set('rentAmount')}
    min={0.01} step={0.01}
  />
</Field>
```

Not: `Field` bileşeni `hint` prop'unu destekliyorsa doğrudan çalışır. Desteklemiyorsa, aşağıdaki kod bloğunu `</Field>` kapanış etiketinden hemen sonra ekle:

```tsx
{tryHint && (
  <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
    {tryHint}
  </p>
)}
```

**Step 5: Field bileşenini kontrol et**

```bash
grep -n "hint" /c/Users/steam/Desktop/ClaudeProjects/kira-app/src/components/ui/base.tsx | head -10
```

Çıktıya göre: `hint` prop'u varsa direkt kullan, yoksa paragraph ekle.

**Step 6: Doğrula**

Tarayıcıda Sözleşmeler → Yeni Sözleşme aç, currency'yi USD seç, kira tutarına 1000 yaz. Alan altında `≈ ₺32.422 (TCMB alış, 03.03.2026)` görünmeli.

---

### Task 7: Charges page — yabancı döviz badge

**Files:**
- Modify: `src/app/charges/page.tsx`

**Step 1: Charge type'ını genişlet**

`charges/page.tsx` dosyasının üstündeki `type Charge` tanımına iki alan ekle:

```tsx
type Charge = {
  id: number; status: string;
  chargeAmount: string; paidAmount: string;
  dueDate: string; periodStart: string;
  tenant: { name: string };
  unit: { unitNo: string; property: { title: string } };
  // FX alanları (yabancı para birimi sözleşmeler için)
  exchangeRate:    number | null;
  chargeAmountTry: number | null;
};
```

**Step 2: Alacak türlerine contract.currency bilgisini ekle**

API response'u zaten bu alanları döndürür (Prisma otomatik dahil eder). Ancak hangi para biriminde olduğunu bilmek için `contract` veya `currency` bilgisi gerekli.

Şu an `RentCharge` tablosunda `currency` alanı yok — sözleşmenin currency'si `contract.currency` üzerinde. `exchangeRate` null olmayan bir kayıt yabancı dövizli demektir.

Type'a ayrıca `contract` ekle:
```tsx
type Charge = {
  ...
  exchangeRate:    number | null;
  chargeAmountTry: number | null;
  contract: { currency: string };
};
```

**Step 3: API GET'e contract include ekle**

`src/app/api/charges/route.ts` içindeki `include` bloğuna `contract` ekle:

```ts
include: {
  tenant:   { select: { id: true, name: true } },
  unit:     { select: { id: true, unitNo: true, property: { select: { id: true, title: true } } } },
  contract: { select: { currency: true } },
  payments: true,
},
```

**Step 4: Tutar sütununu FX badge ile güncelle**

`charges/page.tsx` içindeki tutar hücresi — şu an:

```tsx
<Td right><Money amount={c.chargeAmount} /></Td>
```

Yeni:

```tsx
<Td right>
  {c.chargeAmountTry != null && c.exchangeRate != null ? (
    <div style={{ textAlign: 'right' }}>
      <Money amount={c.chargeAmountTry} />
      <div style={{
        fontSize: '0.7rem', color: 'var(--subtle)', marginTop: 2,
        fontFamily: 'ui-monospace, monospace',
      }}>
        {Number(c.chargeAmount).toLocaleString('tr-TR')} {c.contract.currency}
        {' @ '}{c.exchangeRate.toLocaleString('tr-TR', { minimumFractionDigits: 4 })}
      </div>
    </div>
  ) : (
    <Money amount={c.chargeAmount} />
  )}
</Td>
```

**Step 5: Doğrula**

Yabancı para birimi sözleşme varsa: Alacaklar sayfasında ilgili alacak satırında TRY karşılığı büyük, `1.000 USD @ 32,4215` küçük font görünmeli. TRY alacaklarda değişiklik yok.

TypeScript kontrolü:
```bash
npx tsc --noEmit 2>&1 | grep "charges"
```

Expected: hata yok.

---

### Task 8: Son kontrol ve temizlik

**Step 1: Tüm TypeScript hataları**

```bash
npx tsc --noEmit 2>&1
```

Expected: hata yok.

**Step 2: Dev server'ı yeniden başlat ve uçtan uca test**

```bash
# Ctrl+C ile mevcut server'ı durdur
npm run dev
```

Kontrol listesi:
- [ ] `http://localhost:3000` → Dashboard açılıyor, kur bandı görünüyor (USD/EUR/GBP/CHF)
- [ ] `http://localhost:3000/contracts` → Yeni Sözleşme, currency=EUR seç, tutar gir → TRY hint görünüyor
- [ ] `curl http://localhost:3000/api/exchange-rates` → JSON kur verisi dönüyor
- [ ] Alacak oluştur (TRY sözleşme) → Alacaklar sayfasında normal Money gösterimi
- [ ] (Opsiyonel) USD sözleşme varsa: Alacak oluştur → FX badge görünüyor

**Step 3: TCMB erişim yok senaryosu**

TCMB test: `lib/tcmb.ts` içinde `TCMB_URL`'yi geçici olarak geçersiz bir URL'ye çevir, dashboard'u aç → kur bandı görünmez (null return), hata olmuyor.

Geri al — orijinal URL'yi geri koy.

---

## Dosya Değişiklikleri Özeti

| Dosya | İşlem |
|---|---|
| `prisma/schema.prisma` | `ExchangeRate` model + `RentCharge.exchangeRate` + `RentCharge.chargeAmountTry` |
| `src/lib/tcmb.ts` | Yeni — TCMB fetch, 1h cache, lazy DB upsert |
| `src/app/api/exchange-rates/route.ts` | Yeni — GET kur endpoint |
| `src/lib/charges.ts` | `generateMonthlyCharges` FX kur entegrasyonu |
| `src/components/dashboard/RateBand.tsx` | Yeni — dashboard kur bandı |
| `src/app/page.tsx` | `RateBand` import + render |
| `src/app/contracts/ContractModal.tsx` | TRY karşılığı hint |
| `src/app/api/charges/route.ts` | `contract: { currency }` include |
| `src/app/charges/page.tsx` | `Charge` type genişletme + FX badge |
