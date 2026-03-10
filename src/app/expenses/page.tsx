'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Receipt } from 'lucide-react';
import {
  Card, PageHeader, Btn, DataTable, Td, TRow,
  EmptyState, TableSkeleton, Money, Badge,
  Modal, ModalBody, ModalFooter,
  Field, FieldRow, SectionLabel, Select, NumberInput, DateInput,
  toast,
} from '@/components/ui';
import { DeleteButton } from '@/components/DeleteButton';

const CATEGORIES = ['Bakım', 'Tamir', 'Temizlik', 'Sigorta', 'Vergi', 'Yönetim', 'Elektrik', 'Su', 'Isıtma', 'Diğer'];

type Expense = {
  id:          number;
  amount:      number;
  date:        string;
  category:    string | null;
  description: string | null;
  property:    { id: number; title: string } | null;
};

type Property = { id: number; title: string };

const COLS = [
  { label: 'Tarih'    },
  { label: 'Mülk'     },
  { label: 'Kategori' },
  { label: 'Açıklama' },
  { label: 'Tutar', right: true },
  { label: ''          },
];

export default function ExpensesPage() {
  const [expenses,   setExpenses]   = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [open,       setOpen]       = useState(false);
  const [saving,     setSaving]     = useState(false);

  const [fProperty, setFProperty]   = useState('');
  const [fCategory, setFCategory]   = useState('');
  const [fAmount,   setFAmount]     = useState('');
  const [fDate,     setFDate]       = useState(new Date().toISOString().split('T')[0]);
  const [fDesc,     setFDesc]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/expenses');
    setExpenses(res.ok ? await res.json() : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/properties')
      .then(r => r.ok ? r.json() : [])
      .then(data => setProperties(Array.isArray(data) ? data : []));
  }, []);

  function resetForm() {
    setFProperty(''); setFCategory(''); setFAmount('');
    setFDate(new Date().toISOString().split('T')[0]); setFDesc('');
  }

  async function submit() {
    if (!fAmount || Number(fAmount) <= 0) { toast.error('Geçerli bir tutar girin'); return; }
    if (!fDate) { toast.error('Tarih zorunlu'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId:  fProperty || null,
          category:    fCategory || null,
          amount:      Number(fAmount),
          date:        fDate,
          description: fDesc || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Hata');
      toast.success('Gider kaydedildi');
      setOpen(false);
      resetForm();
      load();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <PageHeader
        title="Giderler"
        desc="Bakım, tamir ve operasyonel giderler"
        action={
          <Btn onClick={() => setOpen(true)}>
            <Plus size={14} /> Gider Ekle
          </Btn>
        }
      />

      {expenses.length > 0 && (
        <Card style={{ padding: '14px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
              {expenses.length} kayıt
            </span>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--red)', fontSize: '1rem' }}>
              −₺{total.toLocaleString('tr-TR')}
            </span>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><TableSkeleton cols={6} rows={5} /></tbody>
          </table>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Henüz gider eklenmedi"
            desc="Bakım, tamir ve diğer giderleri buradan takip edin."
          />
        ) : (
          <DataTable cols={COLS}>
            {expenses.map(e => (
              <TRow key={e.id}>
                <Td muted>{new Date(e.date).toLocaleDateString('tr-TR')}</Td>
                <Td>{e.property?.title ?? <span style={{ color: 'var(--subtle)' }}>—</span>}</Td>
                <Td>
                  {e.category
                    ? <Badge status={e.category} />
                    : <span style={{ color: 'var(--subtle)' }}>—</span>}
                </Td>
                <Td muted>{e.description ?? '—'}</Td>
                <Td right>
                  <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: 'var(--red)' }}>
                    −<Money amount={e.amount} currency="" />
                  </span>
                </Td>
                <Td>
                  <DeleteButton
                    endpoint={`/api/expenses/${e.id}`}
                    label={e.description ?? `Gider #${e.id}`}
                    onDeleted={load}
                  />
                </Td>
              </TRow>
            ))}
          </DataTable>
        )}
      </Card>

      <Modal open={open} onClose={() => { setOpen(false); resetForm(); }} title="Gider Ekle" width={480}>
        <ModalBody>
          <SectionLabel>Gider Bilgileri</SectionLabel>

          <FieldRow>
            <Field label="Tarih" required>
              <DateInput value={fDate} onChange={e => setFDate(e.target.value)} />
            </Field>
            <Field label="Tutar (₺)" required>
              <NumberInput value={fAmount} onChange={e => setFAmount(e.target.value)} placeholder="0.00" min={0.01} step={0.01} />
            </Field>
          </FieldRow>

          <FieldRow>
            <Field label="Mülk">
              <Select value={fProperty} onChange={e => setFProperty(e.target.value)}>
                <option value="">Genel (tüm mülkler)</option>
                {properties.map(p => (
                  <option key={p.id} value={String(p.id)}>{p.title}</option>
                ))}
              </Select>
            </Field>
            <Field label="Kategori">
              <Select value={fCategory} onChange={e => setFCategory(e.target.value)}>
                <option value="">Seçin...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>
          </FieldRow>

          <Field label="Açıklama">
            <input
              type="text"
              value={fDesc}
              onChange={e => setFDesc(e.target.value)}
              placeholder="Opsiyonel açıklama..."
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>İptal</Btn>
          <Btn onClick={submit} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}
