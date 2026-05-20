'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from './supabase/client';
import { getT, type Language } from './i18n';
import type { Profile } from './types';
import type { TranslationKey } from './i18n/en';

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [language, setLangState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('fittrack_lang') as Language) ?? 'en';
    }
    return 'en';
  });
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = useCallback(
    async (uid: string) => {
      try {
        const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), 5000));
        const query = supabase.from('profiles').select('*').eq('id', uid).single();
        const result = await Promise.race([query, timeout]);
        if (result && 'data' in result && result.data && !result.error) {
          setProfile(result.data as Profile);
          const lang = (result.data as Profile).language as Language;
          setLangState(lang);
          localStorage.setItem('fittrack_lang', lang);
        }
      } catch {
        // profile stays null — page will handle gracefully
      }
    },
    [supabase]
  );

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setUser(user);
      if (user) {
        fetchProfile(user.id).finally(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) await fetchProfile(u.id);
        else setProfile(null);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLanguage = useCallback(
    async (lang: Language) => {
      setLangState(lang);
      localStorage.setItem('fittrack_lang', lang);
      if (user) {
        await supabase
          .from('profiles')
          .update({ language: lang })
          .eq('id', user.id);
      }
    },
    [user, supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }, [supabase, router]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const t = getT(language);

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, language, setLanguage, t, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
