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
  title: { default: 'FitTrack — AI Calorie & Fitness Tracker', template: '%s · FitTrack' },
  description: 'Log food and workouts with AI. Describe your meal and AI calculates calories and macros instantly. Water tracking, streak counter, weekly summary, and a personal AI coach. Free to start.',
  keywords: [
    'calorie tracker', 'AI food logging', 'workout tracker', 'macro tracker',
    'fitness app', 'AI fitness coach', 'nutrition tracker', 'calorie counter',
    'water intake tracker', 'meal logger', 'food diary', 'weight loss app',
    'photo food logging', 'AI calorie counter', 'streak tracker', 'fitness tracker',
  ],
  authors: [{ name: 'FitTrack' }],
  creator: 'FitTrack',
  robots: { index: true, follow: true },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    siteName: 'FitTrack',
  },
  twitter: {
    card: 'summary_large_image',
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
