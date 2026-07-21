import type { Problem } from '../types'

export interface McqQuestion {
  problemId: string
  kind: 'pattern' | 'complexity'
  prompt: string
  options: string[]
  correctIndex: number
}

// Real complexity.time strings vary wildly in shape - "O(v + e)", "O(n * n!)",
// "O(4^n / sqrt(n))" - so a fixed distractor pool only makes sense next to
// the common, single-variable complexities below. Anything else falls back
// to a pattern-recognition question instead of pairing mismatched options.
const COMPLEXITY_POOL = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(n^3)', 'O(n!)', 'O(2^n)']

export function extractComplexity(timeStr: string): string | null {
  const match = timeStr.trim().match(/^O\([^)]*\)/)
  return match ? match[0] : null
}

function sampleDistinct<T>(pool: T[], exclude: T, count: number, random: () => number): T[] {
  const shuffled = pool.filter((item) => item !== exclude)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, count)
}

function buildOptions(correct: string, distractors: string[], random: () => number) {
  const options = [correct, ...distractors]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { options, correctIndex: options.indexOf(correct) }
}

function buildPatternQuestion(problem: Problem, allProblems: Problem[], random: () => number): McqQuestion | null {
  const allPatterns = Array.from(new Set(allProblems.map((p) => p.pattern)))
  const distractors = sampleDistinct(allPatterns, problem.pattern, 3, random)
  if (distractors.length < 3) return null
  const { options, correctIndex } = buildOptions(problem.pattern, distractors, random)
  return {
    problemId: problem.id,
    kind: 'pattern',
    prompt: `Which pattern solves "${problem.title}"?`,
    options,
    correctIndex,
  }
}

function buildComplexityQuestion(problem: Problem, random: () => number): McqQuestion | null {
  const correct = extractComplexity(problem.complexity.time)
  if (!correct || !COMPLEXITY_POOL.includes(correct)) return null
  const distractors = sampleDistinct(COMPLEXITY_POOL, correct, 3, random)
  if (distractors.length < 3) return null
  const { options, correctIndex } = buildOptions(correct, distractors, random)
  return {
    problemId: problem.id,
    kind: 'complexity',
    prompt: `What's the optimal time complexity for "${problem.title}"?`,
    options,
    correctIndex,
  }
}

// Picks complexity-recall when the problem's complexity fits the closed
// pool above, otherwise always falls back to pattern-recognition (which
// works for every problem) rather than returning null and losing the card.
export function buildMcqQuestion(
  problem: Problem,
  allProblems: Problem[],
  random: () => number = Math.random,
): McqQuestion | null {
  if (random() < 0.5) {
    const complexityQuestion = buildComplexityQuestion(problem, random)
    if (complexityQuestion) return complexityQuestion
  }
  return buildPatternQuestion(problem, allProblems, random)
}
