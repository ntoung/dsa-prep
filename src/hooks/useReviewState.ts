import { useCallback, useEffect, useState } from 'react'
import { demote, isDue as isRecordDue, isReviewed as isRecordReviewed, newRecord, promote } from '../lib/spacedRepetition'
import type { ReviewRecord } from '../lib/spacedRepetition'
import { computeStreak, todayKey } from '../lib/streak'
import { loadVersioned, saveVersioned, type Migration } from '../lib/versionedStorage'

const REVIEW_STATE_KEY = 'dsa-prep:review-state'
const REVIEW_STATE_VERSION = 1
const DAILY_ACTIVITY_KEY = 'dsa-prep:daily-activity'
const DAILY_ACTIVITY_VERSION = 1
const DAILY_PROGRESS_KEY = 'dsa-prep:daily-progress'
const DAILY_PROGRESS_VERSION = 1
const ACTIVITY_LOG_KEY = 'dsa-prep:activity-log'
const ACTIVITY_LOG_VERSION = 1
// Bounds localStorage growth over months of daily use - oldest entries drop
// off first once the cap is hit.
const ACTIVITY_LOG_MAX_ENTRIES = 2000

type ReviewState = Record<string, ReviewRecord>
// date key (YYYY-MM-DD) -> number of review actions taken that day
type DailyActivity = Record<string, number>

interface DailyProgress {
  date: string
  count: number
}

export type ReviewOutcome = 'reviewed' | 'reviewed-easy' | 'revisit'

export interface ActivityLogEntry {
  problemId: string
  outcome: ReviewOutcome
  timestamp: string
}

type ActivityLog = ActivityLogEntry[]

interface HistoryEntry {
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

function normalizeActivityLog(data: unknown): ActivityLog {
  return Array.isArray(data) ? (data as ActivityLog) : []
}

const ACTIVITY_LOG_MIGRATIONS: Migration<ActivityLog>[] = [{ version: 1, migrate: normalizeActivityLog }]

function loadActivityLog(): ActivityLog {
  return loadVersioned(ACTIVITY_LOG_KEY, ACTIVITY_LOG_VERSION, ACTIVITY_LOG_MIGRATIONS, () => [])
}

export function useReviewState() {
  const [reviewState, setReviewState] = useState<ReviewState>(() => loadReviewState())
  const [dailyActivity, setDailyActivity] = useState<DailyActivity>(() => loadDailyActivity())
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>(() => loadDailyProgress(new Date()))
  const [activityLog, setActivityLog] = useState<ActivityLog>(() => loadActivityLog())
  // A stack (not just the single most recent entry) so undo can walk back
  // through several consecutive actions in one session, not just the last
  // one - session-only like the fields above, never persisted.
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    saveVersioned(REVIEW_STATE_KEY, REVIEW_STATE_VERSION, reviewState)
  }, [reviewState])

  useEffect(() => {
    saveVersioned(DAILY_ACTIVITY_KEY, DAILY_ACTIVITY_VERSION, dailyActivity)
  }, [dailyActivity])

  useEffect(() => {
    saveVersioned(DAILY_PROGRESS_KEY, DAILY_PROGRESS_VERSION, dailyProgress)
  }, [dailyProgress])

  useEffect(() => {
    saveVersioned(ACTIVITY_LOG_KEY, ACTIVITY_LOG_VERSION, activityLog)
  }, [activityLog])

  const recordAction = useCallback(
    (id: string, outcome: ReviewOutcome, transform: (record: ReviewRecord, now: Date) => ReviewRecord) => {
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
      setActivityLog((prev) => {
        const next = [...prev, { problemId: id, outcome, timestamp: now.toISOString() }]
        return next.length > ACTIVITY_LOG_MAX_ENTRIES ? next.slice(next.length - ACTIVITY_LOG_MAX_ENTRIES) : next
      })
      setHistory((prev) => [...prev, { id, previousRecord }])
    },
    [reviewState],
  )

  const markReviewed = useCallback((id: string) => recordAction(id, 'reviewed', promote), [recordAction])
  // "Easy" tier: jumps two Leitner stages instead of one, for a confident
  // recall (long swipe or the dedicated icon button) vs. a plain pass.
  const markReviewedEasy = useCallback(
    (id: string) => recordAction(id, 'reviewed-easy', (record, now) => promote(record, now, 2)),
    [recordAction],
  )
  const markRevisit = useCallback((id: string) => recordAction(id, 'revisit', demote), [recordAction])

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
    const entry = history[history.length - 1]
    if (!entry) return
    setReviewState((prev) => {
      const next = { ...prev }
      if (entry.previousRecord) {
        next[entry.id] = entry.previousRecord
      } else {
        delete next[entry.id]
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
    // recordAction only ever appends, and undo only ever pops the current
    // top of `history` - so the entry to remove is always whatever's
    // currently last, regardless of the cap in recordAction having trimmed
    // the front of the array since. Repeated undo calls walk back through
    // several consecutive actions this way, not just the most recent one.
    setActivityLog((prev) => prev.slice(0, -1))
    setHistory((prev) => prev.slice(0, -1))
  }, [history])

  const isReviewed = useCallback((id: string) => isRecordReviewed(reviewState[id]), [reviewState])
  const isDue = useCallback((id: string) => isRecordDue(reviewState[id], new Date()), [reviewState])

  const reviewedCount = Object.values(reviewState).filter(isRecordReviewed).length
  const streak = computeStreak(Object.keys(dailyActivity), new Date())

  return {
    reviewState,
    dailyActivity,
    activityLog,
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
    canUndo: history.length > 0,
  }
}
