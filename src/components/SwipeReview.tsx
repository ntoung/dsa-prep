import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Check, Flame, PartyPopper, RotateCcw } from 'lucide-react'
import problemsData from '../data/problems.json'
import type { Problem } from '../types'
import { ProblemCard } from './ProblemCard'
import type { useReviewState } from '../useReviewState'
import type { useSettings } from '../useSettings'

const ALL_PROBLEMS = problemsData as Problem[]
const PROBLEMS_BY_ID = new Map(ALL_PROBLEMS.map((p) => [p.id, p]))
const GOAL_TOAST_DURATION_MS = 3000

interface SwipeReviewProps {
  review: ReturnType<typeof useReviewState>
  settings: ReturnType<typeof useSettings>
}

export function SwipeReview({ review, settings }: SwipeReviewProps) {
  const [queue] = useState<string[]>(() =>
    ALL_PROBLEMS.filter((p) => review.isDue(p.id) && settings.enabledDifficulties.includes(p.difficulty))
      .map((p) => p.id)
      .sort((a, b) => {
        const dueA = review.reviewState[a]?.dueAt
        const dueB = review.reviewState[b]?.dueAt
        return (dueA ? new Date(dueA).getTime() : 0) - (dueB ? new Date(dueB).getTime() : 0)
      }),
  )
  const [index, setIndex] = useState(0)
  const [topFlipped, setTopFlipped] = useState(false)
  const [showGoalToast, setShowGoalToast] = useState(false)
  const prevTodayCount = useRef(review.todayCount)

  const remaining = queue.slice(index, index + 3)
  const topId = remaining[0]

  // The overlay hides while flipped so it never covers the explanation text;
  // reset it whenever a new card becomes the top of the stack.
  useEffect(() => {
    setTopFlipped(false)
  }, [topId])

  // Show the "goal reached" toast only at the moment the goal is crossed, not
  // every time this view mounts while already at or past the goal.
  useEffect(() => {
    const wasBelowGoal = prevTodayCount.current < settings.dailyGoal
    const isAtGoal = review.todayCount >= settings.dailyGoal
    if (wasBelowGoal && isAtGoal) {
      setShowGoalToast(true)
      const timeout = setTimeout(() => setShowGoalToast(false), GOAL_TOAST_DURATION_MS)
      prevTodayCount.current = review.todayCount
      return () => clearTimeout(timeout)
    }
    prevTodayCount.current = review.todayCount
  }, [review.todayCount, settings.dailyGoal])

  const handleReviewed = (id: string) => {
    review.markReviewed(id)
    setIndex((i) => i + 1)
  }

  const handleRevisit = (id: string) => {
    review.markRevisit(id)
    setIndex((i) => i + 1)
  }

  const handleUndo = () => {
    review.undo()
    setIndex((i) => Math.max(0, i - 1))
  }

  return (
    <div className="swipe-view">
      <AnimatePresence>
        {showGoalToast && (
          <motion.div
            className="goal-toast"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <PartyPopper size={16} strokeWidth={2} aria-hidden="true" /> Daily goal reached
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card-stack">
        {remaining.length === 0 ? (
          <div className="swipe-empty">
            <p className="swipe-empty-title">All caught up!</p>
            <p>No problems due for review right now.</p>
            <p className="swipe-empty-sub">
              {review.streak > 0 ? (
                <>
                  <Flame size={16} strokeWidth={2} aria-hidden="true" /> {review.streak} day streak
                </>
              ) : (
                'Come back tomorrow to keep your streak going.'
              )}
            </p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {remaining.map((id, i) => {
                const problem = PROBLEMS_BY_ID.get(id)
                if (!problem) return null
                return (
                  <ProblemCard
                    key={id}
                    problem={problem}
                    isTop={i === 0}
                    stackDepth={i}
                    onReviewed={() => handleReviewed(id)}
                    onRevisit={() => handleRevisit(id)}
                    onFlipChange={i === 0 ? setTopFlipped : undefined}
                    canUndo={i === 0 ? review.canUndo : false}
                    onUndo={i === 0 ? handleUndo : undefined}
                  />
                )
              })}
            </AnimatePresence>
            {!topFlipped && (
              <div className="swipe-actions">
                <button
                  type="button"
                  className="icon-button icon-button-warning"
                  aria-label="Revisit later"
                  title="Revisit later"
                  onClick={() => handleRevisit(topId)}
                >
                  <RotateCcw size={24} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-positive"
                  aria-label="Mark reviewed"
                  title="Mark reviewed"
                  onClick={() => handleReviewed(topId)}
                >
                  <Check size={26} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
