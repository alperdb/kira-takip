# Kira Takip Uygulaması — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Owner → Properties → Units → Tenants → Contracts → Income akışını yöneten, kısmi/gecikmeli ödeme, depozito, yıllık artış desteğine sahip çoklu mülk kira yönetim sistemi.

**Architecture:** API-first backend (tüm iş kuralları server-side), Next.js frontend + optional Electron wrapper. Mobil hazırlık için REST API sınırlarında tutulmuş iş mantığı.

**Tech Stack:** Next.js 14 (App Router), Prisma ORM, PostgreSQL (Supabase/Docker), Tailwind CSS, electron-next (desktop)

---

## Teknoloji Karşılaştırması

| Seçenek | Artı | Eksi | Öneri |
|---|---|---|---|
| **Next.js + Postgres/Prisma** | Full-stack, type-safe, güçlü raporlama SQL'i, Supabase ile kolay deploy | DB sunucu gerekir | ✅ Önerilen |
| **Next.js + SQLite/Prisma** | Sunucusuz, kolay dağıtım | Concurrent write limiti, raporlama zayıf | Desktop-only için alternatif |
| **Express + SQLite (mevcut emlak pattern)** | Basit, hızlı prototip | Raporlama için yetersiz, tek yazıcı | MVP prototip için |
| **Electron + local Postgres** | Tam desktop deneyimi | Postgres bundle etmek çok karmaşık | ❌ Kaçın |

**Karar:** Next.js API Routes + Prisma + PostgreSQL. Electron için `electron-next` pattern (renderer = localhost:3000). İleride React Native mobil aynı API'yi kullanır.

---

## 1. Veri Modeli

### Tablo Şeması

