import { useEffect, useRef, useState } from 'react'
import problemsData from '../data/problems.json'
import type { Problem } from '../types'
import { buildPracticeQueue, pickWeightedByWeakness } from '../lib/practiceQueue'
import { averageStageByCategory } from '../lib/categoryStats'
import { isProblemInEnabledLists } from '../data/problemLists'
import { getProblemIdFromUrl } from '../lib/problemQueryParam'
import { TOPICS } from '../data/lessons'
import type { useReviewState } from './useReviewState'
import type { useSettings } from './useSettings'
import type { useExcludedProblems } from './useExcludedProblems'

const ALL_PROBLEMS = problemsData as Problem[]
const PROBLEMS_BY_ID = new Map(ALL_PROBLEMS.map((p) => [p.id, p]))

// Every Nth already-reviewed due card becomes an MCQ instead of a flip card
// - a fixed cadence rather than a settings knob, same style as the
// STICKINESS/JITTER_WINDOW constants in practiceQueue.ts.
const MCQ_INTERVAL = 5
// Every Nth card in the whole deck (independent of MCQ's "already reviewed"
// eligibility - a pattern lesson is worth seeing even on a first-time
// problem) gets a pattern-lesson interstitial spliced in after it.
const PATTERN_INTERVAL = 8

export interface QueueItem {
  // A category name (one of the 18 Learn topics) when mode is 'pattern',
  // otherwise a problem id.
  id: string
  mode: 'card' | 'mcq' | 'pattern'
}

// Undo has to span two independent pieces of state (the Leitner schedule and
// the excluded-ids list), so SwipeReview tracks which kind of action was
// taken - as a stack, not just the single most recent one - instead of just
// delegating to review.undo(). 'pattern' has no persisted state at all -
// dismissing one never writes to Leitner or excluded-ids, so undoing one
// only needs to rewind the index.
export type LastAction = { kind: 'review'; id: string } | { kind: 'exclude'; id: string } | { kind: 'pattern' }

type Review = ReturnType<typeof useReviewState>
type Settings = ReturnType<typeof useSettings>
type Excluded = ReturnType<typeof useExcludedProblems>

// Picks a problem to quiz on right after a pattern card for `category` -
// prefers one that's currently due (so the follow-up doubles as real spaced-
// repetition practice), falling back to any eligible problem in the category
// since the point here is reinforcing what the pattern card just taught, not
// strictly re-testing something already studied in Swipe.
function pickCategoryProblem(
  category: string,
  settings: Settings,
  excluded: Excluded,
  dueIds: Set<string>,
  random: () => number,
): string | undefined {
  const eligible = ALL_PROBLEMS.filter(
    (p) =>
      p.category === category &&
      !excluded.isExcluded(p.id) &&
      settings.enabledDifficulties.includes(p.difficulty) &&
      isProblemInEnabledLists(p, settings.enabledLists),
  )
  if (eligible.length === 0) return undefined
  const due = eligible.filter((p) => dueIds.has(p.id))
  const pool = due.length > 0 ? due : eligible
  return pool[Math.floor(random() * pool.length)].id
}

function buildQueue(review: Review, settings: Settings, excluded: Excluded): QueueItem[] {
  const due = ALL_PROBLEMS.filter(
    (p) =>
      review.isDue(p.id) &&
      !excluded.isExcluded(p.id) &&
      settings.enabledDifficulties.includes(p.difficulty) &&
      isProblemInEnabledLists(p, settings.enabledLists),
  )
  const dueIds = new Set(due.map((p) => p.id))
  const weaknessByCategory = averageStageByCategory(ALL_PROBLEMS, review.reviewState)
  const orderedIds = buildPracticeQueue(
    due,
    settings.practiceMode,
    (id) => review.reviewState[id]?.dueAt,
    Math.random,
    (category) => weaknessByCategory.get(category) ?? 0,
  )

  // Never quiz on a problem seen for the first time - only cards already
  // reviewed at least once are eligible, counted independently of raw queue
  // position so the interval isn't thrown off by early first-time cards.
  let eligibleCount = 0
  let items: QueueItem[] = orderedIds.map((id) => {
    if (!settings.enableMcq || !review.isReviewed(id)) return { id, mode: 'card' }
    eligibleCount++
    return { id, mode: eligibleCount % MCQ_INTERVAL === 0 ? 'mcq' : 'card' }
  })

  if (settings.enablePatternCards && items.length > 0) {
    const withPatterns: QueueItem[] = []
    let sinceLastPattern = 0
    for (const item of items) {
      withPatterns.push(item)
      sinceLastPattern++
      if (sinceLastPattern >= PATTERN_INTERVAL) {
        // Weighted-random rather than a round-robin cycle - lets the same
        // weak category come up again before every other topic has had a
        // turn, which a full-coverage cycle would prevent.
        const category = pickWeightedByWeakness(TOPICS, (c) => weaknessByCategory.get(c) ?? 0, Math.random)
        withPatterns.push({ id: category, mode: 'pattern' })
        // Immediately test the topic the pattern card just taught - only
        // when MCQ cards are enabled at all, and only if there's an eligible
        // problem to ask about under the current difficulty/list filters.
        if (settings.enableMcq) {
          const problemId = pickCategoryProblem(category, settings, excluded, dueIds, Math.random)
          if (problemId) withPatterns.push({ id: problemId, mode: 'mcq' })
        }
        sinceLastPattern = 0
      }
    }
    items = withPatterns
  }

  // A refresh should land back on whatever problem was on top before - bring
  // it back to the front of the queue (never as an mcq - a refresh shouldn't
  // gamble the user into a quiz on the card they were mid-review on) rather
  // than re-rolling a fresh order.
  const requestedId = getProblemIdFromUrl()
  if (requestedId && PROBLEMS_BY_ID.has(requestedId)) {
    const withoutRequested = items.filter((item) => item.id !== requestedId)
    return [{ id: requestedId, mode: 'card' }, ...withoutRequested]
  }
  return items
}

// Owns the Swipe deck's queue/index/undo-stack. Lives in App (mounted for
// the app's whole lifetime) rather than inside SwipeReview itself, so
// switching to Learn/Stats/Settings and back no longer throws away queue
// progress and the pattern-card cadence along with it - SwipeReview used to
// rebuild this from scratch on every mount, since App only renders it while
// the Swipe tab is active.
export function usePracticeSession(review: Review, settings: Settings, excluded: Excluded) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>(() => buildQueue(review, settings, excluded))
  const [index, setIndex] = useState(0)
  const [actionStack, setActionStack] = useState<LastAction[]>([])

  // Rebuild only when settings that actually change deck composition change
  // (list/difficulty/mode/mcq/pattern toggles), not on every review action -
  // skips the mount run since the useState initializer above already built
  // the first queue.
  const isFirstEffect = useRef(true)
  useEffect(() => {
    if (isFirstEffect.current) {
      isFirstEffect.current = false
      return
    }
    setQueueItems(buildQueue(review, settings, excluded))
    setIndex(0)
    setActionStack([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings.enabledDifficulties,
    settings.enabledLists,
    settings.practiceMode,
    settings.enableMcq,
    settings.enablePatternCards,
  ])

  return { queueItems, setQueueItems, index, setIndex, actionStack, setActionStack }
}
