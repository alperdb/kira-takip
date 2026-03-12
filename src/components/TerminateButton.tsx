'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PowerOff } from 'lucide-react';
import { Modal, ModalBody, ModalFooter, Btn, toast } from '@/components/ui';

export function TerminateButton({
  contractId,
  label,
}: {
  contractId: number;
  label: string;
}) {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);

  async function handleTerminate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/terminate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ terminationDate: new Date().toISOString() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Sonlandırma başarısız');
      }
      toast.success(`${label} sonlandırıldı`);
      setOpen(false);
      router.refresh();
    } catch (e: unknown) {
      toast.error((e as Error).message);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        aria-label={`${label} sonlandır`}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          height: 28, padding: '0 10px', borderRadius: 6,
          border: '1px solid var(--border)', cursor: 'pointer',
          background: 'transparent', color: 'var(--muted)',
          fontSize: '0.8125rem', fontWeight: 600,
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = 'var(--red)';
          b.style.color       = 'var(--red)';
          b.style.background  = 'var(--red-bg)';
        }}
        onMouseLeave={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = 'var(--border)';
          b.style.color       = 'var(--muted)';
          b.style.background  = 'transparent';
        }}
      >
        <PowerOff size={12} strokeWidth={2.5} />
        Sonlandır
      </button>

      <Modal open={open} onClose={() => !loading && setOpen(false)} title="Sözleşmeyi Sonlandır" width={420}>
        <ModalBody>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            <strong>{label}</strong> sözleşmesini bugün itibarıyla sonlandırmak istiyor musunuz?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--amber)', marginTop: 8, fontWeight: 500, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            Daire boş olarak işaretlenecek ve sözleşme durumu &quot;Sonlandırıldı&quot; olacak.
          </p>
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => setOpen(false)} disabled={loading}>İptal</Btn>
          <Btn variant="destructive" onClick={handleTerminate} disabled={loading}>
            {loading ? 'Sonlandırılıyor...' : 'Evet, Sonlandır'}
          </Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}
