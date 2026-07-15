// Streaks and the activity heatmap are both derived from a plain map of
// date key -> review count, so they're always recomputed fresh from ground
// truth and can never drift out of sync with each other.
export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayKey(now: Date): string {
  return dateKey(now)
}

export function computeStreak(activeDayKeys: string[], now: Date): number {
  const days = new Set(activeDayKeys)
  const cursor = new Date(now)
  if (!days.has(dateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(dateKey(cursor))) return 0
  }
  let streak = 0
  while (days.has(dateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
