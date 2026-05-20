import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';

// Called by Vercel Cron every hour — secured by CRON_SECRET header
export async function GET(req: NextRequest) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? 'mailto:admin@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? '',
  );

  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const currentHour = new Date().getUTCHours();

  // Fetch only subscriptions whose morning or evening hour matches right now
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription, morning_hour, evening_hour')
    .or(`morning_hour.eq.${currentHour},evening_hour.eq.${currentHour}`);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const today = new Date().toISOString().slice(0, 10);
  let sent = 0;
  const stale: string[] = [];

  for (const row of subs) {
    const isMorning = row.morning_hour === currentHour;

    let payload: object;

    if (isMorning) {
      payload = {
        title: 'Good morning! 🌅',
        body: 'Ready to start tracking today? Log your first meal to stay on track.',
        url: '/food',
      };
    } else {
      const [profileRes, foodRes] = await Promise.all([
        supabase.from('profiles').select('calorie_goal, name').eq('id', row.user_id).single(),
        supabase.from('food_entries').select('calories').eq('user_id', row.user_id).eq('date', today),
      ]);
      const goal = (profileRes.data as { calorie_goal: number; name: string } | null)?.calorie_goal ?? 2000;
      const name = (profileRes.data as { calorie_goal: number; name: string } | null)?.name ?? '';
      const eaten = ((foodRes.data ?? []) as { calories: number }[]).reduce((s, e) => s + e.calories, 0);
      const remaining = goal - eaten;

      payload = remaining > 0
        ? { title: 'Evening check-in 🌙', body: `${name ? name + ', you have' : 'You have'} ${remaining} kcal left today. Keep it up!`, url: '/dashboard' }
        : { title: 'Goal reached! 🎉', body: `${name ? name + ', you' : 'You'} hit your calorie goal today. Great work!`, url: '/dashboard' };
    }

    try {
      const sub = JSON.parse(row.subscription) as webpush.PushSubscription;
      await webpush.sendNotification(sub, JSON.stringify(payload));
      sent++;
    } catch (err: unknown) {
      if ((err as { statusCode?: number })?.statusCode === 410) {
        stale.push(row.user_id);
      }
    }
  }

  if (stale.length) {
    await supabase.from('push_subscriptions').delete().in('user_id', stale);
  }

  return NextResponse.json({ sent, stale: stale.length });
}
