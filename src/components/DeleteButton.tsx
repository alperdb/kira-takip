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
  mode = 'delete',
}: {
  endpoint: string;
  label: string;
  onDeleted?: () => void;
  errorAction?: { label: string; href: string };
  warningText?: string;
  mode?: 'delete' | 'archive';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isArchive   = mode === 'archive';
  const actionVerb  = isArchive ? 'Arşivle'   : 'Sil';
  const actionVerbP = isArchive ? 'Arşivlendi' : 'Silindi';
  const modalTitle  = isArchive ? 'Kaydı Arşivle' : 'Kaydı Sil';

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `${actionVerb} başarısız`);
      }
      toast.success(`${label} ${actionVerbP.toLowerCase()}`);
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
      <Tooltip text={actionVerb} hide={deleting}>
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

      <Modal open={open} onClose={() => !deleting && setOpen(false)} title={modalTitle} width={400}>
        <ModalBody>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            <strong>{label}</strong> kaydını {isArchive ? 'arşivlemek' : 'kalıcı olarak silmek'} istediğinizden emin misiniz?
          </p>
          <p style={{ fontSize: '0.875rem', color: isArchive ? 'var(--muted)' : 'var(--red)', marginTop: 8, fontWeight: 500, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {warningText ?? (isArchive ? 'Arşivlenen kayıtlar listede görünmez ancak veritabanında saklanır.' : 'Bu işlem geri alınamaz.')}
          </p>
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => setOpen(false)} disabled={deleting}>İptal</Btn>
          <Btn variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? `${actionVerb}iyor...` : `Evet, ${actionVerb}`}
          </Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}
