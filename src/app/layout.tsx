import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Toaster } from '@/components/ui/Toast';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Kira Takip',
  description: 'Mülk ve Kira Yönetim Sistemi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable}>
      {/*
        Three-layer structure:
          Layer 1 — body (var(--bg), darkest, shows as gap around floating panel)
          Layer 2 — .sb-panel inside Sidebar (floating nav object)
          Layer 3 — content area (var(--surface) topbar + var(--bg) main)
      */}
      <body style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
        <ProgressBar />

        <Sidebar />

        {/* Content area — shifts right by sidebar width (includes float gap) */}
        <div style={{
          marginLeft: 'var(--sidebar-w)',
          transition: 'margin-left 0.25s ease',
          flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden',
        }}>
          <Topbar />
          <main style={{ flex: 1, height: 0, overflowY: 'auto' }}>
            <div className="content-wrapper" style={{
              maxWidth: 1400,
              margin: '0 auto',
              padding: '20px 32px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}>
              {children}
            </div>
          </main>
        </div>

        {/* Toast stack — bottom-right */}
        <Toaster />
      </body>
    </html>
  );
}
