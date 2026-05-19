import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Nav from '@/components/Nav';
import MainLayout from '@/components/MainLayout';

export const metadata: Metadata = {
  title: 'FitTrack',
  description: 'Track nutrition and workouts with an AI coach',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white min-h-screen">
        <AuthProvider>
          <div className="flex min-h-screen">
            <Nav />
            <MainLayout>{children}</MainLayout>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
