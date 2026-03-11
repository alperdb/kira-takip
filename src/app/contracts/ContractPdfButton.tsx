'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from '@/components/ui';

export function ContractPdfButton({ contractId }: { contractId: number }) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/pdf`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF oluşturulamadı' }));
        throw new Error(err.error ?? 'PDF oluşturulamadı');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `sozlesme-${contractId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', borderRadius: 6,
        fontSize: '0.8125rem', fontWeight: 600,
        background: 'var(--primary-bg)', color: 'var(--primary)',
        border: '1px solid var(--primary-ring)',
        cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
      title="PDF İndir"
    >
      <FileDown size={12} />
      {loading ? '...' : 'PDF'}
    </button>
  );
}
