'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CHF';
const SUPPORTED: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'CHF'];

const LS_KEY = 'kira-tcmb-prev-rates';

type RateEntry = { buying: number; selling: number };
type RateMap   = Record<CurrencyCode, RateEntry>;

type StoredRates = {
  date:  string;  // YYYY-MM-DD
  rates: Record<string, number>; // code → buying
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Trend = 'up' | 'down' | 'neutral';

function getTrend(current: number, prev: number | undefined): Trend {
  if (prev === undefined || isNaN(prev)) return 'neutral';
  if (current > prev + 0.0001) return 'up';
  if (current < prev - 0.0001) return 'down';
  return 'neutral';
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === 'up')   return <ArrowUpRight   size={12} strokeWidth={2.5} color="var(--green)" />;
  if (trend === 'down') return <ArrowDownRight size={12} strokeWidth={2.5} color="var(--red)"   />;
  return <Minus size={11} strokeWidth={2} color="var(--subtle)" />;
}

export function RateBand() {
  const [rates,   setRates]   = useState<RateMap | null>(null);
  const [prevMap, setPrevMap] = useState<Record<string, number>>({});
  const [updated, setUpdated] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/exchange-rates');
        if (!res.ok) return;
        const data = await res.json() as RateMap & { fetchedAt?: string };

        // Build current buying map
        const currentBuying: Record<string, number> = {};
        for (const code of SUPPORTED) {
          if (data[code]) currentBuying[code] = data[code].buying;
        }

        // Load previous rates from localStorage
        const today = todayStr();
        let prev: Record<string, number> = {};
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) {
            const stored: StoredRates = JSON.parse(raw);
            // Only use stored rates for comparison if they're from a different day
            if (stored.date !== today) {
              prev = stored.rates;
            }
          }
        } catch { /* ignore */ }

        // Save today's rates for next session's comparison
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({ date: today, rates: currentBuying }));
        } catch { /* ignore */ }

        setPrevMap(prev);
        setRates(data);

        // Format update time
        if (data.fetchedAt) {
          const d = new Date(data.fetchedAt);
          setUpdated(d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
        }
      } catch { /* ignore */ }
    }
    load();
  }, []);

  if (!rates) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {SUPPORTED.filter(c => rates[c]).map(code => {
        const buying = rates[code].buying;
        const trend  = getTrend(buying, prevMap[code]);
        return (
          <div key={code} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em',
              color: 'var(--subtle)', textTransform: 'uppercase',
            }}>
              {code}
            </span>
            <span style={{
              fontWeight: 700, color: 'var(--text)',
              fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem',
              letterSpacing: '-0.02em',
            }}>
              ₺{buying.toLocaleString('tr-TR', { minimumFractionDigits: 4 })}
            </span>
            <TrendIcon trend={trend} />
          </div>
        );
      })}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em',
          color: 'var(--subtle)', textTransform: 'uppercase',
          background: 'var(--surface2)', border: '1px solid var(--border)',
          padding: '3px 8px', borderRadius: 6,
        }}>
          TCMB
        </span>
        {updated && (
          <span style={{ fontSize: '0.6875rem', color: 'var(--subtle)' }}>
            {updated}
          </span>
        )}
      </div>
    </div>
  );
}
