'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, BarChart3, ChevronDown } from 'lucide-react';
import {
  Card, PageHeader, Btn, DataTable, Td, TRow, TableSkeleton,
} from '@/components/ui';
import { BuildingIncomeTab  } from './BuildingIncomeTab';
import { TenantsBalanceTab  } from './TenantsBalanceTab';
import { PaymentHistoryTab  } from './PaymentHistoryTab';

type Row = {
  key:      string;
  month:    string;
  alacak:   number;
  tahsilat: number;
  gider:    number;
  net:      number;
};

type Report = {
  year:   number;
  rows:   Row[];
  totals: { alacak: number; tahsilat: number; gider: number; net: number };
};

const TABS = ['Aylık Özet', 'Bina Gelirleri', 'Kiracı Bakiyeleri', 'Ödeme Geçmişi'];

const COLS = [
  { label: 'Ay'                    },
  { label: 'Alacak',   right: true },
  { label: 'Tahsilat', right: true },
  { label: 'Gider',    right: true },
  { label: 'Net',      right: true },
];

const fmt = (n: number) =>
  `₺${Math.abs(n).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;

function NetCell({ n }: { n: number }) {
  return (
    <span style={{
      fontFamily: 'ui-monospace, monospace', fontWeight: 700,
      color: n >= 0 ? 'var(--green)' : 'var(--red)',
    }}>
      {n < 0 ? '−' : '+'}{fmt(n)}
    </span>
  );
}

function csvRow(cols: (string | number)[]): string {
  return cols.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';');
}

// ── Export dropdown ────────────────────────────────────────────
function ExportMenu({ report, year }: { report: Report | null; year: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  function downloadMonthlyCsv() {
    if (!report) return;
    const header = csvRow(['Ay', 'Alacak (₺)', 'Tahsilat (₺)', 'Gider (₺)', 'Net (₺)']);
    const rows   = report.rows.map(r =>
      csvRow([r.month, r.alacak.toFixed(2), r.tahsilat.toFixed(2), r.gider.toFixed(2), r.net.toFixed(2)])
    );
    const footer = csvRow(['TOPLAM', report.totals.alacak.toFixed(2), report.totals.tahsilat.toFixed(2), report.totals.gider.toFixed(2), report.totals.net.toFixed(2)]);
    const csv    = '\uFEFF' + [header, ...rows, footer].join('\r\n');
    triggerDownload(csv, `kira-rapor-${year}.csv`);
    setOpen(false);
  }

  function triggerDownload(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadFromApi(endpoint: string) {
    setOpen(false);
    const res = await fetch(endpoint);
    if (!res.ok) return;
    const blob     = await res.blob();
    const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'export.csv';
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const items = [
    { label: 'Aylık Özet',          desc: `${year} yılı aylık rapor`,              onClick: downloadMonthlyCsv,                            disabled: !report || report.rows.length === 0 },
    { label: 'Sözleşmeler',         desc: 'Tüm sözleşmeler ve detayları',          onClick: () => downloadFromApi('/api/export/contracts'),       disabled: false },
    { label: 'Kiracı Ödeme Geçmişi',desc: 'Kiracı bazlı alacak ve ödeme detayları',onClick: () => downloadFromApi('/api/export/tenant-payments'),  disabled: false },
    { label: 'Mülk Gelir Raporu',   desc: 'Mülk bazlı tahsilat ve doluluk özeti',  onClick: () => downloadFromApi('/api/export/property-income'),  disabled: false },
    { label: 'Alacak Yaşlandırma',  desc: 'Vadesi geçmiş alacakların yaş analizi', onClick: () => downloadFromApi('/api/export/receivables-aging'),disabled: false },
    { label: 'Alacaklar',           desc: 'Tüm kira alacakları',                   onClick: () => downloadFromApi('/api/export/receivables'),     disabled: false },
    { label: 'Ödemeler',            desc: 'Tüm tahsilat kayıtları',                onClick: () => downloadFromApi('/api/export/payments'),        disabled: false },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <Btn onClick={() => setOpen(o => !o)} variant="outline">
        <Download size={14} />
        CSV İndir
        <ChevronDown size={12} style={{ marginLeft: 2, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </Btn>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 240, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '6px 10px 4px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
              Dışa Aktar
            </p>
          </div>
          <div style={{ padding: 4 }}>
            {items.map(item => (
              <button
                key={item.label}
                onClick={item.onClick}
                disabled={item.disabled}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  width: '100%', padding: '8px 10px', borderRadius: 7,
                  background: 'none', border: 'none', cursor: item.disabled ? 'default' : 'pointer',
                  opacity: item.disabled ? 0.4 : 1, textAlign: 'left', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!item.disabled) (e.currentTarget).style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { (e.currentTarget).style.background = 'none'; }}
              >
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text)' }}>{item.label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 1 }}>{item.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Monthly summary tab ────────────────────────────────────────
function MonthlySummaryTab() {
  const currentYear = new Date().getFullYear();
  const [year,    setYear]    = useState(currentYear);
  const [report,  setReport]  = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?year=${year}`);
    setReport(res.ok ? await res.json() : null);
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Year selector */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{ width: 'auto', minWidth: 100 }}
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <ExportMenu report={report} year={year} />
      </div>

      {/* Yearly totals */}
      {report && report.rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { label: 'Toplam Alacak',   value: fmt(report.totals.alacak),   color: 'var(--text)'  },
            { label: 'Toplam Tahsilat', value: fmt(report.totals.tahsilat), color: 'var(--green)' },
            { label: 'Toplam Gider',    value: fmt(report.totals.gider),    color: 'var(--red)'   },
            { label: 'Net Gelir',       value: (report.totals.net < 0 ? '−' : '+') + fmt(report.totals.net), color: report.totals.net >= 0 ? 'var(--green)' : 'var(--red)' },
          ].map(item => (
            <Card key={item.label} style={{ padding: '14px 18px' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                {item.label}
              </p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: item.color, fontFamily: 'ui-monospace, monospace', margin: 0, letterSpacing: '-0.02em' }}>
                {item.value}
              </p>
            </Card>
          ))}
        </div>
      )}

      <Card>
        {loading ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody><TableSkeleton cols={5} rows={6} /></tbody>
          </table>
        ) : !report || report.rows.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <BarChart3 size={32} color="var(--border)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>
              {year} yılı için veri yok
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
              Alacak oluşturuldukça burada görünecek.
            </p>
          </div>
        ) : (
          <DataTable cols={COLS}>
            {report.rows.map(r => (
              <TRow key={r.key}>
                <Td><span style={{ fontWeight: 600 }}>{r.month}</span></Td>
                <Td right><span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--text)' }}>{fmt(r.alacak)}</span></Td>
                <Td right><span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--green)', fontWeight: 600 }}>{fmt(r.tahsilat)}</span></Td>
                <Td right><span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--red)' }}>−{fmt(r.gider)}</span></Td>
                <Td right><NetCell n={r.net} /></Td>
              </TRow>
            ))}
            <TRow>
              <Td><span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>TOPLAM</span></Td>
              <Td right><span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{fmt(report.totals.alacak)}</span></Td>
              <Td right><span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--green)' }}>{fmt(report.totals.tahsilat)}</span></Td>
              <Td right><span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--red)' }}>−{fmt(report.totals.gider)}</span></Td>
              <Td right><NetCell n={report.totals.net} /></Td>
            </TRow>
          </DataTable>
        )}
      </Card>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────
function TabBar({ active, onChange }: { active: number; onChange: (i: number) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 4,
      borderBottom: '1px solid var(--border)',
      marginBottom: 4,
    }}>
      {TABS.map((label, i) => (
        <button
          key={label}
          onClick={() => onChange(i)}
          style={{
            padding: '8px 16px',
            fontSize: '0.875rem',
            fontWeight: active === i ? 600 : 400,
            color: active === i ? 'var(--primary)' : 'var(--muted)',
            background: 'none',
            border: 'none',
            borderBottom: active === i ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -1,
            cursor: 'pointer',
            borderRadius: '6px 6px 0 0',
            transition: 'color 0.12s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState(0);

  return (
    <>
      <PageHeader
        title="Raporlar"
        desc="Mali özet, bina gelirleri ve ödeme geçmişi"
      />

      <TabBar active={tab} onChange={setTab} />

      {tab === 0 && <MonthlySummaryTab />}
      {tab === 1 && <BuildingIncomeTab />}
      {tab === 2 && <TenantsBalanceTab />}
      {tab === 3 && <PaymentHistoryTab />}
    </>
  );
}
