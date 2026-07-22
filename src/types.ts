export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export type Tab = 'swipe' | 'learn' | 'stats' | 'settings'

// bfs spreads picks across categories, dfs drills one category at a time,
// random ignores category entirely. See src/lib/practiceQueue.ts.
export type PracticeMode = 'bfs' | 'dfs' | 'random'

export interface RevealStage {
  label: string
  code: string
}

// The 18 Learn-tab topics (src/data/lessons.ts) - the fixed vocabulary every
// problem's `patterns` badges must draw from, so a badge always corresponds
// to something a user could actually look up in Learn.
export type Topic =
  | 'Arrays & Hashing'
  | 'Two Pointers'
  | 'Sliding Window'
  | 'Stack'
  | 'Binary Search'
  | 'Linked List'
  | 'Trees'
  | 'Tries'
  | 'Heap / Priority Queue'
  | 'Backtracking'
  | 'Graphs'
  | 'Advanced Graphs'
  | '1-D Dynamic Programming'
  | '2-D Dynamic Programming'
  | 'Greedy'
  | 'Intervals'
  | 'Math & Geometry'
  | 'Bit Manipulation'

export interface Problem {
  id: string
  title: string
  category: string
  difficulty: Difficulty
  url: string
  // One badge per topic this problem is genuinely solvable via - almost
  // always just [category], with more than one only when the problem has
  // more than one well-known, independently-standard solving approach
  // (e.g. Top K Frequent Elements: bucket sort AND a heap-of-size-k).
  patterns: Topic[]
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
