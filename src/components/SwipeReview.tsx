import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Ban, Check, Flame, PartyPopper, RotateCcw, Search } from 'lucide-react'
import problemsData from '../data/problems.json'
import type { Problem } from '../types'
import { buildPracticeQueue } from '../lib/practiceQueue'
import { averageStageByCategory } from '../lib/categoryStats'
import { isProblemInEnabledLists } from '../data/problemLists'
import { getProblemIdFromUrl, setProblemIdInUrl } from '../lib/problemQueryParam'
import { SHORTCUTS } from '../lib/keyboardShortcuts'
import { useKeyboardShortcuts, type ShortcutBinding } from '../useKeyboardShortcuts'
import { ProblemCard, type ProblemCardHandle } from './ProblemCard'
import { MCQCard } from './MCQCard'
import { NotesPanel } from './NotesPanel'
import { ProblemSearch } from './ProblemSearch'
import type { useReviewState } from '../useReviewState'
import type { useSettings } from '../useSettings'
import type { useExcludedProblems } from '../useExcludedProblems'
import type { useNotes } from '../useNotes'

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
  excluded: ReturnType<typeof useExcludedProblems>
  notes: ReturnType<typeof useNotes>
}

// Undo has to span two independent pieces of state (the Leitner schedule and
// the excluded-ids list), so SwipeReview tracks which kind of action was
// last taken instead of just delegating to review.undo() - see handleUndo.
type LastAction = { kind: 'review'; id: string } | { kind: 'exclude'; id: string }

interface QueueItem {
  id: string
  mode: 'card' | 'mcq'
}

export function SwipeReview({ review, settings, excluded, notes }: SwipeReviewProps) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>(() => {
    const due = ALL_PROBLEMS.filter(
      (p) =>
        review.isDue(p.id) &&
        !excluded.isExcluded(p.id) &&
        settings.enabledDifficulties.includes(p.difficulty) &&
        isProblemInEnabledLists(p, settings.enabledLists),
    )
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
    const items: QueueItem[] = orderedIds.map((id) => {
      if (!settings.enableMcq || !review.isReviewed(id)) return { id, mode: 'card' }
      eligibleCount++
      return { id, mode: eligibleCount % MCQ_INTERVAL === 0 ? 'mcq' : 'card' }
    })

    // A refresh should land back on whatever problem was on top before -
    // bring it back to the front of the queue (never as an mcq - a refresh
    // shouldn't gamble the user into a quiz on the card they were mid-review
    // on) rather than re-rolling a fresh order.
    const requestedId = getProblemIdFromUrl()
    if (requestedId && PROBLEMS_BY_ID.has(requestedId)) {
      const withoutRequested = items.filter((item) => item.id !== requestedId)
      return [{ id: requestedId, mode: 'card' }, ...withoutRequested]
    }
    return items
  })
  const [index, setIndex] = useState(0)
  const [topFlipped, setTopFlipped] = useState(settings.revealSolutionOnFlip)
  const [showGoalToast, setShowGoalToast] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const prevTodayCount = useRef(review.todayCount)
  // Only ever attached to the current top card - lets the icon-button row
  // trigger the same directional exit a drag would (see ProblemCard's
  // fling()), instead of the ghost defaulting to sliding right regardless
  // of which button was pressed.
  const topCardRef = useRef<ProblemCardHandle>(null)
  const [lastAction, setLastAction] = useState<LastAction | null>(null)
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
    setLastAction({ kind: 'review', id })
    setIndex((i) => i + 1)
  }

  const handleReviewedEasy = (id: string) => {
    topCardRef.current?.fling('left')
    review.markReviewedEasy(id)
    setLastAction({ kind: 'review', id })
    setIndex((i) => i + 1)
  }

  const handleRevisit = (id: string) => {
    // Also the target for swiping up - "review for later" is the same
    // outcome regardless of which direction triggered it.
    topCardRef.current?.fling('right')
    review.markRevisit(id)
    setLastAction({ kind: 'review', id })
    setIndex((i) => i + 1)
  }

  const handleExclude = (id: string) => {
    topCardRef.current?.fling('down')
    excluded.exclude(id)
    setLastAction({ kind: 'exclude', id })
    setIndex((i) => i + 1)
  }

  const handleUndo = () => {
    if (!lastAction) return
    if (lastAction.kind === 'exclude') {
      excluded.unexclude(lastAction.id)
    } else {
      review.undo()
    }
    setLastAction(null)
    setIndex((i) => Math.max(0, i - 1))
  }

  // Keyboard equivalents of the swipe/tap gestures - only meaningful for a
  // real flip card on top (not the empty state or an MCQ card, which has its
  // own answer-selection interaction instead of these actions). Undo stays
  // available regardless, same as its icon button does.
  const shortcutBindings: ShortcutBinding[] = []
  if (topId && topMode === 'card') {
    shortcutBindings.push(
      { def: SHORTCUTS.markReviewed, handler: () => handleReviewed(topId) },
      { def: SHORTCUTS.revisit, handler: () => handleRevisit(topId) },
      { def: SHORTCUTS.exclude, handler: () => handleExclude(topId) },
      { def: SHORTCUTS.flip, handler: () => topCardRef.current?.toggleFlip() },
      { def: SHORTCUTS.revealPrev, handler: () => topCardRef.current?.stepReveal('prev') },
      { def: SHORTCUTS.revealNext, handler: () => topCardRef.current?.stepReveal('next') },
      { def: SHORTCUTS.toggleNotes, handler: () => setNotesOpenFor(topId) },
    )
  }
  if (lastAction) {
    shortcutBindings.push({ def: SHORTCUTS.undo, handler: handleUndo })
  }
  useKeyboardShortcuts(shortcutBindings)

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
          <button
            type="button"
            className="icon-button icon-button-sm"
            aria-label="Find a problem"
            title="Find a problem"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={16} strokeWidth={2} aria-hidden="true" />
          </button>
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
                      canUndo={i === 0 ? lastAction !== null : false}
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
                    canUndo={i === 0 ? lastAction !== null : false}
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
            {!topFlipped && topMode !== 'mcq' && (
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
          </>
        )}
      </div>

      {notesOpenFor &&
        (() => {
          const noteProblem = PROBLEMS_BY_ID.get(notesOpenFor)
          if (!noteProblem) return null
          return (
            <NotesPanel
              problem={noteProblem}
              value={notes.getNote(notesOpenFor)}
              onChange={(text) => notes.setNote(notesOpenFor, text)}
              onClose={() => setNotesOpenFor(null)}
            />
          )
        })()}
    </div>
  )
}
