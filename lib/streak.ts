// Returns the current consecutive-day streak given an array of date strings ('YYYY-MM-DD').
// Streak counts today if logged, or continues from yesterday if today hasn't been logged yet.
export function calculateStreak(loggedDates: string[]): number {
  if (!loggedDates.length) return 0;

  const unique = Array.from(new Set(loggedDates)).sort().reverse(); // most recent first
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let cursor = new Date(today);

  // If today isn't logged yet, start checking from yesterday
  const todayStr = cursor.toISOString().slice(0, 10);
  if (!unique.includes(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (const date of unique) {
    const cursorStr = cursor.toISOString().slice(0, 10);
    if (date === cursorStr) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (date < cursorStr) {
      // Gap — streak broken
      break;
    }
    // date > cursorStr shouldn't happen since unique is sorted desc, but skip if so
  }

  return streak;
}

export interface Badge {
  key: string;
  emoji: string;
  labelKey: string;
  earned: boolean;
}

export function calculateBadges(streak: number, totalWorkouts: number, hasAnyLog: boolean): Badge[] {
  return [
    { key: 'first_log',   emoji: '🌱', labelKey: 'badge_first_log',   earned: hasAnyLog },
    { key: '3day',        emoji: '🔥', labelKey: 'badge_3day',         earned: streak >= 3 },
    { key: '7day',        emoji: '🔥', labelKey: 'badge_7day',         earned: streak >= 7 },
    { key: '14day',       emoji: '💫', labelKey: 'badge_14day',        earned: streak >= 14 },
    { key: '30day',       emoji: '💎', labelKey: 'badge_30day',        earned: streak >= 30 },
    { key: '10workouts',  emoji: '💪', labelKey: 'badge_10workouts',   earned: totalWorkouts >= 10 },
    { key: '50workouts',  emoji: '🏆', labelKey: 'badge_50workouts',   earned: totalWorkouts >= 50 },
  ];
}