```sql
-- 1. OWNERS (Mülk Sahipleri)
-- Gerekçe: Owner ↔ Property ilişkisi; ileride çoklu sahip ortaklık senaryosu için ayrı tablo
CREATE TABLE owners (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  phone       VARCHAR(30),
  email       VARCHAR(200),
  national_id VARCHAR(20),          -- TC Kimlik
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROPERTIES (Binalar/Mülkler)
-- Gerekçe: Bir sahip birden fazla bina yönetebilir; bina bazlı kârlılık raporu için
CREATE TABLE properties (
  id          SERIAL PRIMARY KEY,
  owner_id    INT NOT NULL REFERENCES owners(id),
  title       VARCHAR(200) NOT NULL,  -- "Merkez Apt.", "İş Hanı"
  address     TEXT,
  city        VARCHAR(100),
  district    VARCHAR(100),
  type        VARCHAR(30) CHECK (type IN ('apartment','villa','commercial','mixed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. UNITS (Daireler/Birimler)
-- Gerekçe: Kiralanan atomik birim; bir bina içinde bağımsız kira taşır
CREATE TABLE units (
  id          SERIAL PRIMARY KEY,
  property_id INT NOT NULL REFERENCES properties(id),
  unit_no     VARCHAR(20) NOT NULL,  -- "D-3", "Dükkan-1"
  floor       INT,
  type        VARCHAR(30) CHECK (type IN ('residential','commercial','parking','storage')),
  gross_sqm   NUMERIC(8,2),
  net_sqm     NUMERIC(8,2),
  status      VARCHAR(20) DEFAULT 'vacant' CHECK (status IN ('vacant','occupied','maintenance')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TENANTS (Kiracılar)
-- Gerekçe: Kişi, sözleşmeden bağımsız; çoklu sözleşme geçmişi için ayrı tablo
CREATE TABLE tenants (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  phone       VARCHAR(30),
  email       VARCHAR(200),
  national_id VARCHAR(20),
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CONTRACTS (Sözleşmeler)
-- Gerekçe: Bir unit'in kiracı geçmişini tutar; soft-expire ile tarih dondurulur
CREATE TABLE contracts (
  id               SERIAL PRIMARY KEY,
  unit_id          INT NOT NULL REFERENCES units(id),
  tenant_id        INT NOT NULL REFERENCES tenants(id),
  start_date       DATE NOT NULL,
  end_date         DATE,                    -- NULL = belirsiz süreli
  rent_amount      NUMERIC(12,2) NOT NULL,  -- Başlangıç kirası
  currency         VARCHAR(3) DEFAULT 'TRY' CHECK (currency IN ('TRY','USD','EUR')),
  payment_day      INT DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 28),  -- Her ayın x'i (28 max: kısa ay güvencesi)
  deposit_amount   NUMERIC(12,2) DEFAULT 0,
  deposit_status   VARCHAR(30) DEFAULT 'held'
                     CHECK (deposit_status IN ('held','returned','partial_returned','applied_to_debt','forfeited')),
  deposit_date     DATE,
  status           VARCHAR(20) DEFAULT 'active'
                     CHECK (status IN ('active','terminated','expired','pending')),
  termination_date DATE,
  termination_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT one_active_per_unit UNIQUE (unit_id, status)  -- partial unique: bkz. migration notu
);
-- NOT: PostgreSQL'de partial unique: CREATE UNIQUE INDEX ON contracts(unit_id) WHERE status='active';

-- 6. CONTRACT_INCREASES (Artış Kayıtları)
-- Gerekçe: Değişmez audit trail; eski tahakkuklar bozulmasın diye ayrı tablo
CREATE TABLE contract_increases (
  id            SERIAL PRIMARY KEY,
  contract_id   INT NOT NULL REFERENCES contracts(id),
  effective_date DATE NOT NULL,
  old_amount    NUMERIC(12,2) NOT NULL,
  new_amount    NUMERIC(12,2) NOT NULL,
  reason        VARCHAR(30) CHECK (reason IN ('annual','cpi','manual','renewal')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RENT_CHARGES (Tahakkuklar)
-- Gerekçe: Her ay için bağımsız alacak kaydı; ödeme durumu buradan takip edilir
CREATE TABLE rent_charges (
  id            SERIAL PRIMARY KEY,
  contract_id   INT NOT NULL REFERENCES contracts(id),
  unit_id       INT NOT NULL REFERENCES units(id),
  tenant_id     INT NOT NULL REFERENCES tenants(id),
  due_date      DATE NOT NULL,
  charge_amount NUMERIC(12,2) NOT NULL,
  paid_amount   NUMERIC(12,2) DEFAULT 0,  -- SUM(payments) cache
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending','partial','paid','overdue','waived')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, period_start)       -- Aynı dönem için çift tahakkuk önle
);

-- 8. PAYMENTS (Ödemeler)
-- Gerekçe: Bir tahakkuka birden fazla kısmi ödeme yapılabilir (immutable ledger)
CREATE TABLE payments (
  id            SERIAL PRIMARY KEY,
  rent_charge_id INT NOT NULL REFERENCES rent_charges(id),
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  paid_at       TIMESTAMPTZ NOT NULL,
  method        VARCHAR(30) CHECK (method IN ('cash','bank','eft','check','other')),
  reference_no  VARCHAR(100),  -- Dekont/havale no
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 9. DEPOSIT_TRANSACTIONS (Depozito Hareketleri)
-- Gerekçe: Depozito iadesi, borçtan düşme, müsadere ayrı event'ler; tam audit trail
CREATE TABLE deposit_transactions (
  id            SERIAL PRIMARY KEY,
  contract_id   INT NOT NULL REFERENCES contracts(id),
  type          VARCHAR(30) CHECK (type IN ('collected','refunded','applied_to_debt','forfeited','partial_refund')),
  amount        NUMERIC(12,2) NOT NULL,
  date          DATE NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 10. EXPENSES (Giderler — Kârlılık raporu için)
-- Gerekçe: Net kâr = Tahsilat - Gider; bina veya daire bazında
CREATE TABLE expenses (
  id            SERIAL PRIMARY KEY,
  property_id   INT REFERENCES properties(id),
  unit_id       INT REFERENCES units(id),  -- NULL = bina geneli gider
  category      VARCHAR(50),               -- 'maintenance','tax','insurance','management'
  amount        NUMERIC(12,2) NOT NULL,
  date          DATE NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### İlişki Diyagramı

```
owners (1) ──< properties (1) ──< units (1) ──< contracts (N)
                                               │
                                    tenants >──┘
                                               │
                              contract_increases (N)
                              rent_charges (N) ──< payments (N)
                              deposit_transactions (N)
