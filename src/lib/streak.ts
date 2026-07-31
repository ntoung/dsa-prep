// Streaks and the activity heatmap are both derived from the raw activity
// log (see ActivityLogEntry in useReviewState.ts) rather than persisted as
// their own counters, so they can never drift out of sync with it.
export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayKey(now: Date): string {
  return dateKey(now)
}

// Groups raw log entries into a date key -> count map, the shape every
// other daily-activity view (streak, calendar heatmap) is built from.
export function dailyCountsFromLog(entries: { timestamp: string }[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const entry of entries) {
    const key = dateKey(new Date(entry.timestamp))
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
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
