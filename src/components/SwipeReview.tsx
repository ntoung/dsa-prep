import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Ban, Check, Flame, NotepadText, PartyPopper, RotateCcw, Search } from 'lucide-react'
import problemsData from '../data/problems.json'
import type { Problem } from '../types'
import { setProblemIdInUrl } from '../lib/problemQueryParam'
import { useSwipeShortcuts } from '../hooks/useSwipeShortcuts'
import { ProblemCard, type ProblemCardHandle } from './ProblemCard'
import { MCQCard } from './MCQCard'
import { PatternCard, type PatternCardHandle } from './PatternCard'
import { NotesPanelHost } from './NotesPanelHost'
import { ProblemSearch } from './ProblemSearch'
import { LESSONS } from '../data/lessons'
import type { useReviewState } from '../hooks/useReviewState'
import type { useSettings } from '../hooks/useSettings'
import type { useExcludedProblems } from '../hooks/useExcludedProblems'
import type { useNotes } from '../hooks/useNotes'
import { usePracticeSession } from '../hooks/usePracticeSession'

const ALL_PROBLEMS = problemsData as Problem[]
const PROBLEMS_BY_ID = new Map(ALL_PROBLEMS.map((p) => [p.id, p]))
const LESSONS_BY_CATEGORY = new Map(LESSONS.map((lesson) => [lesson.category as string, lesson]))
const GOAL_TOAST_DURATION_MS = 3000
// How many cards later a "revisit" pattern card gets re-spliced back in -
// session-only, not persisted, since there's no Leitner record for a
// category to schedule a real due date against.
const PATTERN_REVISIT_DELAY = 5

interface SwipeReviewProps {
  review: ReturnType<typeof useReviewState>
  settings: ReturnType<typeof useSettings>
  excluded: ReturnType<typeof useExcludedProblems>
  notes: ReturnType<typeof useNotes>
  onOpenGlobalNote: () => void
  session: ReturnType<typeof usePracticeSession>
}

