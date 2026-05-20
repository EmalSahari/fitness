import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import postgres from 'postgres';

let _sql: ReturnType<typeof postgres> | null = null;
function getDb() {
  if (!_sql) _sql = postgres(process.env.DATABASE_URL!, {
    max: 1,
    ssl: { rejectUnauthorized: false },
    connect_timeout: 15,
    idle_timeout: 20,
  });
  return _sql;
}

export async function POST(req: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'DATABASE_URL not configured' }, { status: 503 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, ingredients } = await req.json();
  if (!id || !Array.isArray(ingredients)) {
    return NextResponse.json({ error: 'Missing id or ingredients' }, { status: 400 });
  }

  try {
    const sql = getDb();
    await sql`
      UPDATE food_entries
      SET ingredients = ${JSON.stringify(ingredients)}::jsonb
      WHERE id = ${id}::uuid AND user_id = ${user.id}::uuid
    `;
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
