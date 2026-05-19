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
        content: `You are a fitness expert. The user describes a workout they did — in any language including Danish.
Return a JSON object with these fields:
- name: short English name for the workout (e.g. "Morning run", "Upper body strength", "HIIT circuit")
- type: one of "cardio", "strength", "hiit", "yoga", "sports", "other"
- duration: integer, estimated minutes
- calories_burned: integer, estimated kcal burned

Rules:
- If duration is mentioned, use it. If not, estimate a typical session for that activity.
- Calories burned: use MET values for a ~75kg person as baseline. Be realistic — don't over-estimate.
  Examples: 30min run = ~300 kcal, 45min weights = ~200 kcal, 20min HIIT = ~250 kcal, 60min cycling = ~500 kcal
- type mapping: running/cycling/swimming/rowing = cardio, weights/lifting = strength, intervals/circuits = hiit, stretching/pilates = yoga, football/basketball/tennis = sports
- Respond with ONLY valid JSON, no explanation`,
      },
      {
        role: 'user',
        content: description,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 150,
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to parse workout data.' }, { status: 500 });
  }
}
