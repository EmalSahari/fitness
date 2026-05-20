import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { FoodEntry, WorkoutEntry } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_MESSAGES_IN_HISTORY = 20;
const MAX_MEMORY_CHARS = 800;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });
}

function buildSystemPrompt(
  foodEntries: FoodEntry[],
  workoutEntries: WorkoutEntry[],
  settings: { calorieGoal: number; name: string },
  memory: string
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

  const memorySection = memory?.trim()
    ? `WHAT YOU KNOW ABOUT THIS USER (from previous conversations):
${memory}

`
    : '';

  return `You are FitCoach, a knowledgeable, encouraging, and concise personal fitness coach built into a fitness tracking app.

STRICT SCOPE RULES — you must follow these without exception:
- You ONLY answer questions about nutrition, food, exercise, workouts, body composition, fitness goals, recovery, hydration, sleep as it relates to fitness, and the user's personal data shown below.
- If a user asks about anything outside fitness and nutrition (coding, politics, entertainment, general knowledge, writing, math, etc.), respond with exactly: "I'm your fitness coach — I can only help with nutrition and workout questions. What would you like to know about your diet or training?"
- Never break character or discuss your own nature, capabilities, or the technology behind you.
- Do not write code, essays, poems, or any content unrelated to fitness.

${memorySection}USER: ${settings.name || 'Anonymous'}

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
- Use what you know about this user to give personalised advice — reference their preferences, restrictions, or past context when relevant
- Reference specific items from today's logs when giving advice
- Be encouraging but honest about over- or under-eating
- Keep replies to 2–4 sentences unless the user asks for detail
- If no data is logged yet, give motivational tips to get started`;
}

async function updateMemory(
  openai: OpenAI,
  existingMemory: string,
  userMessage: string,
  coachReply: string,
  supabase: ReturnType<typeof createClient>,
  userId: string
) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 150,
      messages: [
        {
          role: 'system',
          content: `You manage persistent memory for a fitness coaching app. Extract personal facts worth remembering long-term from this exchange.

Current memory:
${existingMemory || '(empty)'}

Rules:
- Only extract facts the user explicitly stated: dietary restrictions, food preferences, allergies, health conditions, injuries, workout preferences, schedule, personal goals, lifestyle facts
- Merge with existing memory, remove duplicates, update contradicted facts
- Ignore things already in the memory
- If nothing new was revealed, return the existing memory exactly as-is
- Plain bullet points, no headers, max 800 characters total
- If truly nothing worth saving, return empty string`,
        },
        {
          role: 'user',
          content: `User said: "${userMessage}"\nCoach replied: "${coachReply}"`,
        },
      ],
    });

    const newMemory = (completion.choices[0]?.message?.content ?? '').trim().slice(0, MAX_MEMORY_CHARS);

    if (newMemory !== existingMemory) {
      await supabase.from('profiles').update({ coach_memory: newMemory }).eq('id', userId);
    }
  } catch {
    // Memory update failure is non-critical — don't break the chat
  }
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 });
  }

  const body = await req.json();
  const { messages, foodEntries, workoutEntries, settings } = body as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    foodEntries: FoodEntry[];
    workoutEntries: WorkoutEntry[];
    settings: { calorieGoal: number; name: string };
  };

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === 'user' && lastMessage.content.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: 'Message too long. Please keep it under 1000 characters.' }, { status: 400 });
  }

  // Fetch current memory
  const { data: profileData } = await supabase
    .from('profiles')
    .select('coach_memory')
    .eq('id', user.id)
    .single();
  const memory: string = (profileData as { coach_memory?: string } | null)?.coach_memory ?? '';

  const trimmedMessages = messages.slice(-MAX_MESSAGES_IN_HISTORY);
  const systemPrompt = buildSystemPrompt(foodEntries, workoutEntries, settings, memory);
  const openai = getOpenAI();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'system', content: systemPrompt }, ...trimmedMessages],
    max_tokens: 400,
    temperature: 0.7,
  });

  const reply = completion.choices[0]?.message?.content ?? 'Sorry, I could not generate a response.';

  // Update memory asynchronously (non-blocking for the response)
  const userText = lastMessage?.role === 'user' ? lastMessage.content : '';
  if (userText) {
    await updateMemory(openai, memory, userText, reply, supabase, user.id);
  }

  return NextResponse.json({ reply });
}
