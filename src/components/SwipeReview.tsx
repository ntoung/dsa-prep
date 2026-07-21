import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Check, CheckCheck, Flame, PartyPopper, RotateCcw } from 'lucide-react'
import problemsData from '../data/problems.json'
import type { Problem } from '../types'
import { buildPracticeQueue } from '../lib/practiceQueue'
import { averageStageByCategory } from '../lib/categoryStats'
import { isProblemInEnabledLists } from '../data/problemLists'
import { ProblemCard } from './ProblemCard'
import { MCQCard } from './MCQCard'
import type { useReviewState } from '../useReviewState'
import type { useSettings } from '../useSettings'

const ALL_PROBLEMS = problemsData as Problem[]
const PROBLEMS_BY_ID = new Map(ALL_PROBLEMS.map((p) => [p.id, p]))
const GOAL_TOAST_DURATION_MS = 3000
// Every Nth already-reviewed due card becomes an MCQ instead of a flip card
// - a fixed cadence rather than a settings knob, same style as the
// STICKINESS/JITTER_WINDOW constants in practiceQueue.ts.
const MCQ_INTERVAL = 5

interface SwipeReviewProps {
  review: ReturnType<typeof useReviewState>
  settings: ReturnType<typeof useSettings>
}

export function SwipeReview({ review, settings }: SwipeReviewProps) {
  const [queue] = useState<string[]>(() => {
    const due = ALL_PROBLEMS.filter(
      (p) =>
        review.isDue(p.id) &&
        settings.enabledDifficulties.includes(p.difficulty) &&
        isProblemInEnabledLists(p, settings.enabledLists),
    )
    const weaknessByCategory = averageStageByCategory(ALL_PROBLEMS, review.reviewState)
    return buildPracticeQueue(
      due,
      settings.practiceMode,
      (id) => review.reviewState[id]?.dueAt,
      Math.random,
      (category) => weaknessByCategory.get(category) ?? 0,
    )
  })
  // Never quiz on a problem seen for the first time - only cards already
  // reviewed at least once are eligible, counted independently of raw queue
  // position so the interval isn't thrown off by early first-time cards.
  const [presentationModes] = useState<('card' | 'mcq')[]>(() => {
    let eligibleCount = 0
    return queue.map((id) => {
      if (!settings.enableMcq || !review.isReviewed(id)) return 'card'
      eligibleCount++
      return eligibleCount % MCQ_INTERVAL === 0 ? 'mcq' : 'card'
    })
  })
  const [index, setIndex] = useState(0)
  const [topFlipped, setTopFlipped] = useState(settings.revealSolutionOnFlip)
  const [showGoalToast, setShowGoalToast] = useState(false)
  const prevTodayCount = useRef(review.todayCount)

  const remaining = queue.slice(index, index + 3)
  const modes = presentationModes.slice(index, index + 3)
  const topId = remaining[0]
  const topMode = modes[0]

  // The overlay hides while flipped so it never covers the explanation text;
  // reset it whenever a new card becomes the top of the stack, matching
  // whichever face that card starts on.
  useEffect(() => {
    setTopFlipped(settings.revealSolutionOnFlip)
  }, [topId, settings.revealSolutionOnFlip])

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

  const handleReviewedEasy = (id: string) => {
    review.markReviewedEasy(id)
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
                if (modes[i] === 'mcq') {
                  return (
                    <MCQCard
                      key={id}
                      problem={problem}
                      isTop={i === 0}
                      stackDepth={i}
                      onCorrect={() => handleReviewed(id)}
                      onIncorrect={() => handleRevisit(id)}
                      canUndo={i === 0 ? review.canUndo : false}
                      onUndo={i === 0 ? handleUndo : undefined}
                    />
                  )
                }
                return (
                  <ProblemCard
                    key={id}
                    problem={problem}
                    isTop={i === 0}
                    stackDepth={i}
                    startFlipped={settings.revealSolutionOnFlip}
                    onReviewed={() => handleReviewed(id)}
                    onReviewedEasy={() => handleReviewedEasy(id)}
                    onRevisit={() => handleRevisit(id)}
                    onFlipChange={i === 0 ? setTopFlipped : undefined}
                    canUndo={i === 0 ? review.canUndo : false}
                    onUndo={i === 0 ? handleUndo : undefined}
                  />
                )
              })}
            </AnimatePresence>
            {!topFlipped && topMode !== 'mcq' && (
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
                <button
                  type="button"
                  className="icon-button icon-button-positive"
                  aria-label="Mark reviewed - easy, knew it instantly"
                  title="Mark reviewed - easy"
                  onClick={() => handleReviewedEasy(topId)}
                >
                  <CheckCheck size={24} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
