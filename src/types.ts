export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export type Tab = 'swipe' | 'learn' | 'stats' | 'settings'

// bfs spreads picks across categories, dfs drills one category at a time,
// random ignores category entirely. See src/lib/practiceQueue.ts.
export type PracticeMode = 'bfs' | 'dfs' | 'random'

export interface RevealStage {
  label: string
  code: string
}

export interface Problem {
  id: string
  title: string
  category: string
  difficulty: Difficulty
  url: string
  pattern: string
  summary: string
  approachSummary: string
  walkthrough: string
  complexity: {
    time: string
    space: string
  }
  pitfalls: string[]
  solutionCode: string
  // Optional staged build-up shown before solutionCode in recall mode - a
  // skeleton tightened toward the actual solution over 1-2 steps, so phone
  // users get progressive retrieval practice without having to type code.
  // Absent on most problems today; falls back to showing solutionCode
  // directly when empty/missing.
  revealStages?: RevealStage[]
  // Author-side: set by the generation pipeline's hitl step. Distinct from
  // the reader's own personal "reviewed" tracking (see useReviewState).
  needsReview: boolean
  reviewReason: string
}
