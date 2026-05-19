import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });
  }

  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'No description provided.' }, { status: 400 });
  }

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are a nutrition expert. The user describes food they ate — in any language including Danish.
Return a JSON object with these fields:
- name: short descriptive name including quantity if relevant (e.g. "3x Spicy Chicken Taquito (7-Eleven)")
- calories: integer, TOTAL kcal for everything described (multiply per-item calories by quantity)
- protein: number, TOTAL grams (1 decimal)
- carbs: number, TOTAL grams (1 decimal)
- fat: number, TOTAL grams (1 decimal)
- meal_type: one of "breakfast", "lunch", "dinner", "snack"

CRITICAL — quantities:
- If the user says "3 taquitos", calculate 3 × (calories per taquito)
- If the user says "2 slices", calculate 2 × (calories per slice)
- Always sum everything up — return the TOTAL for the whole meal, not per item
- Named branded/chain items (7-Eleven, McDonald's, Starbucks, etc.): use known nutrition data for that specific product

Examples of correct quantity handling:
- "3 spicy chicken taquitos from 7-eleven" → 3 × 250 kcal = 750 kcal total
- "2 stk rugbrød med smør" → 2 × ~110 kcal = ~220 kcal total

Other rules:
- Use realistic Danish/Nordic portion sizes where relevant (1 slice rugbrød = ~65g)
- meal_type: infer from the food (rugbrød = breakfast/lunch, pasta = dinner, taquito = snack, etc.)
- Respond with ONLY valid JSON, no explanation`,
      },
      {
        role: 'user',
        content: description,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to parse nutrition data.' }, { status: 500 });
  }
}
