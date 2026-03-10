# Kira Artışı — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `/contracts/[id]` "Sözleşme Yenile" sayfasına TÜFE/manuel kira artışı formu, son artış özeti ve geçmiş artışlar listesi ekle.

**Architecture:** Yeni `ContractIncrease.increaseType` + `ratePercent` alanları; `Contract.currentRent` denormalized alanı; server component detail page + client component form; mevcut `/api/contracts/[id]/increases` POST endpoint güncellenir; hesaplama: `newRent = oldRent × (1 + rate/100)`, 2 decimal.

**Tech Stack:** Next.js 16 App Router, Prisma 5 + SQLite, TypeScript, mevcut `Card/Field/Btn/toast` UI bileşenleri.

---

### Task 1: Schema migration

**Files:**
- Modify: `prisma/schema.prisma`
- Run: `npx prisma migrate dev --name add_rent_increase_fields`

**Step 1: schema.prisma oku**

`prisma/schema.prisma` dosyasını oku. `ContractIncrease` ve `Contract` modellerini gör.

**Step 2: ContractIncrease modeline alanlar ekle**

`ContractIncrease` modelinde `reason        String` satırını bul:

Mevcut:
```prisma
  reason        String
  notes         String?
  createdAt     DateTime @default(now()) @map("created_at")
```

Yeni:
```prisma
  reason        String?
  increaseType  String   @default("manual") @map("increase_type")
  ratePercent   Float?   @map("rate_percent")
  notes         String?
  createdAt     DateTime @default(now()) @map("created_at")
```

**Step 3: Contract modeline currentRent ekle**

`Contract` modelinde `status String @default("active")` satırından sonra:

Mevcut:
```prisma
  status            String   @default("active")
  terminationDate   DateTime? @map("termination_date")
```

Yeni:
```prisma
  status            String   @default("active")
  currentRent       Float?   @map("current_rent")
  terminationDate   DateTime? @map("termination_date")
```

**Step 4: Migration uygula**

```bash
cd /c/Users/steam/Desktop/ClaudeProjects/kira-app
npx prisma migrate dev --name add_rent_increase_fields
```

Expected: "The following migration(s) have been created and applied"

Non-interactive ortamda çalışmazsa `db push` kullan:
```bash
npx prisma db push
```

**Step 5: Prisma client yenile**

```bash
npx prisma generate
```

**Step 6: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: hata yok.

---

### Task 2: API endpoint güncelle — POST /api/contracts/[id]/increases

**Files:**
- Modify: `src/app/api/contracts/[id]/increases/route.ts`

**Step 1: Mevcut dosyayı oku**

`src/app/api/contracts/[id]/increases/route.ts` oku.

**Step 2: POST handler'ı yeniden yaz**

Mevcut POST handler'ı şu şekilde değiştir:

```ts
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { effectiveDate, increaseType, ratePercent, notes } = await req.json();

    // Validasyon
    if (!effectiveDate || !increaseType) {
      return NextResponse.json(
        { error: 'effectiveDate ve increaseType zorunlu' },
        { status: 400 },
      );
    }

    const rate = Number(ratePercent ?? 0);
    if (isNaN(rate) || rate < 0) {
      return NextResponse.json(
        { error: 'ratePercent sıfır veya pozitif olmalı' },
        { status: 400 },
      );
    }

    if (!['monthly_tufe', 'avg12_tufe', 'manual'].includes(increaseType)) {
      return NextResponse.json(
        { error: 'increaseType: monthly_tufe | avg12_tufe | manual olmalı' },
        { status: 400 },
      );
    }

    // Sözleşme bul
    const contract = await prisma.contract.findUnique({ where: { id: Number(id) } });
    if (!contract) return NextResponse.json({ error: 'Sözleşme bulunamadı' }, { status: 404 });

    // Geçerli kira tutarını bul (son artış veya orijinal kira)
    const lastIncrease = await prisma.contractIncrease.findFirst({
      where:   { contractId: Number(id) },
      orderBy: { effectiveDate: 'desc' },
    });
    const oldRent = lastIncrease
      ? Number(lastIncrease.newAmount)
      : Number(contract.currentRent ?? contract.rentAmount);

    // Yeni kira: 2 decimal yuvarlama
    const newRent = Math.round(oldRent * (1 + rate / 100) * 100) / 100;

    // Transaction: artış kaydı + contract.currentRent güncelle
    const [increase] = await prisma.$transaction([
      prisma.contractIncrease.create({
        data: {
          contractId:    Number(id),
          effectiveDate: new Date(effectiveDate),
          oldAmount:     oldRent,
          newAmount:     newRent,
          increaseType,
          ratePercent:   rate,
          notes:         notes ?? null,
        },
      }),
      prisma.contract.update({
        where: { id: Number(id) },
        data:  { currentRent: newRent },
      }),
    ]);

    return NextResponse.json(increase, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
```

