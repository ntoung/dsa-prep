import { useCallback, useEffect, useState } from 'react'
import { demote, isDue as isRecordDue, isReviewed as isRecordReviewed, newRecord, promote } from './lib/spacedRepetition'
import type { ReviewRecord } from './lib/spacedRepetition'
import { computeStreak, todayKey } from './lib/streak'
import { loadVersioned, saveVersioned, type Migration } from './lib/versionedStorage'

const REVIEW_STATE_KEY = 'dsa-prep:review-state'
const REVIEW_STATE_VERSION = 1
const DAILY_ACTIVITY_KEY = 'dsa-prep:daily-activity'
const DAILY_ACTIVITY_VERSION = 1
const DAILY_PROGRESS_KEY = 'dsa-prep:daily-progress'
const DAILY_PROGRESS_VERSION = 1

type ReviewState = Record<string, ReviewRecord>
// date key (YYYY-MM-DD) -> number of review actions taken that day
type DailyActivity = Record<string, number>

interface DailyProgress {
  date: string
  count: number
}

interface LastAction {
  id: string
  previousRecord: ReviewRecord | undefined
}

function normalizeReviewState(data: unknown): ReviewState {
  return data && typeof data === 'object' ? (data as ReviewState) : {}
}

const REVIEW_STATE_MIGRATIONS: Migration<ReviewState>[] = [{ version: 1, migrate: normalizeReviewState }]

function loadReviewState(): ReviewState {
  return loadVersioned(REVIEW_STATE_KEY, REVIEW_STATE_VERSION, REVIEW_STATE_MIGRATIONS, () => ({}))
}

function normalizeDailyActivity(data: unknown): DailyActivity {
  return data && typeof data === 'object' ? (data as DailyActivity) : {}
}

const DAILY_ACTIVITY_MIGRATIONS: Migration<DailyActivity>[] = [{ version: 1, migrate: normalizeDailyActivity }]

function loadDailyActivity(): DailyActivity {
  return loadVersioned(DAILY_ACTIVITY_KEY, DAILY_ACTIVITY_VERSION, DAILY_ACTIVITY_MIGRATIONS, () => ({}))
}

function normalizeDailyProgress(data: unknown): DailyProgress {
  const parsed = data as Partial<DailyProgress> | null
  if (parsed && typeof parsed.date === 'string' && typeof parsed.count === 'number') {
    return { date: parsed.date, count: parsed.count }
  }
  // An invalid/missing date never matches todayKey(), so the freshness
  // check in loadDailyProgress below resets it to a fresh day.
  return { date: '', count: 0 }
}

const DAILY_PROGRESS_MIGRATIONS: Migration<DailyProgress>[] = [{ version: 1, migrate: normalizeDailyProgress }]

function loadDailyProgress(now: Date): DailyProgress {
  const stored = loadVersioned(DAILY_PROGRESS_KEY, DAILY_PROGRESS_VERSION, DAILY_PROGRESS_MIGRATIONS, () =>
    normalizeDailyProgress(null),
  )
  return stored.date === todayKey(now) ? stored : { date: todayKey(now), count: 0 }
}

export function useReviewState() {
  const [reviewState, setReviewState] = useState<ReviewState>(() => loadReviewState())
  const [dailyActivity, setDailyActivity] = useState<DailyActivity>(() => loadDailyActivity())
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>(() => loadDailyProgress(new Date()))
  const [lastAction, setLastAction] = useState<LastAction | null>(null)

  useEffect(() => {
    saveVersioned(REVIEW_STATE_KEY, REVIEW_STATE_VERSION, reviewState)
  }, [reviewState])

  useEffect(() => {
    saveVersioned(DAILY_ACTIVITY_KEY, DAILY_ACTIVITY_VERSION, dailyActivity)
  }, [dailyActivity])

  useEffect(() => {
    saveVersioned(DAILY_PROGRESS_KEY, DAILY_PROGRESS_VERSION, dailyProgress)
  }, [dailyProgress])

  const recordAction = useCallback(
    (id: string, transform: (record: ReviewRecord, now: Date) => ReviewRecord) => {
      const now = new Date()
      const previousRecord = reviewState[id]

      setReviewState((prev) => ({ ...prev, [id]: transform(previousRecord ?? newRecord(now), now) }))
      setDailyActivity((prev) => {
        const key = todayKey(now)
        return { ...prev, [key]: (prev[key] ?? 0) + 1 }
      })
      setDailyProgress((prev) => {
        const key = todayKey(now)
        const count = prev.date === key ? prev.count + 1 : 1
        return { date: key, count }
      })
      setLastAction({ id, previousRecord })
    },
    [reviewState],
  )

  const markReviewed = useCallback((id: string) => recordAction(id, promote), [recordAction])
  // "Easy" tier: jumps two Leitner stages instead of one, for a confident
  // recall (long swipe or the dedicated icon button) vs. a plain pass.
  const markReviewedEasy = useCallback(
    (id: string) => recordAction(id, (record, now) => promote(record, now, 2)),
    [recordAction],
  )
  const markRevisit = useCallback((id: string) => recordAction(id, demote), [recordAction])

  const toggleReviewed = useCallback((id: string) => {
    setReviewState((prev) => {
      const current = prev[id]
      if (isRecordReviewed(current)) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      const now = new Date()
      return { ...prev, [id]: promote(current ?? newRecord(now), now) }
    })
  }, [])

  const undo = useCallback(() => {
    if (!lastAction) return
    setReviewState((prev) => {
      const next = { ...prev }
      if (lastAction.previousRecord) {
        next[lastAction.id] = lastAction.previousRecord
      } else {
        delete next[lastAction.id]
      }
      return next
    })
    setDailyProgress((prev) => ({ ...prev, count: Math.max(0, prev.count - 1) }))
    setDailyActivity((prev) => {
      const key = todayKey(new Date())
      const current = prev[key] ?? 0
      if (current <= 1) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: current - 1 }
    })
    setLastAction(null)
  }, [lastAction])

  const isReviewed = useCallback((id: string) => isRecordReviewed(reviewState[id]), [reviewState])
  const isDue = useCallback((id: string) => isRecordDue(reviewState[id], new Date()), [reviewState])

  const reviewedCount = Object.values(reviewState).filter(isRecordReviewed).length
  const streak = computeStreak(Object.keys(dailyActivity), new Date())

  return {
    reviewState,
    dailyActivity,
    reviewedCount,
    streak,
    todayCount: dailyProgress.count,
    isReviewed,
    isDue,
    markReviewed,
    markReviewedEasy,
    markRevisit,
    toggleReviewed,
    undo,
    canUndo: lastAction !== null,
  }
}
