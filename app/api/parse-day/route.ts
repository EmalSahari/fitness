import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI not configured' }, { status: 503 });
  }

  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description is required' }, { status: 400 });
  }

  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    max_tokens: 800,
    messages: [
      {
        role: 'system',
        content: `You are a nutrition and fitness parser. Extract food and workout entries from a free-text description of someone's day.

Return ONLY valid JSON in this exact format:
{
  "food": [
    { "name": string, "calories": number, "meal_type": "breakfast"|"lunch"|"dinner"|"snack", "protein": number|null, "carbs": number|null, "fat": number|null }
  ],
  "workouts": [
    { "name": string, "type": "cardio"|"strength"|"hiit"|"yoga"|"sports"|"other", "duration": number, "calories_burned": number }
  ]
}

Rules:
- Estimate calories and macros based on typical values if not stated. Use realistic averages.
- If the person says "a lot" or "roughly", make a reasonable estimate.
- duration is in minutes, calories_burned is kcal.
- meal_type: infer from context (morning = breakfast, midday = lunch, evening = dinner, else = snack).
- If no food mentioned, return empty food array. If no workout mentioned, return empty workouts array.
- Always return valid JSON, nothing else.`,
      },
      {
        role: 'user',
        content: description.trim(),
      },
    ],
  });

  try {
    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      food: parsed.food ?? [],
      workouts: parsed.workouts ?? [],
    });
  } catch {
    return NextResponse.json({ error: 'Could not parse description. Try being more specific.' }, { status: 422 });
  }
}