```

---

## 2. İş Kuralları

### 2.1 Tahakkuk (Accrual)
- Her aktif sözleşme için ay başında (veya `payment_day`'de) `rent_charges` kaydı oluşturulur
- Tahakkuk miktarı = o tarihteki geçerli kira (son artış veya başlangıç miktarı)
- Aynı sözleşme + dönem için çift tahakkuk `UNIQUE(contract_id, period_start)` ile engellenir
- İlk ay orantılı (prorate): `start_date` ayın ortasındaysa kalan gün sayısı / toplam gün

### 2.2 Ödeme (Payment)
- Ödeme en eski `pending/partial/overdue` tahakkuka önce uygulanır (FIFO)
- `payments` kaydı oluşturulur → `rent_charges.paid_amount` güncellenir
- `paid_amount >= charge_amount` → status = `'paid'`
- `0 < paid_amount < charge_amount` → status = `'partial'`
- Fazla ödeme (overpayment): sonraki dönem tahakkukuna otomatik aktarılır
- Birden fazla ay kapsayan toplu ödeme: FIFO sırasıyla dağıtılır

### 2.3 Gecikme (Late / Overdue)
- Grace period: varsayılan 5 gün (config'den alınır)
- `due_date + grace_days < today` ve status ∈ {pending, partial} → `'overdue'`
- Cron job (günde 1 kez) veya her API isteğinde lazy update
- Late fee: MVP'de isteğe bağlı (schema hazır, business logic sonraya)

### 2.4 Kısmi Ödeme (Partial Payment)
- `payments` tablosu birden fazla satır içerebilir aynı `rent_charge_id` için
- Ekran: "Kalan: ₺X, Ödeme gir" input → her kayıt append-only
- Silme: sadece admin; son 24 saat içindeki hata düzeltmeleri için

### 2.5 Depozito
- Tahsilat: sözleşme başlangıcında `deposit_transactions{type:'collected'}` + `contracts.deposit_status='held'`
- İade: `type:'refunded'` veya `type:'partial_refund'` → status güncelle
- Borçtan düşme: `type:'applied_to_debt'` → ilgili `rent_charges`'a ödeme yaz
- Müsadere: `type:'forfeited'` → gelir olarak raporla
- Kural: toplam depozito transaction'ları ≤ `deposit_amount` (kontrol app layer'da)

### 2.6 Artış (Rent Increase)
- `contract_increases` oluşturulur; `effective_date` ileri tarih olabilir
- Tahakkuk oluşturulurken `getEffectiveRentAmount()` çağrılır (bkz. pseudo-code)
- Eski tahakkuklar değişmez (immutable)
- Yıllık otomatik artış: TÜFE oranı uygulanır → manuel onay gerekir (auto-suggest, not auto-apply)
- Artış geri tarihe alınamaz (eğer alınırsa warning + geçmiş tahakkukları düzeltme UI'ı)

---

## 3. Aylık Tahakkuk Pseudo-code

```typescript
// Günlük cron veya /api/charges/generate endpoint tetikler

async function generateMonthlyCharges(targetDate: Date): Promise<void> {
  const periodStart = startOfMonth(targetDate);
  const periodEnd   = endOfMonth(targetDate);

  const activeContracts = await db.contract.findMany({
    where: {
      status: 'active',
      start_date: { lte: periodEnd },
      OR: [{ end_date: null }, { end_date: { gte: periodStart } }]
    }
  });

  for (const contract of activeContracts) {
    // İdempotent: aynı dönem için zaten varsa atla
    const exists = await db.rentCharge.findUnique({
      where: { contract_id_period_start: { contract_id: contract.id, period_start: periodStart } }
    });
    if (exists) continue;

    const dueDate      = getChargeDate(targetDate.getFullYear(), targetDate.getMonth(), contract.payment_day);
    const chargeAmount = await getEffectiveRentAmount(contract.id, dueDate);

    // İlk ay orantılı hesap
    const prorated = isFirstMonth(contract, periodStart)
      ? proratAmount(chargeAmount, contract.start_date, periodEnd)
      : chargeAmount;

    await db.rentCharge.create({
      data: {
        contract_id:  contract.id,
        unit_id:      contract.unit_id,
        tenant_id:    contract.tenant_id,
        due_date:     dueDate,
        charge_amount: prorated,
        period_start: periodStart,
        period_end:   periodEnd,
        status:       'pending'
      }
    });
  }
}

