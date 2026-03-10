'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  Card, PageHeader, Btn,
  Modal, ModalBody, ModalFooter,
  toast,
} from '@/components/ui';

export default function SettingsPage() {
  const [open,      setOpen]      = useState(false);
  const [resetting, setResetting] = useState(false);

  async function resetData() {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-db', { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Hata');

      toast.success('Veriler silindi. Uygulama yeniden başlatılıyor...');
      setOpen(false);

      // Electron ortamında relaunch; tarayıcıda sadece bilgi ver
      setTimeout(() => {
        const w = window as unknown as { electronAPI?: { relaunch: () => void } };
        if (w.electronAPI) {
          w.electronAPI.relaunch();
        }
      }, 1200);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <PageHeader title="Ayarlar" desc="Uygulama ve hesap ayarları" />

      <Card>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text)', margin: '0 0 4px' }}>
                Verileri Sıfırla
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
                Tüm kayıtlar (sahip, bina, daire, kiracı, sözleşme, ödeme) kalıcı olarak silinir.
                Bu işlem geri alınamaz.
              </p>
            </div>
            <Btn variant="destructive" onClick={() => setOpen(true)} style={{ flexShrink: 0 }}>
              <Trash2 size={14} />
              Verileri Sıfırla
            </Btn>
          </div>
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Verileri Sıfırla" width={420}>
        <ModalBody>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6 }}>
            Tüm veriler kalıcı olarak silinecek ve uygulama yeniden başlatılacak.
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--red)', marginTop: 12, fontWeight: 500 }}>
            Bu işlem geri alınamaz. Emin misiniz?
          </p>
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => setOpen(false)}>İptal</Btn>
          <Btn variant="destructive" onClick={resetData} disabled={resetting}>
            {resetting ? 'Siliniyor...' : 'Evet, Sıfırla'}
          </Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}
