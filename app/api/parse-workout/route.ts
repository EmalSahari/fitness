import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

const MAX_INPUT = 300;

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
    return NextResponse.json({ error: 'Description too long. Max 300 characters.' }, { status: 400 });
  }

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are a fitness expert. The user describes a workout or physical activity they did — in any language including Danish.

IMPORTANT: If the input is not a workout or physical activity description (e.g. it is a question, code, food, a non-fitness topic, or gibberish), return exactly: {"error":"not_workout"}

Otherwise return a JSON object with:
- name: short English name for the workout (e.g. "Morning run", "Upper body strength", "HIIT circuit")
- type: one of "cardio", "strength", "hiit", "yoga", "sports", "other"
- duration: integer, estimated minutes
- calories_burned: integer, estimated kcal burned

Rules:
- If duration is mentioned, use it. If not, estimate a typical session for that activity.
- Calories burned: use MET values for a ~75kg person. Be realistic.
  Examples: 30min run = ~300 kcal, 45min weights = ~200 kcal, 20min HIIT = ~250 kcal
- type: running/cycling/swimming = cardio, weights/lifting = strength, intervals/circuits = hiit, stretching/pilates = yoga, football/basketball/tennis = sports
- Respond with ONLY valid JSON, no explanation`,
      },
      { role: 'user', content: description },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 150,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error === 'not_workout') {
      return NextResponse.json({ error: 'Please describe a workout or physical activity — this field is only for logging exercise.' }, { status: 422 });
    }
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to parse workout data.' }, { status: 500 });
  }
}
