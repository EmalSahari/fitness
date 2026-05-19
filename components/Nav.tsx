'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import type { TranslationKey } from '@/lib/i18n/en';

const NAV_LINKS: { href: string; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  {
    href: '/dashboard',
    labelKey: 'nav_dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/food',
    labelKey: 'nav_food',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    href: '/workouts',
    labelKey: 'nav_workouts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h2m14 0h2M7 12a5 5 0 0110 0M5 8l2 2m10-2-2 2M5 16l2-2m10 2-2-2" />
      </svg>
    ),
  },
  {
    href: '/progress',
    labelKey: 'nav_weight',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l4-8 4 4 4-6 4 10" />
      </svg>
    ),
  },
  {
    href: '/coach',
    labelKey: 'nav_coach',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3v-3z" />
      </svg>
    ),
  },
];

import React from 'react';

export default function Nav() {
  const pathname = usePathname();
  const { user, profile, language, setLanguage, signOut, t } = useAuth();

  // Don't render nav on auth / onboarding pages
  if (!user || pathname.startsWith('/auth') || pathname === '/onboarding') return null;

  const otherLang = language === 'en' ? 'da' : 'en';

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-60 bg-slate-900 border-r border-slate-800 flex-col z-50">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-bold text-white text-lg tracking-tight">FitTrack</span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(({ href, labelKey, icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                }`}>
                {icon}
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: language + user */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          {/* Language toggle */}
          <button onClick={() => setLanguage(otherLang)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <span className="text-base">{language === 'en' ? '🇩🇰' : '🇬🇧'}</span>
            <span>{language === 'en' ? 'Dansk' : 'English'}</span>
          </button>

          {/* User info + sign out */}
          {profile && (
            <div className="px-3 py-2 rounded-lg bg-slate-800/50">
              <p className="text-xs font-medium text-slate-300 truncate">{profile.name || user?.email}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
          <button onClick={signOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {t('nav_signout')}
          </button>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex z-50">
        {NAV_LINKS.map(({ href, labelKey, icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                active ? 'text-blue-400' : 'text-slate-500'
              }`}>
              {icon}
              <span className="hidden xs:block">{t(labelKey)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
