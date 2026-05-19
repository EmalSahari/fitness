'use client';

import { usePathname } from 'next/navigation';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth') || pathname === '/onboarding';

  if (isAuthPage) {
    return <main className="flex-1 min-h-screen">{children}</main>;
  }

  return (
    <main className="flex-1 md:ml-60 p-6 md:p-8 min-h-screen pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto">{children}</div>
    </main>
  );
}