async function getEffectiveRentAmount(contractId: number, asOfDate: Date): Promise<number> {
  const latestIncrease = await db.contractIncrease.findFirst({
    where: {
      contract_id:    contractId,
      effective_date: { lte: asOfDate }
    },
    orderBy: { effective_date: 'desc' }
  });
  if (latestIncrease) return latestIncrease.new_amount;

  const contract = await db.contract.findUnique({ where: { id: contractId } });
  return contract!.rent_amount;
}

function getChargeDate(year: number, month: number, paymentDay: number): Date {
  // payment_day max 28, bu yüzden tüm aylarda güvenli
  return new Date(year, month, paymentDay);
}

function isFirstMonth(contract: Contract, periodStart: Date): boolean {
  return isSameMonth(contract.start_date, periodStart);
}

function prorateAmount(amount: number, startDate: Date, periodEnd: Date): number {
  const daysInMonth = getDaysInMonth(startDate);
  const daysActive  = daysInMonth - startDate.getDate() + 1;
  return Math.round((amount / daysInMonth) * daysActive * 100) / 100;  // 2 decimal
}

// Günlük cron: gecikme durumunu güncelle
async function updateOverdueStatuses(today: Date, graceDays = 5): Promise<void> {
  const cutoff = subDays(today, graceDays);
  await db.rentCharge.updateMany({
    where: {
      status:   { in: ['pending', 'partial'] },
      due_date: { lt: cutoff }
    },
    data: { status: 'overdue' }
  });
}