**Step 3: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | grep "increases"
```

Expected: çıktı yok (hata yok).

---

### Task 3: Contracts list — "Yenile" butonu

**Files:**
- Modify: `src/app/contracts/page.tsx`

**Step 1: Mevcut dosyayı oku**

`src/app/contracts/page.tsx` oku. `import Link from 'next/link'` yok, eklenecek.

**Step 2: Import ekle**

Dosyanın en başına (mevcut import'ların arasına):
```tsx
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
```

**Step 3: COLS'a "Yenile" sütunu ekle**

Mevcut COLS:
```tsx
const COLS = [
  ...
  { label: ''         },
];
```

"Kira / Ay" sütunundan sonra ekle — son `{ label: '' }` kalacak şekilde, sadece "Yenile" sütununu da ekle. Aslında mevcut son boş sütun silinmeden önce bir sütun ekle:

```tsx
const COLS = [
  { label: 'Daire'    },
  { label: 'Kiracı'   },
  { label: 'Başlangıç'},
  { label: 'Bitiş'    },
  { label: 'Kira / Ay',  right: true },
  { label: 'Depozito',   right: true },
  { label: 'Durum'    },
  { label: ''         },  // Yenile linki
  { label: ''         },  // Delete butonu
];
```

**Step 4: Her satıra "Yenile" hücresi ekle**

`TRow` içindeki `DeleteButton`'dan hemen önce:

```tsx
<Td>
  {c.status === 'active' && (
    <Link
      href={`/contracts/${c.id}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 6,
        fontSize: '0.8125rem', fontWeight: 600,
        background: 'var(--primary-bg)', color: 'var(--primary)',
        border: '1px solid var(--primary-ring)',
        textDecoration: 'none',
      }}
    >
      <TrendingUp size={12} />
      Yenile
    </Link>
  )}
</Td>
```

**Step 5: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | grep "contracts/page"
```

Expected: hata yok.

---

### Task 4: RentIncreaseForm client component

**Files:**
- Create: `src/app/contracts/[id]/RentIncreaseForm.tsx`

**Step 1: Dosyayı oluştur**

`src/app/contracts/[id]/RentIncreaseForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Btn, Card,
  Field, FieldRow, SectionLabel, FormAlert, Select, NumberInput, DateInput,
  toast,
} from '@/components/ui';
import { TrendingUp } from 'lucide-react';

type Props = {
  contractId: number;
  currentRent: number;
};

const TYPE_LABELS: Record<string, string> = {
  monthly_tufe: 'Aylık TÜFE',
  avg12_tufe:   '12A Ort. TÜFE',
  manual:       'Manuel',
};

export function RentIncreaseForm({ contractId, currentRent }: Props) {
  const router = useRouter();

  const today = new Date().toISOString().split('T')[0];

  const [increaseType,   setIncreaseType]   = useState('manual');
  const [ratePercent,    setRatePercent]     = useState('');
  const [effectiveDate,  setEffectiveDate]   = useState(today);
  const [notes,          setNotes]           = useState('');
  const [loading,        setLoading]         = useState(false);
  const [apiError,       setApiError]        = useState('');

  // Otomatik hesap
  const rate     = parseFloat(ratePercent) || 0;
  const newRent  = rate >= 0 ? Math.round(currentRent * (1 + rate / 100) * 100) / 100 : null;

  async function save() {
    setApiError('');
    if (!ratePercent || rate < 0) {
      setApiError('Oran sıfır veya pozitif olmalı');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/increases`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ effectiveDate, increaseType, ratePercent: rate, notes: notes || null }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Kayıt başarısız');
      }
      toast.success('Kira artışı kaydedildi');
      setRatePercent('');
      setNotes('');
      router.refresh();
    } catch (e: unknown) {
      setApiError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--primary-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <TrendingUp size={15} color="var(--primary)" strokeWidth={2.5} />
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: 0, color: 'var(--text)' }}>
            Kira Artışı
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
            Yeni kira otomatik hesaplanır
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SectionLabel>Artış Bilgileri</SectionLabel>

        {/* Artış tipi + Oran yan yana */}
        <FieldRow>
          <Field label="Artış Tipi">
            <Select value={increaseType} onChange={e => setIncreaseType(e.target.value)}>
              <option value="monthly_tufe">Aylık TÜFE</option>
              <option value="avg12_tufe">12A Ort. TÜFE</option>
              <option value="manual">Manuel</option>
            </Select>
          </Field>

          <Field label="Oran (%)" required>
            <NumberInput
              value={ratePercent}
              onChange={e => setRatePercent(e.target.value)}
              placeholder="örn. 48.5"
              min={0}
              step={0.01}
            />
          </Field>
        </FieldRow>

        {/* Geçerlilik tarihi */}
        <Field label="Geçerlilik Tarihi" required>
          <DateInput
            value={effectiveDate}
            onChange={e => setEffectiveDate(e.target.value)}
          />
        </Field>

        {/* Kira özeti */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12, padding: '14px 16px',
          background: 'var(--surface2)', borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          <div>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Eski Kira
            </p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', fontFamily: 'ui-monospace, monospace', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
              ₺{currentRent.toLocaleString('tr-TR')}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Yeni Kira
            </p>
            <p style={{ fontSize: '1.125rem', fontWeight: 700, color: newRent != null ? 'var(--green)' : 'var(--subtle)', fontFamily: 'ui-monospace, monospace', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
              {newRent != null ? `₺${newRent.toLocaleString('tr-TR')}` : '—'}
            </p>
          </div>
        </div>

        {/* Notlar */}
        <Field label="Notlar">
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="İsteğe bağlı not..."
          />
        </Field>

        {apiError && <FormAlert>{apiError}</FormAlert>}

        <Btn onClick={save} disabled={loading || !ratePercent}>
          {loading ? 'Kaydediliyor...' : 'Artışı Kaydet'}
        </Btn>
      </div>
    </Card>
  );
}
```

**Step 2: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | grep "RentIncreaseForm"
```

Expected: hata yok.

---

### Task 5: Contract detail page — server component

**Files:**
- Create: `src/app/contracts/[id]/page.tsx`

**Step 1: Dizin oluştur ve sayfayı yaz**

`src/app/contracts/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card, PageHeader, Badge, Money } from '@/components/ui';
import { RentIncreaseForm } from './RentIncreaseForm';
import { ArrowLeft, TrendingUp } from 'lucide-react';

type Params = { params: Promise<{ id: string }> };

const TYPE_LABELS: Record<string, string> = {
  monthly_tufe: 'Aylık TÜFE',
  avg12_tufe:   '12A Ort. TÜFE',
  manual:       'Manuel',
};

export default async function ContractDetailPage({ params }: Params) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id: Number(id) },
    include: {
      unit:   { select: { unitNo: true, property: { select: { title: true } } } },
      tenant: { select: { name: true, phone: true } },
      increases: {
        orderBy: { effectiveDate: 'desc' },
        take: 4,  // son artış (1) + geçmiş (3)
      },
    },
  });

  if (!contract) notFound();

  // Geçerli kira: son artışın newAmount veya orijinal rentAmount
  const effectiveRent = contract.currentRent
    ? Number(contract.currentRent)
    : Number(contract.rentAmount);

  const lastIncrease = contract.increases[0] ?? null;
  const historyItems = contract.increases.slice(1, 4); // son 3

  return (
    <>
      {/* Geri linki */}
      <div style={{ marginBottom: 4 }}>
        <Link
          href="/contracts"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: '0.8125rem', color: 'var(--muted)', textDecoration: 'none',
          }}
        >
          <ArrowLeft size={14} />
          Sözleşmeler
        </Link>
      </div>

      <PageHeader
        title="Sözleşme Yenile"
        desc={`${contract.unit.property.title} · ${contract.unit.unitNo} — ${contract.tenant.name}`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* Sol: Artış formu */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <RentIncreaseForm
            contractId={contract.id}
            currentRent={effectiveRent}
          />
        </div>

        {/* Sağ: Özet + Geçmiş */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Sözleşme özeti */}
          <Card style={{ padding: '20px 24px' }}>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 14px', color: 'var(--text)' }}>
              Sözleşme Bilgileri
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SummaryRow label="Kiracı"    value={contract.tenant.name} />
              <SummaryRow label="Daire"     value={`${contract.unit.property.title} · ${contract.unit.unitNo}`} />
              <SummaryRow label="Başlangıç" value={new Date(contract.startDate).toLocaleDateString('tr-TR')} />
              {contract.endDate && (
                <SummaryRow label="Bitiş" value={new Date(contract.endDate).toLocaleDateString('tr-TR')} />
              )}
              <SummaryRow label="Durum"     value={<Badge status={contract.status} />} />
              <SummaryRow
                label="Mevcut Kira"
                value={
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--text)' }}>
                    ₺{effectiveRent.toLocaleString('tr-TR')}
                  </span>
                }
              />
            </div>
          </Card>

          {/* Son artış */}
          {lastIncrease && (
            <Card style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <TrendingUp size={14} color="var(--green)" />
                <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: 0, color: 'var(--text)' }}>
                  Son Artış
                </p>
              </div>
              <IncreaseRow increase={lastIncrease} />
            </Card>
          )}

          {/* Geçmiş artışlar */}
          {historyItems.length > 0 && (
            <Card style={{ padding: '20px 24px' }}>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', margin: '0 0 12px', color: 'var(--text)' }}>
                Geçmiş Artışlar (son 3)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {historyItems.map(inc => (
                  <IncreaseRow key={inc.id} increase={inc} />
                ))}
              </div>
            </Card>
          )}

          {!lastIncrease && (
            <Card style={{ padding: '20px 24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--subtle)', fontSize: '0.875rem', margin: 0 }}>
                Henüz kira artışı uygulanmamış.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

// ── Yardımcı bileşenler ──────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: '0.8125rem', color: 'var(--muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

type IncreaseRecord = {
  id: number;
  effectiveDate: Date;
  oldAmount: number;
  newAmount: number;
  increaseType: string;
  ratePercent: number | null;
};

function IncreaseRow({ increase: inc }: { increase: IncreaseRecord }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: 'var(--surface2)', border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)' }}>
          {TYPE_LABELS[inc.increaseType] ?? inc.increaseType}
          {inc.ratePercent != null && ` · %${inc.ratePercent.toLocaleString('tr-TR')}`}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--subtle)' }}>
          {new Date(inc.effectiveDate).toLocaleDateString('tr-TR')}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem', color: 'var(--muted)', textDecoration: 'line-through' }}>
          ₺{Number(inc.oldAmount).toLocaleString('tr-TR')}
        </span>
        <span style={{ color: 'var(--subtle)', fontSize: '0.75rem' }}>→</span>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem', fontWeight: 700, color: 'var(--green)' }}>
          ₺{Number(inc.newAmount).toLocaleString('tr-TR')}
        </span>
      </div>
    </div>
  );
}
```

**Step 2: TypeScript kontrolü**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: hata yok.

---

### Task 6: Uçtan uca doğrulama

**Step 1: Full TypeScript kontrolü**

```bash
cd /c/Users/steam/Desktop/ClaudeProjects/kira-app
npx tsc --noEmit 2>&1
```

**Step 2: Next.js build**

```bash
npm run build 2>&1 | tail -20
```

Expected: hatasız build, `/contracts/[id]` route listede görünüyor.

**Step 3: Kontrol listesi (dev server ile)**

- `/contracts` → Her aktif sözleşme satırında "Yenile" butonu
- `/contracts/[id]` → Sözleşme bilgileri + artış formu
- Artış tipi seç (Aylık TÜFE), oran gir (48.5) → "Yeni Kira" otomatik hesaplanıyor
- Kaydet → toast.success, sayfa refresh, "Son Artış" görünüyor
- Tekrar artış kaydet → "Geçmiş Artışlar" güncelleniyor

---

## Değişiklik Özeti

| Dosya | İşlem |
|---|---|
| `prisma/schema.prisma` | `ContractIncrease.increaseType` + `ratePercent`; `Contract.currentRent` |
| `src/app/api/contracts/[id]/increases/route.ts` | POST handler yeniden yazıldı |
| `src/app/contracts/page.tsx` | "Yenile" link butonu eklendi |
| `src/app/contracts/[id]/page.tsx` | Yeni — detail/renew sayfası |
| `src/app/contracts/[id]/RentIncreaseForm.tsx` | Yeni — client form bileşeni |
