import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const MAX_INPUT = 1000;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });
  }

  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'No description provided.' }, { status: 400 });
  }
  if (description.length > MAX_INPUT) {
    return NextResponse.json({ error: 'Description too long. Max 1000 characters.' }, { status: 400 });
  }

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are a nutrition expert. The user describes food or drinks they consumed — in any language including Danish.

IMPORTANT: If the input is not a food or drink description (e.g. it is a question, code, a non-food topic, or gibberish), return exactly: {"error":"not_food"}

Otherwise return a JSON object with:
- name: short descriptive name including quantity if relevant (e.g. "3x Spicy Chicken Taquito (7-Eleven)")
- calories: integer, TOTAL kcal for everything described (multiply per-item calories by quantity)
- protein: number, TOTAL grams (1 decimal)
- carbs: number, TOTAL grams (1 decimal)
- fat: number, TOTAL grams (1 decimal)
- meal_type: one of "breakfast", "lunch", "dinner", "snack"

Rules:
- Always return TOTAL for the whole meal, never per-item
- Named branded/chain items: use known nutrition data for that specific product
- Use realistic Danish/Nordic portion sizes where relevant (1 slice rugbrød = ~65g)
- Respond with ONLY valid JSON, no explanation`,
      },
      { role: 'user', content: description },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error === 'not_food') {
      return NextResponse.json({ error: 'Please describe food or a drink — this field is only for logging meals.' }, { status: 422 });
    }
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to parse nutrition data.' }, { status: 500 });
  }
}
