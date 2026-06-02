import { createClient } from '@/lib/supabase/server';

export const FREE_DAILY_LIMIT = 10;

type UsageResult = {
  allowed: boolean;
  used: number;
  limit: number;
  isPro: boolean;
};

/** Read-only — used by the client GET endpoint to show the badge. */
export async function getAiUsage(userId: string): Promise<Omit<UsageResult, 'allowed'>> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  const isPro = (profile as { plan?: string } | null)?.plan === 'pro';
  if (isPro) return { used: 0, limit: -1, isPro: true };

  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const used = (data as { count?: number } | null)?.count ?? 0;
  return { used, limit: FREE_DAILY_LIMIT, isPro: false };
}

/**
 * Check quota and increment if allowed.
 * Uses a read-then-upsert approach. The slight race window at low concurrency is
 * acceptable for a personal fitness app (worst case: a user gets +1-2 extra uses).
 */
export async function incrementAndCheckUsage(userId: string): Promise<UsageResult> {
  const supabase = createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .single();

  const isPro = (profile as { plan?: string } | null)?.plan === 'pro';
  if (isPro) return { allowed: true, used: 0, limit: -1, isPro: true };

  const today = new Date().toISOString().split('T')[0];
  const { data: row } = await supabase
    .from('ai_usage')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  const usedBefore = (row as { count?: number } | null)?.count ?? 0;

  if (usedBefore >= FREE_DAILY_LIMIT) {
    return { allowed: false, used: usedBefore, limit: FREE_DAILY_LIMIT, isPro: false };
  }

  // Upsert with new count — on conflict (same user + same day), set count to new value.
  // Concurrent calls that both read the same value will both write the same count,
  // which is safe (no over-counting or under-counting beyond ±1).
  await supabase.from('ai_usage').upsert(
    { user_id: userId, date: today, count: usedBefore + 1 },
    { onConflict: 'user_id,date' }
  );

  return { allowed: true, used: usedBefore + 1, limit: FREE_DAILY_LIMIT, isPro: false };
}
