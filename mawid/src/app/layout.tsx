import type { Metadata, Viewport } from 'next';
import { Cairo, Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import PageTransition from '@/components/PageTransition';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import GlobalNotificationHandler from '@/components/GlobalNotificationHandler';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'موعد | حجز المواعيد الطبية في العراق',
  description: 'منصة حجز المواعيد الطبية الأولى في العراق التابعة لمؤسسة شهامة الأنبار.',
  manifest: '/manifest.v2.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'موعد',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'موعد | حجز المواعيد الطبية',
    description: 'احجز موعدك مع أفضل الأطباء في العراق',
    locale: 'ar_IQ',
    type: 'website',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white">
        <AuthProvider>
          <GlobalNotificationHandler />
          <Navbar />
          <main className="pt-20">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
          <PWAInstallPrompt />
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    console.log('ServiceWorker registration successful');
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