// Ödeme uygulama (FIFO)
async function applyPayment(contractId: number, totalAmount: number, method: string): Promise<void> {
  const openCharges = await db.rentCharge.findMany({
    where: {
      contract_id: contractId,
      status:      { in: ['pending', 'partial', 'overdue'] }
    },
    orderBy: { due_date: 'asc' }  // FIFO
  });

  let remaining = totalAmount;

  for (const charge of openCharges) {
    if (remaining <= 0) break;
    const owed    = charge.charge_amount - charge.paid_amount;
    const paying  = Math.min(remaining, owed);

    await db.payment.create({
      data: { rent_charge_id: charge.id, amount: paying, paid_at: new Date(), method }
    });

    const newPaid = charge.paid_amount + paying;
    await db.rentCharge.update({
      where: { id: charge.id },
      data: {
        paid_amount: newPaid,
        status:      newPaid >= charge.charge_amount ? 'paid' : 'partial'
      }
    });

    remaining -= paying;
  }

  // Overpayment varsa: remaining > 0 → bir sonraki tahakkuka kredi (MVP sonrası)
}
```

---

## 4. REST API

### Base URL: `/api/v1`

#### Owners

```
GET    /owners                    → tüm sahipler (liste)
POST   /owners                    → yeni sahip
GET    /owners/:id                → sahip detay
PUT    /owners/:id                → güncelle
DELETE /owners/:id                → sil (bağlı property yoksa)
GET    /owners/:id/properties     → sahibin binaları
```

#### Properties

```
GET    /properties                → liste (query: ?owner_id, ?city)
POST   /properties                → yeni bina
GET    /properties/:id            → detay + unit özeti
PUT    /properties/:id            → güncelle
DELETE /properties/:id            → sil (bağlı unit yoksa)
GET    /properties/:id/units      → binanın daireleri
GET    /properties/:id/units/vacant → boş daireler
```

#### Units

```
GET    /units                     → liste (query: ?property_id, ?status)
POST   /units                     → yeni daire
GET    /units/:id                 → detay + aktif sözleşme
PUT    /units/:id                 → güncelle
GET    /units/:id/contracts       → sözleşme geçmişi
```

#### Tenants

```
GET    /tenants                   → liste (query: ?q=isim/tel)
POST   /tenants                   → yeni kiracı
GET    /tenants/:id               → detay + sözleşme geçmişi
PUT    /tenants/:id               → güncelle
```

#### Contracts

```
GET    /contracts                 → liste (query: ?status, ?unit_id, ?tenant_id)
POST   /contracts                 → yeni sözleşme
GET    /contracts/:id             → detay (+ son tahakkuklar)
PUT    /contracts/:id             → güncelle (kira miktarı hariç → increases kullan)
POST   /contracts/:id/terminate   → sonlandır
GET    /contracts/:id/increases   → artış geçmişi
POST   /contracts/:id/increases   → artış ekle
GET    /contracts/:id/charges     → tahakkuklar
GET    /contracts/:id/deposits    → depozito hareketleri
POST   /contracts/:id/deposits    → depozito hareketi ekle
```

#### Charges & Payments

```
GET    /charges                   → liste (query: ?status, ?from, ?to, ?unit_id)
POST   /charges/generate          → manuel tahakkuk tetikle (ay parametresi ile)
GET    /charges/:id               → tahakkuk detay + ödemeler
POST   /charges/:id/payments      → ödeme gir (FIFO dağıtım)
DELETE /payments/:id              → ödeme iptal (24 saat kuralı)
POST   /payments/bulk             → toplu ödeme (birden fazla tahakkuka)
```

#### Reports

```
GET    /reports/income            → ?from=2026-01&to=2026-03&property_id=1
GET    /reports/aging             → ?as_of=2026-03-01
GET    /reports/profitability     → ?year=2026&property_id=1
GET    /reports/vacancy           → ?from=2026-01&to=2026-03
```

### Örnek JSON

**POST /contracts**
```json
{
  "unit_id": 5,
  "tenant_id": 12,
  "start_date": "2026-04-01",
  "end_date": "2027-03-31",
  "rent_amount": 15000,
  "currency": "TRY",
  "payment_day": 1,
  "deposit_amount": 30000
}
```

**Response:**
```json
{
  "id": 42,
  "unit_id": 5,
  "tenant_id": 12,
  "start_date": "2026-04-01",
  "end_date": "2027-03-31",
  "rent_amount": 15000,
  "currency": "TRY",
  "payment_day": 1,
  "deposit_amount": 30000,
  "deposit_status": "held",
  "status": "active",
  "created_at": "2026-03-02T10:00:00Z"
}
```

**POST /charges/:id/payments**
```json
{
  "amount": 7500,
  "method": "bank",
  "reference_no": "TRF-20260301-0042",
  "notes": "Kısmi ödeme"
}
```

**GET /reports/aging**
```json
{
  "as_of": "2026-03-02",
  "summary": {
    "current": { "count": 45, "total": 675000 },
    "1_30":    { "count": 8,  "total": 96000  },
    "31_60":   { "count": 3,  "total": 36000  },
    "61_90":   { "count": 1,  "total": 12000  },
    "over_90": { "count": 1,  "total": 8000   }
  },
  "details": [
    {
      "charge_id": 201,
      "unit": "D-3",
      "property": "Merkez Apt.",
      "tenant": "Ahmet Yılmaz",
      "due_date": "2026-01-01",
      "days_overdue": 60,
      "charge_amount": 12000,
      "paid_amount": 0,
      "balance": 12000
    }
  ]
}
```

---

## 5. UI Ekranları

### Navigasyon (Top Nav — emlak-app ile aynı pattern)
`Dashboard | Sahipler | Binalar | Daireler | Kiracılar | Sözleşmeler | Tahakkuklar | Raporlar`

### Ekranlar

| Ekran | Amaç | Kritik Bileşenler |
|---|---|---|
| **Dashboard** | Anlık özet | KPI cards: Bu ay tahsilat, Geciken, Boş daire, Doluluk %. Yaklaşan ödemeler listesi (7 gün). |
| **Sahipler** | CRUD | Liste + detay (sahibin binaları, toplam kira geliri) |
| **Binalar** | CRUD | Liste + detay. Daire grid kartları (status renk kodu: yeşil=dolu, kırmızı=gecikme, gri=boş) |
| **Daireler** | CRUD + Filtre | Boş/dolu/bakımda filtresi. Daire kartı: kiracı adı, kira, son ödeme tarihi |
| **Kiracılar** | CRUD | Liste + detay. Sözleşme geçmişi timeline |
| **Sözleşmeler** | CRUD | Wizard: Daire seç → Kiracı seç/oluştur → Koşullar. Aktif sözleşme detay: tahakkuk takvimi, depozito durumu |
| **Artış Ekle** | Modal | Eski miktar → Yeni miktar → Geçerlilik tarihi → Gerekçe. Preview: "Aylık +₺X, yıllık +₺Y" |
| **Tahakkuklar** | Ay görünümü | Aylık tablo: her satır 1 tahakkuk. Renk: yeşil=ödendi, sarı=kısmi, kırmızı=gecikti, gri=bekliyor. "Ödeme Gir" butonu |
| **Ödeme Girişi** | Modal | Tutar, tarih, yöntem, dekont no. Kalan bakiye göster. "Tam öde" kısayol butonu |
| **Depozito** | Modal | Hareketler listesi + yeni hareket (iade/düşme/müsadere) |
| **Raporlar** | 4 rapor | Tarih aralığı seçici. Tablo + basit bar chart. Export CSV butonu |

### Renk Sistemi (emlak-app'ten devam)
- Terracotta `#C4704A` — primary accent
- Ödendi: `#5A8C6E` (yeşil)
- Gecikti: `#DC4A4A` (kırmızı)
- Kısmi: `#C49A2A` (amber)
- Bekliyor: `#94a3b8` (gri)

