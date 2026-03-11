'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User } from 'lucide-react';

export default function LoginPage() {
  const router   = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Giriş başarısız');
      router.push('/');
      router.refresh();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      padding: 24,
      zIndex: 9999,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Lock size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontSize: '1.5rem', fontWeight: 800,
            letterSpacing: '-0.03em', color: 'var(--text)',
            margin: 0,
          }}>
            Kira Takip
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '6px 0 0' }}>
            Devam etmek için giriş yapın
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '28px 28px 24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Username */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--text)', marginBottom: 6,
              }}>
                Kullanıcı Adı
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={15}
                  style={{
                    position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--muted)', pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                  style={{
                    width: '100%', paddingLeft: 34, paddingRight: 12,
                    paddingTop: 9, paddingBottom: 9,
                    border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 8, fontSize: '0.9375rem',
                    background: 'var(--surface)', color: 'var(--text)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: '0.8125rem', fontWeight: 600,
                color: 'var(--text)', marginBottom: 6,
              }}>
                Şifre
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={15}
                  style={{
                    position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--muted)', pointerEvents: 'none',
                  }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  style={{
                    width: '100%', paddingLeft: 34, paddingRight: 12,
                    paddingTop: 9, paddingBottom: 9,
                    border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 8, fontSize: '0.9375rem',
                    background: 'var(--surface)', color: 'var(--text)',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '9px 13px', borderRadius: 8,
                background: 'var(--red-bg)',
                border: '1px solid rgba(239,68,68,0.25)',
                fontSize: '0.8125rem', color: 'var(--red)', fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '10px 0', borderRadius: 8, border: 'none',
                background: loading ? 'var(--primary-bg)' : 'var(--primary)',
                color: loading ? 'var(--primary)' : '#fff',
                fontSize: '0.9375rem', fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        </div>

        {/* Default credentials hint */}
        <p style={{
          textAlign: 'center', fontSize: '0.75rem',
          color: 'var(--subtle)', marginTop: 16,
        }}>
          Varsayılan: admin / admin123
        </p>
      </div>
    </div>
  );
}
