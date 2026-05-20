import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Nav from '@/components/Nav';
import MainLayout from '@/components/MainLayout';
import RegisterSW from '@/components/RegisterSW';
import FeedbackButton from '@/components/FeedbackButton';
import InstallPrompt from '@/components/InstallPrompt';
import InAppBrowserWarning from '@/components/InAppBrowserWarning';

export const metadata: Metadata = {
  title: 'FitTrack',
  description: 'Track nutrition and workouts with an AI coach',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
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
