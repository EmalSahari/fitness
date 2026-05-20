import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as {
    subscription: PushSubscription | null;
    morningHour?: number;
    eveningHour?: number;
  };
  const { subscription, morningHour = 8, eveningHour = 19 } = body;

  if (!subscription) {
    await supabase.from('push_subscriptions').delete().eq('user_id', user.id);
    return NextResponse.json({ ok: true });
  }

  await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    subscription: JSON.stringify(subscription),
    morning_hour: morningHour,
    evening_hour: eveningHour,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  return NextResponse.json({ ok: true });
}
