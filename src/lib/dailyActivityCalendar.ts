import { dateKey } from './streak'

export const HEAT_LEVELS = 4

export interface CalendarDay {
  date: Date
  key: string
  count: number
  level: number
  isToday: boolean
}

// Buckets a day's review count into a 0-4 heat level relative to the daily
// goal, so the color scale stays meaningful as the goal changes rather than
// being pinned to arbitrary fixed counts.
export function heatLevel(count: number, dailyGoal: number): number {
  if (count <= 0) return 0
  if (dailyGoal <= 0) return HEAT_LEVELS
  const ratio = count / dailyGoal
  return Math.min(HEAT_LEVELS, Math.max(1, Math.ceil(ratio * HEAT_LEVELS)))
}

// Builds a Sunday-first grid for the given month, padded with leading/trailing
// nulls so every row has 7 cells and the day-of-week columns line up.
export function buildMonthGrid(
  year: number,
  month: number,
  dailyActivity: Record<string, number>,
  dailyGoal: number,
  now: Date,
): (CalendarDay | null)[] {
  const firstOfMonth = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = firstOfMonth.getDay()
  const todayKey = dateKey(now)

  const cells: (CalendarDay | null)[] = Array.from({ length: leadingBlanks }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const key = dateKey(date)
    const count = dailyActivity[key] ?? 0
    cells.push({ date, key, count, level: heatLevel(count, dailyGoal), isToday: key === todayKey })
  }
  while (cells.length % 7 !== 0) {
    cells.push(null)
  }
  return cells
}
