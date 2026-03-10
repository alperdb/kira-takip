'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, BarChart3 } from 'lucide-react';
import {
  Card, PageHeader, Btn, DataTable, Td, TRow, TableSkeleton,
} from '@/components/ui';

type Row = {
  key:       string;
  month:     string;
  alacak:    number;
  tahsilat:  number;
  gider:     number;
  net:       number;
};

type Report = {
  year:    number;
  rows:    Row[];
  totals:  { alacak: number; tahsilat: number; gider: number; net: number };
};

const COLS = [
  { label: 'Ay'                    },
  { label: 'Alacak',   right: true },
  { label: 'Tahsilat', right: true },
  { label: 'Gider',    right: true },
  { label: 'Net',      right: true },
];

function fmt(n: number) {
  return `₺${Math.abs(n).toLocaleString('tr-TR')}`;
}

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

export default function ReportsPage() {
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

  function downloadCsv() {
    if (!report) return;
    const header = 'Ay,Alacak,Tahsilat,Gider,Net\n';
    const lines  = report.rows.map(r =>
      `${r.month},${r.alacak},${r.tahsilat},${r.gider},${r.net}`
    ).join('\n');
    const footer = `\nToplam,${report.totals.alacak},${report.totals.tahsilat},${report.totals.gider},${report.totals.net}`;
    const csv    = header + lines + footer;
    const blob   = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href     = url;
    a.download = `kira-rapor-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <>
      <PageHeader
        title="Raporlar"
        desc="Aylık ve yıllık mali özet"
        action={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ width: 'auto', minWidth: 100 }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <Btn onClick={downloadCsv} disabled={!report || report.rows.length === 0} variant="outline">
              <Download size={14} />
              CSV İndir
            </Btn>
          </div>
        }
      />

      {/* Yearly totals */}
      {report && report.rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Toplam Alacak',   value: fmt(report.totals.alacak),   color: 'var(--text)'    },
            { label: 'Toplam Tahsilat', value: fmt(report.totals.tahsilat), color: 'var(--green)'   },
            { label: 'Toplam Gider',    value: fmt(report.totals.gider),    color: 'var(--red)'     },
            { label: 'Net Gelir',       value: (report.totals.net < 0 ? '−' : '+') + fmt(report.totals.net), color: report.totals.net >= 0 ? 'var(--green)' : 'var(--red)' },
          ].map(item => (
            <Card key={item.label} style={{ padding: '16px 20px' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>
                {item.label}
              </p>
              <p style={{ fontSize: '1.25rem', fontWeight: 700, color: item.color, fontFamily: 'ui-monospace, monospace', margin: 0, letterSpacing: '-0.02em' }}>
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
            {/* Totals row */}
            <TRow>
              <Td><span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text)' }}>TOPLAM</span></Td>
              <Td right><span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{fmt(report.totals.alacak)}</span></Td>
              <Td right><span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--green)' }}>{fmt(report.totals.tahsilat)}</span></Td>
              <Td right><span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700, color: 'var(--red)' }}>−{fmt(report.totals.gider)}</span></Td>
              <Td right><NetCell n={report.totals.net} /></Td>
            </TRow>
          </DataTable>
        )}
      </Card>
    </>
  );
}
