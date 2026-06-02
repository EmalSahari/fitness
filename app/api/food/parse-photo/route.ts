import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { incrementAndCheckUsage } from '@/lib/ai-usage';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  // Pro-only feature
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single();
  if (profile?.plan !== 'pro') {
    return NextResponse.json({ error: 'Photo logging is a Pro feature.', proRequired: true }, { status: 403 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });
  }

  const usage = await incrementAndCheckUsage(user.id);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'Daily AI limit reached', limitReached: true, used: usage.used, limit: usage.limit },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'No image provided.' }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Image too large. Max 4 MB.' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mimeType = file.type || 'image/jpeg';

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    max_tokens: 400,
    messages: [
      {
        role: 'system',
        content: `You are a nutrition expert analyzing a food photo. Identify the food(s) visible and estimate nutrition.
Return JSON only:
{
  "name": "descriptive name with estimated portion (e.g. 'Grilled chicken with rice (1 serving)')",
  "calories": integer total kcal,
  "protein": grams (1 decimal),
  "carbs": grams (1 decimal),
  "fat": grams (1 decimal),
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "confidence": "high" | "medium" | "low",
  "notes": "optional: portion size assumptions or visible items"
}
If no food is visible, return {"error": "no_food"}.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'low' },
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  });

  const raw = completion.choices[0]?.message?.content ?? '{}';
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error === 'no_food') {
      return NextResponse.json({ error: 'No food detected in the photo. Try a clearer shot.' }, { status: 422 });
    }
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to analyze photo.' }, { status: 500 });
  }
}
