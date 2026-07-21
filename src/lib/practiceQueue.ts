import type { PracticeMode, Problem } from '../types'

// Builds the Swipe review order for a batch of due problems.
//
// - "random": a plain shuffle, ignoring category entirely.
// - "bfs": tends to rotate across categories so consecutive cards cover
//   different topics, mirroring a breadth-first sweep over the syllabus.
// - "dfs": tends to stay within one category before moving on, mirroring a
//   depth-first drill into one topic at a time.
//
// bfs/dfs are *tendencies*, not strict orderings - a STICKINESS roll keeps
// some randomness in every session instead of producing a fully mechanical
// A-B-A-B or A-A-A-B-B-B pattern every time.
const STICKINESS: Record<Exclude<PracticeMode, 'random'>, number> = {
  dfs: 0.75,
  bfs: 0.15,
}

// When pulling the next problem out of a category's bucket, don't always
// take the single most-urgent one - draw from a small front window so
// due-date urgency still matters but doesn't make the order fully rigid.
const JITTER_WINDOW = 3

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Sorts categories weakest-first, but each one gets a random score scaled by
// its weakness rank so the order stays a tendency (like STICKINESS/
// JITTER_WINDOW elsewhere in this file) rather than a rigid ranking that
// would drill the same "weakest" category first in every session.
function weightedShuffleByWeakness(
  categories: string[],
  weaknessOf: (category: string) => number,
  random: () => number,
): string[] {
  const rankOf = new Map(
    [...categories].sort((a, b) => weaknessOf(a) - weaknessOf(b)).map((category, rank) => [category, rank]),
  )
  return [...categories]
    .map((category) => ({ category, score: random() * ((rankOf.get(category) ?? 0) + 1) }))
    .sort((a, b) => a.score - b.score)
    .map(({ category }) => category)
}

function groupByCategory(problems: Problem[]): Map<string, Problem[]> {
  const groups = new Map<string, Problem[]>()
  for (const problem of problems) {
    const bucket = groups.get(problem.category)
    if (bucket) {
      bucket.push(problem)
    } else {
      groups.set(problem.category, [problem])
    }
  }
  return groups
}

export function buildPracticeQueue(
  dueProblems: Problem[],
  mode: PracticeMode,
  dueAtOf: (id: string) => string | undefined,
  random: () => number = Math.random,
  // Lower = weaker = should surface earlier/more often. Only applied in
  // bfs/dfs - random explicitly ignores category entirely, so weighting it
  // by category would contradict its own contract.
  weaknessOf?: (category: string) => number,
): string[] {
  if (mode === 'random') {
    return shuffle(dueProblems, random).map((p) => p.id)
  }

  const byUrgency = (a: Problem, b: Problem) => {
    const dueA = dueAtOf(a.id)
    const dueB = dueAtOf(b.id)
    return (dueA ? new Date(dueA).getTime() : 0) - (dueB ? new Date(dueB).getTime() : 0)
  }

  const groups = groupByCategory(dueProblems)
  for (const bucket of groups.values()) bucket.sort(byUrgency)

  // Randomize which topic gets visited first/next each session, so bfs
  // rotation and dfs's "what to drill next" don't always follow the same
  // fixed category order. When weaknessOf is given, bias that order toward
  // weaker categories instead of a flat shuffle - still a tendency, not a
  // strict ordering, so it doesn't become a fully mechanical "weakest first"
  // drill every session.
  const categoryOrder = weaknessOf
    ? weightedShuffleByWeakness([...groups.keys()], weaknessOf, random)
    : shuffle([...groups.keys()], random)
  const stickiness = STICKINESS[mode]

  const queue: string[] = []
  let lastCategory: string | null = null
  let cursor = 0

  const hasRemaining = () => categoryOrder.some((c) => (groups.get(c)?.length ?? 0) > 0)

  while (hasRemaining()) {
    let category: string | null = null

    if (lastCategory && (groups.get(lastCategory)?.length ?? 0) > 0 && random() < stickiness) {
      category = lastCategory
    } else {
      for (let step = 0; step < categoryOrder.length; step++) {
        const candidate = categoryOrder[cursor % categoryOrder.length]
        cursor++
        if ((groups.get(candidate)?.length ?? 0) > 0) {
          category = candidate
          break
        }
      }
    }

    if (!category) break // unreachable given hasRemaining(), kept for type-safety
    const bucket = groups.get(category)!
    const pickIndex = Math.floor(random() * Math.min(JITTER_WINDOW, bucket.length))
    const [problem] = bucket.splice(pickIndex, 1)
    queue.push(problem.id)
    lastCategory = category
  }

  return queue
}
