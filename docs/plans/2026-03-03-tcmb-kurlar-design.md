# TCMB Döviz Kuru Entegrasyonu — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** kira-app'e TCMB resmi XML endpoint'ini kullanarak USD/EUR/GBP/CHF döviz kuru entegrasyonu ekle — dashboard widget, sözleşme formu TRY karşılığı hint ve yabancı para birimi alacaklarda kur kaydı.

**Architecture:** In-memory 1h TTL cache (lib/tcmb.ts) + lazy ExchangeRate DB upsert (günlük ilk çekildiğinde). Alacak oluşturulurken kullanılan kur RentCharge'a kalıcı olarak yazılır (denetim izi). Dashboard server component, sözleşme formu client fetch.

**Tech Stack:** Next.js 16 App Router, Prisma 5 + SQLite, `fast-xml-parser` (XML parse), TCMB resmi endpoint.

**Yasal Uyum:**
- Yalnızca `https://www.tcmb.gov.tr/kurlar/today.xml` kullanılır
- HTML scraping, robots.txt ihlali, rate-limit aşımı, üçüncü parti kaynak kullanımı yasaktır
- 1h TTL cache ile TCMB'ye minimum istek

---

## 1. Veri Modeli

### Yeni tablo: `ExchangeRate`

```prisma
model ExchangeRate {
  id          Int      @id @default(autoincrement())
  date        DateTime // o günün 00:00 UTC
  currency    String   // "USD" | "EUR" | "GBP" | "CHF"
  buyingRate  Float    @map("buying_rate")
  sellingRate Float    @map("selling_rate")
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([date, currency])
  @@map("exchange_rates")
}
```

### `RentCharge` tablosuna ek alanlar

```prisma
exchangeRate     Float?   @map("exchange_rate")     // 1 birim döviz = X TRY (alış)
chargeAmountTry  Float?   @map("charge_amount_try") // chargeAmount × exchangeRate
```

Kural: `currency == 'TRY'` → her iki alan null. Yabancı dövizde `chargeAmountTry = chargeAmount × buyingRate`.

---

## 2. Backend

### `src/lib/tcmb.ts`

- TCMB XML'i `fetch` ile çek (resmi endpoint, `cache: 'no-store'` — TTL kendi yönetiyoruz)
- `fast-xml-parser` ile parse et
- USD / EUR / GBP / CHF kurlarını çıkar (BuyingRate, SellingRate)
- Node.js process-level `Map` cache, 1 saatlik TTL
- İlk başarılı çekilmede o günün `ExchangeRate` DB satırlarını `upsert` et (lazy snapshot)
- Hata durumu: son cache değeri varsa onu döndür; yoksa `null` → caller UI'ya "Kur verisi alınamadı" gösterir

```ts
type RateMap = Record<'USD'|'EUR'|'GBP'|'CHF', { buying: number; selling: number }>;

export async function getTodayRates(): Promise<RateMap | null>
export async function getRate(currency: string): Promise<number | null> // alış kuru
```

### `/api/exchange-rates` GET

```
Response: {
  USD: { buying: number; selling: number },
  EUR: { buying: number; selling: number },
  GBP: { buying: number; selling: number },
  CHF: { buying: number; selling: number },
  fetchedAt: string // ISO timestamp
}
```

### `/api/charges` POST güncelleme

Sözleşme `currency != 'TRY'` ise:
1. `getRate(currency)` çağır (alış kuru)
2. `exchangeRate` ve `chargeAmountTry` alanlarına yaz
3. Kur alınamazsa 503 döndür (alacak oluşturma engellenmez — istege bağlı hata mı yoksa zorunlu mu sorusu: **zorunlu**, kur kaydı bozuk alacak bırakmaz)

---

## 3. UI

### Dashboard — Kur Bandı

- `src/components/dashboard/RateBand.tsx` (server component)
- KPI row'un hemen üstünde, `PageHeader`'ın altında
- Tasarım: yatay pill sırası, her biri `currency + alış kuru + uyarı işareti (değişim)`, sağda "TCMB · HH:mm" zaman damgası
- `revalidate: 3600` ile saatte bir server-side taze veri

```
[ USD  ₺32,15 ]  [ EUR  ₺34,80 ]  [ GBP  ₺40,12 ]  [ CHF  ₺35,50 ]     TCMB · 14:30
```

### Sözleşme Formu — TRY Hint

- `ContractModal.tsx`'de `currency` select değişince `/api/exchange-rates` fetch
- `rentAmount` doldurulmuşsa TRY karşılığını input altında göster

```
Kira Tutarı  [ 1.000  EUR  ▾ ]
             ≈ ₺34.800  (TCMB alış, 03.03.2026)
```

### Alacak Listesi — FX Badge

- `chargeAmountTry` doluysa: birincil tutar TRY karşılığı, yanında küçük badge
- Badge: `1.000 USD @ 32,15` (muted, küçük font)

---

## 4. Hata Yönetimi

| Durum | Davranış |
|---|---|
| TCMB erişilemiyor, cache mevcut | Cache'den son değer döner |
| TCMB erişilemiyor, cache yok | `null` döner; dashboard "Kur verisi alınamadı" gösterir; alacak oluşturma 503 |
| TCMB XML formatı değişti | Parse hatası loglanır, `null` döner |
| Hafta sonu / resmi tatil | TCMB son işgünü XML'ini yayınlar; normal akış |

---

## 5. Bağımlılık

```bash
npm install fast-xml-parser
```

`fast-xml-parser`: MIT lisanslı, sıfır bağımlılık, Node.js + Edge runtime uyumlu.

---

## 6. Dosya Değişiklikleri Özeti

| Dosya | İşlem |
|---|---|
| `prisma/schema.prisma` | `ExchangeRate` model ekle; `RentCharge`'a 2 alan ekle |
| `prisma/migrations/...` | Migration oluştur + uygula |
| `src/lib/tcmb.ts` | Yeni — TCMB fetch + cache + DB upsert |
| `src/app/api/exchange-rates/route.ts` | Yeni — GET endpoint |
| `src/app/api/charges/route.ts` | FX kur hesaplama eklentisi |
| `src/components/dashboard/RateBand.tsx` | Yeni — dashboard kur bandı |
| `src/app/page.tsx` | `RateBand` render et |
| `src/app/contracts/ContractModal.tsx` | TRY hint eklentisi |
| `src/app/charges/page.tsx` | FX badge eklentisi |
