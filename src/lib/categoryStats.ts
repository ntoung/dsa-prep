import type { ReviewRecord } from './spacedRepetition'
import type { Problem } from '../types'

// Average Leitner stage per category, counting an unreviewed problem as
// stage 0. Shared by the practice queue (to weight weaker categories more
// heavily) and Stats (to surface them) so "weak" means the same thing in
// both places.
export function averageStageByCategory(
  problems: Problem[],
  reviewState: Record<string, ReviewRecord | undefined>,
): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>()
  for (const problem of problems) {
    const entry = totals.get(problem.category) ?? { sum: 0, count: 0 }
    entry.sum += reviewState[problem.id]?.stage ?? 0
    entry.count += 1
    totals.set(problem.category, entry)
  }
  const averages = new Map<string, number>()
  for (const [category, { sum, count }] of totals) {
    averages.set(category, count > 0 ? sum / count : 0)
  }
  return averages
}
