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
      <body style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        {/* Route-change progress bar — 3px line at the very top */}
        <ProgressBar />

        <Sidebar />

        {/* Main content shifts with sidebar via CSS variable --sidebar-w */}
        <div style={{
          marginLeft: 'var(--sidebar-w)',
          transition: 'margin-left 0.25s ease',
          flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        }}>
          <Topbar />
          <main>
            <div style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '24px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 24,
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
