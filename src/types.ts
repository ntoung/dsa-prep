export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export type Tab = 'swipe' | 'learn' | 'stats' | 'settings'

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
  // Author-side: set by the generation pipeline's hitl step. Distinct from
  // the reader's own personal "reviewed" tracking (see useReviewState).
  needsReview: boolean
  reviewReason: string
}
