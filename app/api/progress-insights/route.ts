import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';

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

  const body = await req.json();
  const { weightEntries, avgCalories, avgCaloriesBurned, workoutsPerWeek, calorieGoal, goal, name, tdee, periodLabel, customGoalText } = body;

  const weightTrend = weightEntries.length >= 2
    ? (weightEntries[0].weight_kg - weightEntries[weightEntries.length - 1].weight_kg).toFixed(1)
    : null;

  const prompt = `
User: ${name || 'Anonymous'}
Goal: ${goal === 'custom' && customGoalText ? `Custom: "${customGoalText}"` : goal === 'lose_fat' ? 'fat loss' : goal === 'build_muscle' ? 'muscle gain' : goal === 'maintain' ? 'maintenance' : 'performance'}
Calorie goal: ${calorieGoal} kcal/day
Estimated TDEE: ${tdee ?? 'unknown'} kcal/day

${periodLabel ?? 'Last 7 days'}:
- Average daily calories consumed: ${avgCalories} kcal
- Average daily calories burned (exercise): ${avgCaloriesBurned} kcal
- Workout sessions: ${workoutsPerWeek}

Weight tracking (newest first):
${weightEntries.length > 0
    ? weightEntries.slice(0, 5).map((e: { date: string; weight_kg: number }) => `  ${e.date}: ${e.weight_kg} kg`).join('\n')
    : '  No weight entries yet'}
${weightTrend !== null ? `Weight change: ${Number(weightTrend) > 0 ? '+' : ''}${weightTrend} kg over ${weightEntries.length} entries` : ''}
`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content: `You are a personal fitness coach reviewing a user's weekly progress data.
Generate exactly 3 insights. Each must be specific to their actual numbers — not generic advice.

Return JSON with this shape:
{
  "insights": [
    { "type": "positive" | "warning" | "suggestion", "title": "short title", "text": "1-2 sentence insight" }
  ]
}

Types:
- positive: something going well, celebrate it
- warning: something that needs attention (too little protein, too many calories, no workouts, etc.)
- suggestion: a specific actionable recommendation

Rules:
- If no weight data, don't make up weight trends — focus on calories and workouts
- If no food logged, flag that as a warning
- Be direct and specific — reference actual numbers
- Keep each text to 1-2 sentences max
- Respond ONLY with valid JSON`,
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 400,
  });

  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: 'Failed to generate insights.' }, { status: 500 });
  }
}
