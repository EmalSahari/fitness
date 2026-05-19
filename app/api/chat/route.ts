import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { FoodEntry, WorkoutEntry } from '@/lib/types';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
}

function buildSystemPrompt(
  foodEntries: FoodEntry[],
  workoutEntries: WorkoutEntry[],
  settings: { calorieGoal: number; name: string }
): string {
  const totalCal = foodEntries.reduce((s, e) => s + e.calories, 0);
  const totalBurned = workoutEntries.reduce((s, e) => s + e.calories_burned, 0);
  const totalProtein = foodEntries.reduce((s, e) => s + (e.protein ?? 0), 0);
  const totalCarbs = foodEntries.reduce((s, e) => s + (e.carbs ?? 0), 0);
  const totalFat = foodEntries.reduce((s, e) => s + (e.fat ?? 0), 0);
  const remaining = settings.calorieGoal - totalCal;

  const foodLog =
    foodEntries.length > 0
      ? foodEntries.map(e =>
          `  • ${e.name} (${e.meal_type}) — ${e.calories} kcal` +
          (e.protein != null ? `, ${e.protein}g protein` : '') +
          (e.carbs != null ? `, ${e.carbs}g carbs` : '') +
          (e.fat != null ? `, ${e.fat}g fat` : '')
        ).join('\n')
      : '  (nothing logged yet)';

  const workoutLog =
    workoutEntries.length > 0
      ? workoutEntries.map(e =>
          `  • ${e.name} (${e.type}) — ${e.duration} min, ${e.calories_burned} kcal burned`
        ).join('\n')
      : '  (no workouts logged yet)';

  return `You are FitCoach, a knowledgeable, encouraging, and concise personal fitness coach.
You have access to the user's real-time data for today. Use it to give specific, actionable advice.

USER: ${settings.name || 'Anonymous'}

TODAY'S SUMMARY (${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}):
- Calorie goal: ${settings.calorieGoal} kcal
- Calories consumed: ${totalCal} kcal  (${remaining > 0 ? remaining + ' remaining' : Math.abs(remaining) + ' over goal'})
- Calories burned (exercise): ${totalBurned} kcal
- Net calories: ${totalCal - totalBurned} kcal
- Macros: ${Math.round(totalProtein)}g protein · ${Math.round(totalCarbs)}g carbs · ${Math.round(totalFat)}g fat

TODAY'S FOOD LOG:
${foodLog}

TODAY'S WORKOUTS:
${workoutLog}

Guidelines:
- Reference specific items from the logs when giving advice
- Be encouraging but honest about over- or under-eating
- Keep replies to 2–4 sentences unless the user asks for detail
- If no data is logged yet, give motivational tips to get started`;
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured. Add OPENAI_API_KEY to .env.local.' },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { messages, foodEntries, workoutEntries, settings } = body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    foodEntries: FoodEntry[];
    workoutEntries: WorkoutEntry[];
    settings: { calorieGoal: number; name: string };
  };

  const systemPrompt = buildSystemPrompt(foodEntries, workoutEntries, settings);

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    max_tokens: 600,
    temperature: 0.7,
  });

  const reply = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
  return NextResponse.json({ reply });
}
