'use client';

import { usePathname } from 'next/navigation';
import AppBackground from '@/components/AppBackground';
import AiLimitBanner from '@/components/AiLimitBanner';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth') || pathname === '/onboarding';
  const isLanding = pathname === '/';

  if (isAuthPage || isLanding) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <>
      <AppBackground />
      <main className="relative z-10 flex-1 md:ml-60 p-4 sm:p-6 md:p-8 min-h-screen pb-24 md:pb-8 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          <AiLimitBanner />
          {children}
          <div className="mt-12 pb-2 text-center">
            <a href="https://www.sahari.io" target="_blank" rel="noopener noreferrer"
              className="text-[11px] text-slate-700 hover:text-slate-500 transition-colors">
              Made by <span className="underline underline-offset-2">sahari.io</span>
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