---

## 6. Raporlar

### 6.1 Income Report (Gelir Raporu)
**Sorgu:** `period_start` aralığına göre, tüm tahakkuklar vs ödemeler karşılaştırma

```sql
SELECT
  TO_CHAR(rc.period_start, 'YYYY-MM') AS month,
  p.title                              AS property,
  SUM(rc.charge_amount)                AS total_charged,
  SUM(rc.paid_amount)                  AS total_collected,
  SUM(rc.charge_amount - rc.paid_amount) AS outstanding,
  COUNT(*) FILTER (WHERE rc.status = 'paid')    AS fully_paid_count,
  COUNT(*) FILTER (WHERE rc.status = 'overdue') AS overdue_count
FROM rent_charges rc
JOIN contracts c    ON c.id = rc.contract_id
JOIN units u        ON u.id = rc.unit_id
JOIN properties p   ON p.id = u.property_id
WHERE rc.period_start BETWEEN :from AND :to
GROUP BY month, p.title
ORDER BY month DESC, property;
```

### 6.2 Aging Report (Yaşlandırma Raporu)
**Sorgu:** Bugün itibarıyla ödenmemiş tahakkuklar, gecikme gün grupları

```sql
SELECT
  CASE
    WHEN CURRENT_DATE - rc.due_date <= 0  THEN 'current'
    WHEN CURRENT_DATE - rc.due_date <= 30 THEN '1-30'
    WHEN CURRENT_DATE - rc.due_date <= 60 THEN '31-60'
    WHEN CURRENT_DATE - rc.due_date <= 90 THEN '61-90'
    ELSE 'over-90'
  END                                       AS bucket,
  COUNT(*)                                  AS charge_count,
  SUM(rc.charge_amount - rc.paid_amount)    AS balance
FROM rent_charges rc
WHERE rc.status IN ('pending','partial','overdue')
GROUP BY bucket
ORDER BY MIN(CURRENT_DATE - rc.due_date);
```

### 6.3 Profitability Report (Kârlılık Raporu)
**Formül:** Net Kâr = Tahsilat - Giderler (bina bazında, yıllık)

```sql
SELECT
  p.title                    AS property,
  SUM(rc.paid_amount)        AS income,
  COALESCE(SUM(e.amount), 0) AS expenses,
  SUM(rc.paid_amount) - COALESCE(SUM(e.amount), 0) AS net_profit,
  COUNT(DISTINCT u.id)       AS total_units,
  COUNT(DISTINCT CASE WHEN u.status = 'occupied' THEN u.id END) AS occupied_units
FROM properties p
LEFT JOIN units u        ON u.property_id = p.id
LEFT JOIN rent_charges rc ON rc.unit_id = u.id
  AND rc.period_start BETWEEN :from AND :to
LEFT JOIN expenses e     ON e.property_id = p.id
  AND e.date BETWEEN :from AND :to
WHERE (:owner_id IS NULL OR p.owner_id = :owner_id)
GROUP BY p.id, p.title
ORDER BY net_profit DESC;
```

