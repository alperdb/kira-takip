'use client';

import { useRef, useState } from 'react';
import { Trash2, Download, Upload, AlertTriangle } from 'lucide-react';
import {
  Card, PageHeader, Btn,
  Modal, ModalBody, ModalFooter,
  toast,
} from '@/components/ui';

// ── Backup ────────────────────────────────────────────────────
function BackupSection() {
  const [loading, setLoading] = useState(false);

  async function handleBackup() {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/backup');
      if (!res.ok) throw new Error((await res.json()).error ?? 'Yedek alınamadı');
      const blob     = await res.blob();
      const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'kira-backup.backup';
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Yedek dosyası indirildi');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SettingRow
      title="Veritabanı Yedeği Al"
      desc="Tüm verileri (kiracılar, sözleşmeler, ödemeler) tek bir .backup dosyasına dışa aktar."
    >
      <Btn onClick={handleBackup} disabled={loading} variant="outline">
        <Download size={14} />
        {loading ? 'Hazırlanıyor...' : 'Yedek İndir'}
      </Btn>
    </SettingRow>
  );
}

// ── Restore ───────────────────────────────────────────────────
function RestoreSection() {
  const fileRef              = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [restoring,   setRestoring]   = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setPendingFile(f);
    setConfirmOpen(true);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }

  async function handleRestore() {
    if (!pendingFile) return;
    setRestoring(true);
    try {
      const form = new FormData();
      form.append('file', pendingFile);

      const res = await fetch('/api/settings/restore', { method: 'POST', body: form });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Geri yükleme başarısız');

      toast.success('Yedek geri yüklendi. Uygulama yeniden başlatılıyor...');
      setConfirmOpen(false);

      setTimeout(() => {
        const w = window as unknown as { electronAPI?: { relaunch: () => void } };
        if (w.electronAPI?.relaunch) {
          w.electronAPI.relaunch();
        } else {
          window.location.reload();
        }
      }, 1200);
    } catch (e: unknown) {
      toast.error((e as Error).message);
      setRestoring(false);
    }
  }

  return (
    <>
      <SettingRow
        title="Yedekten Geri Yükle"
        desc="Daha önce alınan bir yedek dosyasından (.db veya .backup) tüm verileri geri yükle. Mevcut veriler silinir."
      >
        <input
          ref={fileRef}
          type="file"
          accept=".backup,.db"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Btn variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload size={14} />
          Yedek Seç
        </Btn>
      </SettingRow>

      <Modal open={confirmOpen} onClose={() => { setConfirmOpen(false); setPendingFile(null); }} title="Geri Yüklemeyi Onayla" width={440}>
        <ModalBody>
          <div style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '14px 16px', borderRadius: 10,
            background: 'rgba(220,74,74,0.07)',
            border: '1px solid rgba(220,74,74,0.2)',
            marginBottom: 16,
          }}>
            <AlertTriangle size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', margin: '0 0 4px' }}>
                Bu işlem mevcut tüm verilerin üzerine yazar
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
                Sözleşmeler, kiracılar, ödemeler ve tüm kayıtlar seçilen yedekle değiştirilecek.
                Bu işlem geri alınamaz.
              </p>
            </div>
          </div>

          {pendingFile && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              fontSize: '0.8125rem', color: 'var(--muted)',
            }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>Dosya: </span>
              {pendingFile.name}
              <span style={{ marginLeft: 8 }}>
                ({(pendingFile.size / 1024).toFixed(0)} KB)
              </span>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => { setConfirmOpen(false); setPendingFile(null); }}>
            İptal
          </Btn>
          <Btn variant="destructive" onClick={handleRestore} disabled={restoring}>
            {restoring ? 'Geri Yükleniyor...' : 'Evet, Geri Yükle'}
          </Btn>
        </ModalFooter>
      </Modal>
    </>
  );
}

// ── Reset ─────────────────────────────────────────────────────
function ResetSection() {
  const [open,      setOpen]      = useState(false);
  const [resetting, setResetting] = useState(false);

  async function resetData() {
    setResetting(true);
    try {
      const res = await fetch('/api/admin/reset-db', { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Hata');
      toast.success('Veriler silindi. Uygulama yeniden başlatılıyor...');
      setOpen(false);
      setTimeout(() => {
        const w = window as unknown as { electronAPI?: { relaunch: () => void } };
        if (w.electronAPI?.relaunch) w.electronAPI.relaunch();
      }, 1200);
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <SettingRow
        title="Verileri Sıfırla"
        desc="Tüm kayıtlar (sahip, bina, daire, kiracı, sözleşme, ödeme) kalıcı olarak silinir. Bu işlem geri alınamaz."
        danger
      >
        <Btn variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 size={14} />
          Verileri Sıfırla
        </Btn>
      </SettingRow>

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

// ── Layout helpers ────────────────────────────────────────────
function SettingRow({
  title, desc, danger, children,
}: {
  title: string; desc: string; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24,
      padding: '20px 24px',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontWeight: 600, fontSize: '0.9375rem', margin: '0 0 4px',
          color: danger ? 'var(--red)' : 'var(--text)',
        }}>
          {title}
        </p>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted)', margin: 0 }}>
          {desc}
        </p>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Ayarlar" desc="Yedekleme ve uygulama yönetimi" />

      <div style={{
        fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        padding: '0 2px',
      }}>
        Veritabanı Yedekleme
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <BackupSection />
        <div style={{ padding: '0 24px' }}>
          <div style={{ height: 1, background: 'var(--border)' }} />
        </div>
        <RestoreSection />
      </Card>

      <div style={{
        fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        padding: '0 2px', marginTop: 4,
      }}>
        Tehlikeli Alan
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <ResetSection />
      </Card>
    </>
  );
}