export function SwipeReview({ review, settings, excluded, notes, onOpenGlobalNote, session }: SwipeReviewProps) {
  const { queueItems, setQueueItems, index, setIndex, actionStack, setActionStack } = session
  const [topFlipped, setTopFlipped] = useState(settings.revealSolutionOnFlip)
  const [showGoalToast, setShowGoalToast] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const prevTodayCount = useRef(review.todayCount)
  // Only ever attached to the current top card - lets the icon-button row
  // trigger the same directional exit a drag would (see ProblemCard's
  // fling()), instead of the ghost defaulting to sliding right regardless
  // of which button was pressed.
  const topCardRef = useRef<ProblemCardHandle>(null)
  // Separate ref for the same reason: only ever attached to the top card
  // when it's a pattern card, since PatternCard's fling() has a narrower
  // (left/right only) signature than ProblemCardHandle's.
  const topPatternCardRef = useRef<PatternCardHandle>(null)
  const [notesOpenFor, setNotesOpenFor] = useState<string | null>(null)

  const remaining = queueItems.slice(index, index + 3)
  const topId = remaining[0]?.id
  const topMode = remaining[0]?.mode

  // Mirror the current top card into ?problem=<id> so a page refresh (or a
  // reload from a bookmarked/shared link) can restore it - see
  // getProblemIdFromUrl() above, read back only on first mount.
  useEffect(() => {
    setProblemIdInUrl(topId ?? null)
  }, [topId])

  // Jumping to a searched problem re-splices it to the current queue
  // position instead of replacing the queue outright, so the rest of the
  // session's order (and any already-passed cards) is left intact.
  const jumpToProblem = (id: string) => {
    setQueueItems((prev) => {
      const rest = prev.filter((item) => item.id !== id)
      const before = rest.slice(0, index)
      const after = rest.slice(index)
      return [...before, { id, mode: 'card' }, ...after]
    })
    setSearchOpen(false)
  }

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
    topCardRef.current?.fling('left')
    review.markReviewed(id)
    setActionStack((prev) => [...prev, { kind: 'review', id }])
    setIndex((i) => i + 1)
  }

  const handleReviewedEasy = (id: string) => {
    topCardRef.current?.fling('left')
    review.markReviewedEasy(id)
    setActionStack((prev) => [...prev, { kind: 'review', id }])
    setIndex((i) => i + 1)
  }

  const handleRevisit = (id: string) => {
    // Also the target for swiping up - "review for later" is the same
    // outcome regardless of which direction triggered it.
    topCardRef.current?.fling('right')
    review.markRevisit(id)
    setActionStack((prev) => [...prev, { kind: 'review', id }])
    setIndex((i) => i + 1)
  }

  const handleExclude = (id: string) => {
    topCardRef.current?.fling('down')
    excluded.exclude(id)
    setActionStack((prev) => [...prev, { kind: 'exclude', id }])
    setIndex((i) => i + 1)
  }

  const handleUndo = () => {
    const action = actionStack[actionStack.length - 1]
    if (!action) return
    if (action.kind === 'exclude') {
      excluded.unexclude(action.id)
    } else if (action.kind === 'review') {
      review.undo()
    }
    // 'pattern' has nothing persisted to revert - rewinding the index below
    // is the whole undo. Popping just the stack's current top (rather than
    // clearing it) is what lets repeated undo calls walk back through
    // several consecutive actions in one session.
    setActionStack((prev) => prev.slice(0, -1))
    setIndex((i) => Math.max(0, i - 1))
  }

  const handlePatternDismiss = () => {
    topPatternCardRef.current?.fling('left')
    setActionStack((prev) => [...prev, { kind: 'pattern' }])
    setIndex((i) => i + 1)
  }

  const handlePatternRevisit = (category: string) => {
    topPatternCardRef.current?.fling('right')
    // Ephemeral re-splice, same idea as jumpToProblem's - not persisted,
    // since a category has no Leitner record to schedule a real due date
    // against. Clamped to the current queue length in case it's shorter
    // than the delay (e.g. near the end of a session).
    setQueueItems((prev) => {
      const insertAt = Math.min(prev.length, index + 1 + PATTERN_REVISIT_DELAY)
      const next = [...prev]
      next.splice(insertAt, 0, { id: category, mode: 'pattern' })
      return next
    })
    setActionStack((prev) => [...prev, { kind: 'pattern' }])
    setIndex((i) => i + 1)
  }

  useSwipeShortcuts({
    topId,
    topMode,
    canUndo: actionStack.length > 0,
    topCardRef,
    onReviewed: handleReviewed,
    onRevisit: handleRevisit,
    onExclude: handleExclude,
    onUndo: handleUndo,
    onOpenNotes: setNotesOpenFor,
  })

  return (
    <div className="swipe-view">
      <div className="swipe-header">
        {searchOpen ? (
          <ProblemSearch
            problems={ALL_PROBLEMS}
            onSelect={jumpToProblem}
            onClose={() => setSearchOpen(false)}
          />
        ) : (
          <>
            <button
              type="button"
              className="icon-button icon-button-sm"
              aria-label="Find a problem"
              title="Find a problem"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={16} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button icon-button-sm"
              aria-label="Open notepad"
              title="Notepad"
              onClick={onOpenGlobalNote}
            >
              <NotepadText size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

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
              {remaining.map((item, i) => {
                const id = item.id
                if (item.mode === 'pattern') {
                  const lesson = LESSONS_BY_CATEGORY.get(id)
                  if (!lesson) return null
                  return (
                    <PatternCard
                      key={id}
                      ref={i === 0 ? topPatternCardRef : undefined}
                      lesson={lesson}
                      isTop={i === 0}
                      stackDepth={i}
                      onDismiss={handlePatternDismiss}
                      onRevisit={() => handlePatternRevisit(id)}
                      canUndo={i === 0 ? actionStack.length > 0 : false}
                      onUndo={i === 0 ? handleUndo : undefined}
                    />
                  )
                }
                const problem = PROBLEMS_BY_ID.get(id)
                if (!problem) return null
                if (item.mode === 'mcq') {
                  return (
                    <MCQCard
                      key={id}
                      problem={problem}
                      language={settings.codeLanguage}
                      isTop={i === 0}
                      stackDepth={i}
                      onCorrect={() => handleReviewed(id)}
                      onIncorrect={() => handleRevisit(id)}
                      canUndo={i === 0 ? actionStack.length > 0 : false}
                      onUndo={i === 0 ? handleUndo : undefined}
                    />
                  )
                }
                return (
                  <ProblemCard
                    key={id}
                    ref={i === 0 ? topCardRef : undefined}
                    problem={problem}
                    isTop={i === 0}
                    stackDepth={i}
                    startFlipped={settings.revealSolutionOnFlip}
                    progressiveReveal={settings.progressiveReveal}
                    onReviewed={() => handleReviewed(id)}
                    onReviewedEasy={() => handleReviewedEasy(id)}
                    onRevisit={() => handleRevisit(id)}
                    onExclude={() => handleExclude(id)}
                    onFlipChange={i === 0 ? setTopFlipped : undefined}
                    canUndo={i === 0 ? actionStack.length > 0 : false}
                    onUndo={i === 0 ? handleUndo : undefined}
                    onOpenNotes={i === 0 ? () => setNotesOpenFor(id) : undefined}
                    hasNote={notes.hasNote(id)}
                    reviewCount={review.reviewState[id]?.reviewCount ?? 0}
                    lastReviewedAt={review.reviewState[id]?.lastReviewedAt ?? null}
                    language={settings.codeLanguage}
                  />
                )
              })}
            </AnimatePresence>
            {!topFlipped && topMode === 'card' && (
              <div className="swipe-actions">
                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  aria-label="Exclude from review rotation"
                  title="Exclude"
                  onClick={() => handleExclude(topId)}
                >
                  <Ban size={22} strokeWidth={2} aria-hidden="true" />
                </button>
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
            {topMode === 'pattern' && (
              <div className="swipe-actions">
                <button
                  type="button"
                  className="icon-button icon-button-warning"
                  aria-label="Show this pattern again soon"
                  title="Show again soon"
                  onClick={() => handlePatternRevisit(topId)}
                >
                  <RotateCcw size={24} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-positive"
                  aria-label="Got it"
                  title="Got it"
                  onClick={handlePatternDismiss}
                >
                  <Check size={26} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <NotesPanelHost
        problemId={notesOpenFor}
        problems={PROBLEMS_BY_ID}
        notes={notes}
        onClose={() => setNotesOpenFor(null)}
      />
    </div>
  )
}