### 6.4 Vacancy Report (Boşluk Raporu)
- Şu an boş daireler + kaç gündür boş (son sözleşmenin `end_date`'inden itibaren)
- Dönem bazında doluluk oranı: `SUM(dolu gün) / SUM(toplam gün)`
- Ortalama boşluk süresi (son 12 ay)

---

## 7. MVP + 2 Haftalık Sprint

### Hafta 1 — Temel Altyapı & CRUD

| Gün | Görev |
|-----|-------|
| 1–2 | Next.js + Prisma kurulum, schema migration, seed data (3 sahip, 2 bina, 10 daire) |
| 3   | Owners + Properties CRUD (API + UI) |
| 4   | Units + Tenants CRUD (API + UI) |
| 5   | Contracts CRUD: oluşturma wizard, liste, detay |

### Hafta 2 — İş Kuralları & Raporlar

| Gün | Görev |
|-----|-------|
| 6   | Monthly charge generation (`/charges/generate` endpoint + manual trigger UI) |
| 7   | Payment entry (tam + kısmi), FIFO dağıtım, paid_amount güncelleme |
| 8   | Overdue status update (cron/lazy), aging view (basit tablo) |
| 9   | Deposit lifecycle (tahsilat, iade, borçtan düşme) |
| 10  | Dashboard KPI'lar + Income Report |

### MVP Sonrası (Sprint 3–4)

- Rent increase UI + yıllık artış hatırlatıcı
- Profitability + Vacancy raporları
- CSV export
- Contract termination flow (depozito iade entegre)
- Electron wrapper (electron-next)
- PDF sözleşme / makbuz
- E-posta / SMS hatırlatıcı (Resend/Twilio)

---

## 8. Edge-Case Listesi

| # | Senaryo | Çözüm |
|---|---------|-------|
| 1 | `payment_day` = 29/30/31 kısa aylarda | `payment_day` max 28 ile sınırla (schema constraint) |
| 2 | Artık yıl Şubatı (29 gün) prorate | `getDaysInMonth(date)` fonksiyonu kullan, hardcode etme |
| 3 | Ay ortasında başlayan sözleşme | İlk ay prorate: `(kalan_gün / toplam_gün) × kira` |
| 4 | Aynı unit'e iki aktif sözleşme | `UNIQUE INDEX ON contracts(unit_id) WHERE status='active'` |
| 5 | Sözleşme bitiş tarihinden önce kiracı çıkışı | `POST /contracts/:id/terminate` + `end_date` güncelleme + depozito akışı |
| 6 | Geriye dönük artış (backdated increase) | Uyarı göster; geçmiş tahakkukları düzeltme UI'ı (önce uyarı, sonra onay) |
| 7 | Kısmi depozito iadesi | `deposit_transactions{type:'partial_refund'}` + `deposit_status='partial_returned'` |
| 8 | Depozito → gecikmiş borçtan düşülmesi | `applied_to_debt` transaction + `applyPayment()` çağrısı |
| 9 | Fazla ödeme (overpayment) | Kalan `remaining > 0` → bir sonraki tahakkuka kredi (veya uyarı) |
| 10 | Sözleşme yenileme (aynı kiracı) | Eski sözleşme `expired`, yeni sözleşme `active`; kiracı ID aynı kalır |
| 11 | Kur değişimi (TRY → USD) | Sözleşme bazında `currency` alanı; raporlar `currency` bazında gruplar |
| 12 | Bakım nedeniyle boş unit | `units.status='maintenance'` → tahakkuk üretme (check generation'da) |
| 13 | Tahakkuk silinmesi / iptali | Silme yok; `status='waived'` + reason notu (audit trail) |
| 14 | Toplu ödeme (birden fazla ay) | `POST /payments/bulk` → `applyPayment()` FIFO ile tüm açık tahakkuklara dağıt |
| 15 | Birden fazla ortak sahip | MVP scope dışı; schema'da `owner_id` array yerine ayrı `property_owners` tablosu ile genişletilebilir |
| 16 | Artış ondalık kurus (₺15,001.33) | Her yerde `NUMERIC(12,2)`, yuvarlama server-side (Math.round × 100 / 100) |
| 17 | `generate` endpoint iki kez çalışması | `UNIQUE(contract_id, period_start)` + idempotent kontrol |
| 18 | Kullanıcı yanlış ödeme girişi | `DELETE /payments/:id` sadece 24 saat; sonrası için negatif düzeltme kaydı |

---

## API-First & Mobil Hazırlık Notu

Tüm iş kuralları (`applyPayment`, `generateCharges`, `updateOverdue`, `prorateAmount`) **Next.js API route handler'larında veya ayrı bir `lib/` service katmanında** tutuluyor. Frontend (React) saf CRUD isteği yapar, hesaplama yapmaz.

Bu sayede:
- **React Native mobil**: Aynı `/api/v1/` endpoint'leri, sıfır iş kuralı kopyası
- **Electron**: `electron-next` ile `localhost:3000`'e proxy, aynı API
- **3. parti entegrasyon**: Muhasebe yazılımı, SMS servisi, vs. aynı API'yi kullanır
