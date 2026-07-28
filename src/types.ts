export type Difficulty = 'Easy' | 'Medium' | 'Hard'

export type Tab = 'swipe' | 'learn' | 'stats' | 'settings'

// bfs spreads picks across categories, dfs drills one category at a time,
// random ignores category entirely. See src/lib/practiceQueue.ts.
export type PracticeMode = 'bfs' | 'dfs' | 'random'

export interface RevealStage {
  label: string
  code: string
}

// Python is the only language every problem has (Problem.solutionCode/
// revealStages below, untouched) - 'javascript' only exists once a
// translation has been authored for a given problem. See
// src/data/CONTENT_SCHEMA.md for the full design rationale.
export type Language = 'python' | 'javascript'

export interface LanguageSolution {
  code: string
  revealStages?: RevealStage[]
}

// A solution split at exactly one blank (not a single string with an
// embedded marker) so "exactly one gap" is true by construction - no
// parsing required to render it, no way to accidentally author zero or two
// blanks. `options` includes the correct answer inline, same shape as the
// existing pattern/complexity MCQ.
export interface CruxQuestion {
  id: string
  language: Language
  codeBefore: string
  codeAfter: string
  options: string[]
  correctIndex: number
  needsReview: boolean
  reviewReason: string
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
  // Non-Python solutions - absent for every problem until a translation is
  // authored for it. No needsReview flag here on purpose: "not present yet"
  // already is the review gate, nothing publishes until it's ready. See
  // src/data/CONTENT_SCHEMA.md.
  translations?: Partial<Record<Exclude<Language, 'python'>, LanguageSolution>>
  // Optional, authored fill-in-the-blank quiz content - see CruxQuestion and
  // src/data/CONTENT_SCHEMA.md for how these differ from the generated
  // pattern/complexity MCQs in src/lib/mcqGenerator.ts.
  cruxQuestions?: CruxQuestion[]
  // Author-side: set by the generation pipeline's hitl step. Distinct from
  // the reader's own personal "reviewed" tracking (see useReviewState).
  needsReview: boolean
  reviewReason: string
}
