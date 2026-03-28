'use client';

import { useRef, useState, useEffect, FormEvent } from 'react';
import { Trash2, Download, Upload, AlertTriangle, UserPlus, KeyRound } from 'lucide-react';
import {
  Card, PageHeader, Btn,
  Modal, ModalBody, ModalFooter,
  toast,
} from '@/components/ui';

// ── Office Info ───────────────────────────────────────────────
function OfficeInfoSection() {
  const [form, setForm] = useState({
    officeName: '', managerName: '', phone: '', email: '', address: '',
  });
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings/office')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setForm(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/office', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Hata');
      toast.success('Ofis bilgileri kaydedildi');
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof typeof form, type = 'text') => (
    <div>
      <label>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        disabled={loading}
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  );

  return (
    <form onSubmit={handleSave}>
      <div style={{ padding: '20px 24px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {field('Ofis / İşletme Adı', 'officeName')}
          {field('Yetkili / Yönetici Adı', 'managerName')}
          {field('Telefon', 'phone', 'tel')}
          {field('E-posta', 'email', 'email')}
        </div>
        {field('Adres', 'address')}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
          <Btn type="submit" disabled={saving || loading}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Btn>
        </div>
      </div>
    </form>
  );
}

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
            background: 'var(--red-bg)',
            border: '1px solid rgba(255,69,58,0.2)',
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

// ── Users ─────────────────────────────────────────────────────
type UserRow = { id: number; username: string; role: string; createdAt: string };

function UsersSection() {
  const [users,       setUsers]       = useState<UserRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [addOpen,     setAddOpen]     = useState(false);
  const [pwOpen,      setPwOpen]      = useState(false);
  const [deleteOpen,  setDeleteOpen]  = useState(false);
  const [target,      setTarget]      = useState<UserRow | null>(null);
  const [addForm,     setAddForm]     = useState({ username: '', password: '', confirm: '' });
  const [pwForm,      setPwForm]      = useState({ password: '', confirm: '' });
  const [busy,        setBusy]        = useState(false);

  async function load() {
    const res = await fetch('/api/users');
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (addForm.password !== addForm.confirm) { toast.error('Şifreler eşleşmiyor'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: addForm.username, password: addForm.password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Hata');
      toast.success('Kullanıcı oluşturuldu');
      setAddOpen(false);
      setAddForm({ username: '', password: '', confirm: '' });
      load();
    } catch (e: unknown) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!target) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${target.id}`, { method: 'DELETE' });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Hata');
      toast.success('Kullanıcı silindi');
      setDeleteOpen(false);
      setTarget(null);
      load();
    } catch (e: unknown) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  async function handlePw(e: FormEvent) {
    e.preventDefault();
    if (!target) return;
    if (pwForm.password !== pwForm.confirm) { toast.error('Şifreler eşleşmiyor'); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${target.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwForm.password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Hata');
      toast.success('Şifre güncellendi');
      setPwOpen(false);
      setPwForm({ password: '', confirm: '' });
      setTarget(null);
    } catch (e: unknown) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
        <Btn onClick={() => setAddOpen(true)}>
          <UserPlus size={14} />
          Kullanıcı Ekle
        </Btn>
      </div>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
          Yükleniyor...
        </div>
      ) : users.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.875rem' }}>
          Kullanıcı yok
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Kullanıcı Adı', 'Rol', 'Oluşturma Tarihi', ''].map(h => (
                <th key={h} style={{
                  textAlign: h === '' ? 'right' : 'left',
                  padding: '10px 24px',
                  fontWeight: 600, fontSize: '0.75rem',
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 24px', color: 'var(--text)', fontWeight: 500 }}>{u.username}</td>
                <td style={{ padding: '12px 24px', color: 'var(--muted)' }}>{u.role}</td>
                <td style={{ padding: '12px 24px', color: 'var(--muted)' }}>
                  {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                </td>
                <td style={{ padding: '12px 24px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Btn variant="ghost" style={{ height: 28, padding: '0 8px', fontSize: '0.8125rem' }}
                      onClick={() => { setTarget(u); setPwForm({ password: '', confirm: '' }); setPwOpen(true); }}
                    >
                      <KeyRound size={13} />
                      Şifre
                    </Btn>
                    <Btn variant="ghost" style={{ height: 28, padding: '0 8px', fontSize: '0.8125rem', color: 'var(--red)' }}
                      onClick={() => { setTarget(u); setDeleteOpen(true); }}
                    >
                      <Trash2 size={13} />
                      Sil
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add user modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setAddForm({ username: '', password: '', confirm: '' }); }} title="Kullanıcı Ekle" width={400}>
        <form onSubmit={handleAdd}>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>Kullanıcı Adı</label>
                <input value={addForm.username} onChange={e => setAddForm(f => ({ ...f, username: e.target.value }))} placeholder="en az 3 karakter" />
              </div>
              <div>
                <label>Şifre</label>
                <input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="en az 6 karakter" />
              </div>
              <div>
                <label>Şifre Tekrar</label>
                <input type="password" value={addForm.confirm} onChange={e => setAddForm(f => ({ ...f, confirm: e.target.value }))} placeholder="şifreyi tekrar girin" />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Btn variant="ghost" type="button" onClick={() => { setAddOpen(false); setAddForm({ username: '', password: '', confirm: '' }); }}>İptal</Btn>
            <Btn type="submit" disabled={busy}>{busy ? 'Oluşturuluyor...' : 'Oluştur'}</Btn>
          </ModalFooter>
        </form>
      </Modal>

      {/* Change password modal */}
      <Modal open={pwOpen} onClose={() => { setPwOpen(false); setTarget(null); }} title={`Şifre Değiştir — ${target?.username ?? ''}`} width={400}>
        <form onSubmit={handlePw}>
          <ModalBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label>Yeni Şifre</label>
                <input type="password" value={pwForm.password} onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} placeholder="en az 6 karakter" />
              </div>
              <div>
                <label>Şifre Tekrar</label>
                <input type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="şifreyi tekrar girin" />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Btn variant="ghost" type="button" onClick={() => { setPwOpen(false); setTarget(null); }}>İptal</Btn>
            <Btn type="submit" disabled={busy}>{busy ? 'Kaydediliyor...' : 'Kaydet'}</Btn>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={deleteOpen} onClose={() => { setDeleteOpen(false); setTarget(null); }} title="Kullanıcıyı Sil" width={400}>
        <ModalBody>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text)', lineHeight: 1.6 }}>
            <strong>{target?.username}</strong> adlı kullanıcı silinecek.
            Bu kullanıcının aktif oturumları da sonlandırılacak.
          </p>
        </ModalBody>
        <ModalFooter>
          <Btn variant="ghost" onClick={() => { setDeleteOpen(false); setTarget(null); }}>İptal</Btn>
          <Btn variant="destructive" onClick={handleDelete} disabled={busy}>{busy ? 'Siliniyor...' : 'Sil'}</Btn>
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
      <PageHeader title="Ayarlar" desc="Ofis bilgileri, yedekleme ve uygulama yönetimi" />

      <div style={{
        fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        padding: '0 2px',
      }}>
        Ofis Bilgileri
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <OfficeInfoSection />
      </Card>

      <div style={{
        fontSize: '0.6875rem', fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em',
        padding: '0 2px', marginTop: 4,
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
        Kullanıcılar
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <UsersSection />
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
