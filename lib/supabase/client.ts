import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Fallback strings prevent createBrowserClient from throwing during
  // build-time static generation when env vars aren't set.
  // Real API calls won't happen until the browser has the actual values.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-key'
  );
}
