import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Nav from '@/components/Nav';
import MainLayout from '@/components/MainLayout';
import RegisterSW from '@/components/RegisterSW';
import FeedbackButton from '@/components/FeedbackButton';
import InstallPrompt from '@/components/InstallPrompt';
import InAppBrowserWarning from '@/components/InAppBrowserWarning';

function appUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fittrack.sahari.io';
  return raw.startsWith('http') ? raw : `https://${raw}`;
}

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: 'FitTrack — AI Fitness Tracker', template: '%s · FitTrack' },
  description: 'Track food and workouts with AI. Log meals by description, get a personal AI coach, and hit your fitness goals.',
  keywords: ['calorie tracker', 'AI food logging', 'workout tracker', 'macro tracker', 'fitness app', 'AI fitness coach'],
  authors: [{ name: 'FitTrack' }],
  creator: 'FitTrack',
  robots: { index: true, follow: true },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'FitTrack',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/og-image.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FitTrack',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-slate-950 text-white min-h-screen">
        <InAppBrowserWarning />
        <RegisterSW />
        <AuthProvider>
          <div className="flex min-h-screen">
            <Nav />
            <MainLayout>{children}</MainLayout>
            <FeedbackButton />
            <InstallPrompt />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
