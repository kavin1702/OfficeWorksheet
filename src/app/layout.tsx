import './globals.css';
import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/shared/components/ui/ThemeProvider';
import { ToastProvider } from '@/shared/components/ui/ToastProvider';

export const metadata: Metadata = {
  title: 'WorkPulse â€” Office Daily Worksheet & Simulation Operations',
  description: 'Enterprise Daily Worksheet, Master Simulation Tracking (12 Worked + 7 Tested), and Analytics Portal.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico'
  }
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased selection:bg-blue-500 selection:text-white">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
