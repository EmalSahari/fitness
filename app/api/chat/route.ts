import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { FoodEntry, WorkoutEntry } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

const MAX_MESSAGE_LENGTH = 500;
const MAX_MESSAGES_IN_HISTORY = 20;

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

  return `You are FitCoach, a knowledgeable, encouraging, and concise personal fitness coach built into a fitness tracking app.

STRICT SCOPE RULES — you must follow these without exception:
- You ONLY answer questions about nutrition, food, exercise, workouts, body composition, fitness goals, recovery, hydration, sleep as it relates to fitness, and the user's personal data shown below.
- If a user asks about anything outside fitness and nutrition (coding, politics, entertainment, general knowledge, writing, math, etc.), respond with exactly: "I'm your fitness coach — I can only help with nutrition and workout questions. What would you like to know about your diet or training?"
- Never break character or discuss your own nature, capabilities, or the technology behind you.
- Do not write code, essays, poems, or any content unrelated to fitness.

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
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key is not configured.' },
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

  // Validate last user message length
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'user' && lastMessage.content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Message too long. Please keep it under 500 characters.' }, { status: 400 });
  }

  // Cap history to prevent token bloat from long conversations
  const trimmedMessages = messages.slice(-MAX_MESSAGES_IN_HISTORY);

  const systemPrompt = buildSystemPrompt(foodEntries, workoutEntries, settings);

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt }, ...trimmedMessages],
    max_tokens: 400,
    temperature: 0.7,
  });

  const reply = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';
  return NextResponse.json({ reply });
}
