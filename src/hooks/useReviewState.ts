import { useCallback, useEffect, useMemo, useState } from 'react'
import { demote, isDue as isRecordDue, isReviewed as isRecordReviewed, newRecord, promote } from '../lib/spacedRepetition'
import type { ReviewRecord } from '../lib/spacedRepetition'
import { computeStreak, dailyCountsFromLog, todayKey } from '../lib/streak'
import { loadVersioned, saveVersioned, type Migration } from '../lib/versionedStorage'

const REVIEW_STATE_KEY = 'dsa-prep:review-state'
const REVIEW_STATE_VERSION = 1
// Retired in favor of deriving daily counts from ACTIVITY_LOG_KEY below -
// only kept around as string literals so useReviewState can clear out
// whatever an existing install still has on disk under these keys.
const RETIRED_DAILY_ACTIVITY_KEY = 'dsa-prep:daily-activity'
const RETIRED_DAILY_PROGRESS_KEY = 'dsa-prep:daily-progress'
const ACTIVITY_LOG_KEY = 'dsa-prep:activity-log'
const ACTIVITY_LOG_VERSION = 1

type ReviewState = Record<string, ReviewRecord>

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

function normalizeActivityLog(data: unknown): ActivityLog {
  return Array.isArray(data) ? (data as ActivityLog) : []
}

const ACTIVITY_LOG_MIGRATIONS: Migration<ActivityLog>[] = [{ version: 1, migrate: normalizeActivityLog }]

function loadActivityLog(): ActivityLog {
  return loadVersioned(ACTIVITY_LOG_KEY, ACTIVITY_LOG_VERSION, ACTIVITY_LOG_MIGRATIONS, () => [])
}

export function useReviewState() {
  const [reviewState, setReviewState] = useState<ReviewState>(() => loadReviewState())
  const [activityLog, setActivityLog] = useState<ActivityLog>(() => loadActivityLog())
  // A stack (not just the single most recent entry) so undo can walk back
  // through several consecutive actions in one session, not just the last
  // one - session-only like the fields above, never persisted.
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => {
    saveVersioned(REVIEW_STATE_KEY, REVIEW_STATE_VERSION, reviewState)
  }, [reviewState])

  useEffect(() => {
    saveVersioned(ACTIVITY_LOG_KEY, ACTIVITY_LOG_VERSION, activityLog)
  }, [activityLog])

  // dsa-prep:daily-activity and dsa-prep:daily-progress are gone - both were
  // just a running fold over this log, so they're derived below instead of
  // persisted. Clear out whatever an existing install still has on disk
  // under those keys rather than leaving them as permanent dead weight.
  useEffect(() => {
    localStorage.removeItem(RETIRED_DAILY_ACTIVITY_KEY)
    localStorage.removeItem(RETIRED_DAILY_PROGRESS_KEY)
  }, [])

  const dailyActivity = useMemo(() => dailyCountsFromLog(activityLog), [activityLog])
  const todayCount = dailyActivity[todayKey(new Date())] ?? 0

  const recordAction = useCallback(
    (id: string, outcome: ReviewOutcome, transform: (record: ReviewRecord, now: Date) => ReviewRecord) => {
      const now = new Date()
      const previousRecord = reviewState[id]

      setReviewState((prev) => ({ ...prev, [id]: transform(previousRecord ?? newRecord(now), now) }))
      setActivityLog((prev) => [...prev, { problemId: id, outcome, timestamp: now.toISOString() }])
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
    // recordAction only ever appends, and undo only ever pops the current
    // top of `history` - so the entry to remove is always whatever's
    // currently last. dailyActivity/todayCount fall back into sync
    // automatically since they're derived from this log. Repeated undo
    // calls walk back through several consecutive actions this way, not
    // just the most recent one.
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
    todayCount,
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
