import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTodayDate } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const date = new URL(req.url).searchParams.get('date') || getTodayDate();
  const { data, error } = await supabase
    .from('water_logs')
    .select('id, amount_ml, created_at')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const total = (data ?? []).reduce((s, r) => s + r.amount_ml, 0);
  return NextResponse.json({ total, entries: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount_ml, date } = await req.json();
  if (!amount_ml || amount_ml <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

  const { data, error } = await supabase
    .from('water_logs')
    .insert({ user_id: user.id, amount_ml, date: date || getTodayDate() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { date } = await req.json();
  const { data: entries } = await supabase
    .from('water_logs')
    .select('id')
    .eq('user_id', user.id)
    .eq('date', date || getTodayDate())
    .order('created_at', { ascending: false })
    .limit(1);

  if (!entries?.length) return NextResponse.json({ error: 'Nothing to undo' }, { status: 404 });
  await supabase.from('water_logs').delete().eq('id', entries[0].id);
  return NextResponse.json({ ok: true });
}
