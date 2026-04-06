'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User } from 'lucide-react';

function LoginForm() {
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [checking,  setChecking]  = useState(true);

  // Redirect to setup if no admin account exists yet
  useEffect(() => {
    fetch('/api/auth/setup-status')
      .then(r => r.json())
      .then(d => {
        if (d.needsSetup) { router.replace('/setup'); return; }
        // Pre-fill username from ?user= param (account switching)
        const prefill = searchParams.get('user');
        if (prefill) setUsername(prefill);
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router, searchParams]);

  if (checking) return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

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
              <label style={{ marginBottom: 6 }}>Kullanıcı Adı</label>
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
                  placeholder="kullanıcı adı"
                  autoComplete="username"
                  required
                  style={{
                    paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                    border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ marginBottom: 6 }}>Şifre</label>
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
                    paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                    border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                    fontSize: '0.9375rem',
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '9px 13px', borderRadius: 8,
                background: 'var(--red-bg)',
                border: '1px solid rgba(255,69,58,0.25)',
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

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
