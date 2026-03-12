'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Modal, ModalBody, ModalFooter, Btn, toast, Tooltip } from '@/components/ui';

export function DeleteButton({
  endpoint,
  label,
  onDeleted,
  errorAction,
  warningText,
}: {
  endpoint: string;
  label: string;
  onDeleted?: () => void;
  errorAction?: { label: string; href: string };
  warningText?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Silme başarısız');
      }
      toast.success(`${label} silindi`);
      setOpen(false);
      if (onDeleted) {
        onDeleted();
      } else {
        router.refresh();
      }
    } catch (e: unknown) {
      const msg = (e as Error).message;
      toast.error(msg, {
        key: `delete-err-${endpoint}`,
        action: errorAction
          ? { label: errorAction.label, onClick: () => { window.location.href = errorAction.href; } }
          : undefined,
      });
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Tooltip text="Sil" hide={deleting}>
        <button
          onClick={e => { e.stopPropagation(); setOpen(true); }}
          aria-label={`${label} sil`}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 6,
            border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--subtle)',
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--red-bg)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--subtle)';
          }}
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>

      <Modal open={open} onClose={() => !deleting && setOpen(false)} title="Kaydı Sil" width={400}>
        <ModalBody>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            <strong>{label}</strong> kaydını kalıcı olarak silmek istediğinizden emin misiniz?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--red)', marginTop: 8, fontWeight: 500, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {warningText ?? 'Bu işlem geri alınamaz.'}
          </p>
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>İptal</Btn>
          <Btn variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Siliniyor...' : 'Evet, Sil'}
          </Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}
