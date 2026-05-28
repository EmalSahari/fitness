import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import { incrementAndCheckUsage } from '@/lib/ai-usage';

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

  // Usage gate — check before calling OpenAI
  const usage = await incrementAndCheckUsage(user.id);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: 'Daily AI limit reached', limitReached: true, used: usage.used, limit: usage.limit },
      { status: 429 }
    );
  }

  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'No description provided.' }, { status: 400 });
  }
  if (description.length > MAX_INPUT) {
    return NextResponse.json({ error: 'Description too long. Max 1000 characters.' }, { status: 400 });
  }

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are a precise nutrition calculator. The user describes food or drinks in any language (including Danish).

IMPORTANT: Only return {"error":"not_food"} if the input is clearly NOT food — e.g. a programming question, random letters, or obvious nonsense. When in doubt, treat it as food. Common Danish food words include: hvidløg (garlic), løg (onion), kylling (chicken), oksekød (beef), smør (butter), mælk (milk), æg (egg), kartofler (potatoes), gulerødder (carrots), porre (leek), fløde (cream), ost (cheese), brød (bread), and many more.

Otherwise return a JSON object with:
- name: descriptive name with quantity (e.g. "Homemade pasta bolognese (1 serving)", "3x Spicy Chicken Taquito (7-Eleven)")
- calories: integer, TOTAL kcal
- protein: number, TOTAL grams (1 decimal)
- carbs: number, TOTAL grams (1 decimal)
- fat: number, TOTAL grams (1 decimal)
- meal_type: "breakfast" | "lunch" | "dinner" | "snack"
- confidence: "high" | "medium" | "low"
  - high: packaged/branded product with known label data
  - medium: well-known restaurant dish or standard recipe with predictable macros
  - low: homemade meal, vague description, or unclear portion size

Rules for HOMEMADE or DESCRIBED MEALS (e.g. "pasta with meat sauce", "chicken and rice I made", "hjemmelavet lasagne"):
- Break the dish into its likely main ingredients and estimate realistic portions for one serving
- Account for cooking method: pan-frying adds ~8-12g fat, oven-roasting adds ~3-5g fat per serving
- Include cooking oil/butter if the dish was likely fried or sautéed
- Assume one standard serving unless quantity is stated

Rules for PACKAGED/BRANDED products:
- Use the actual known nutrition data for that specific product
- Apply quantity multipliers when stated

Rules for RESTAURANT meals:
- Use the restaurant's published data if known, otherwise estimate from typical restaurant portion sizes (restaurant portions run 20-30% larger than home portions)

General rules:
- Always return TOTAL for the full amount described, never per-item
- Danish/Nordic portions where relevant: 1 slice rugbrød ≈ 65g, leverpostej ≈ 30g per slice, skyr 150g per portion
- When quantity is ambiguous, assume a standard single serving
- Respond with ONLY valid JSON, no explanation`,
      },
      { role: 'user', content: description },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 300,
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
