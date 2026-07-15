import { useCallback, useEffect, useState } from 'react'
import { demote, isDue as isRecordDue, isReviewed as isRecordReviewed, newRecord, promote } from './lib/spacedRepetition'
import type { ReviewRecord } from './lib/spacedRepetition'
import { computeStreak, todayKey } from './lib/streak'

const REVIEW_STATE_KEY = 'dsa-prep:review-state'
const DAILY_ACTIVITY_KEY = 'dsa-prep:daily-activity'
const DAILY_PROGRESS_KEY = 'dsa-prep:daily-progress'

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

function loadReviewState(): ReviewState {
  try {
    const raw = localStorage.getItem(REVIEW_STATE_KEY)
    return raw ? (JSON.parse(raw) as ReviewState) : {}
  } catch {
    return {}
  }
}

function loadDailyActivity(): DailyActivity {
  try {
    const raw = localStorage.getItem(DAILY_ACTIVITY_KEY)
    return raw ? (JSON.parse(raw) as DailyActivity) : {}
  } catch {
    return {}
  }
}

function loadDailyProgress(now: Date): DailyProgress {
  try {
    const raw = localStorage.getItem(DAILY_PROGRESS_KEY)
    const parsed = raw ? (JSON.parse(raw) as DailyProgress) : null
    if (parsed && parsed.date === todayKey(now)) return parsed
  } catch {
    // fall through to a fresh day
  }
  return { date: todayKey(now), count: 0 }
}

export function useReviewState() {
  const [reviewState, setReviewState] = useState<ReviewState>(() => loadReviewState())
  const [dailyActivity, setDailyActivity] = useState<DailyActivity>(() => loadDailyActivity())
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>(() => loadDailyProgress(new Date()))
  const [lastAction, setLastAction] = useState<LastAction | null>(null)

  useEffect(() => {
    localStorage.setItem(REVIEW_STATE_KEY, JSON.stringify(reviewState))
  }, [reviewState])

  useEffect(() => {
    localStorage.setItem(DAILY_ACTIVITY_KEY, JSON.stringify(dailyActivity))
  }, [dailyActivity])

  useEffect(() => {
    localStorage.setItem(DAILY_PROGRESS_KEY, JSON.stringify(dailyProgress))
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
    markRevisit,
    toggleReviewed,
    undo,
    canUndo: lastAction !== null,
  }
}
