import { animate, motion, useTransform, useMotionValue, type PanInfo } from 'framer-motion'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Copy, ExternalLink, History, NotebookPen, Undo2 } from 'lucide-react'
import type { Language, Problem, RevealStage } from '../types'
import { getSolution } from '../lib/getSolution'

// Compact enough to sit inside the review-count badge alongside the count -
// an absolute date (not relative/"2d ago") since that needs no recomputation
// on every render as time passes.
function formatLastReviewed(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface ProblemCardProps {
  problem: Problem
  onReviewed: () => void
  onReviewedEasy: () => void
  onRevisit: () => void
  onExclude: () => void
  isTop: boolean
  stackDepth: number
  onFlipChange?: (flipped: boolean) => void
  canUndo?: boolean
  onUndo?: () => void
  // When true, the card starts on the explanation face instead of the
  // solution face, so the solution isn't the first thing you see.
  startFlipped?: boolean
  // When false, skip the skeleton-to-solution stage stepping and show the
  // full solution immediately, even if the problem has revealStages authored.
  progressiveReveal?: boolean
  onOpenNotes?: () => void
  hasNote?: boolean
  reviewCount: number
  lastReviewedAt: string | null
  language: Language
}

const SWIPE_THRESHOLD = 100
// A swipe past this point grades the card "easy" (promote 2 Leitner stages
// instead of 1) rather than a plain pass - a further, more deliberate throw
// for a confident recall. See the MASTERED stamp below for the visual cue
// that teaches this tier during the drag itself.
const SWIPE_THRESHOLD_EASY = 220
// Off-screen target for a fling in any direction - matches the distance the
// exit transition already animates to.
const FLING_DISTANCE = 500
// Button clicks don't have a real drag position to continue from, so fling
// nudges the card out to roughly "just past the threshold" first - enough
// for the exit transition to read as a continuation of that motion rather
// than a teleport, matching how a real swipe hands off into its exit.
const FLING_START_OFFSET = 150
// Below this many pixels of total movement, a gesture hasn't committed to
// an axis yet - keeps a tap-to-flip clean and avoids jittery axis flips on
// the first couple pixels of a real drag.
const AXIS_LOCK_SLOP = 6
const SPRING_BACK = { type: 'spring', stiffness: 300, damping: 30 } as const

// Lets a parent (the icon-button row in SwipeReview, which acts on whichever
// card is currently on top) trigger the same exit motion a drag would, or
// flip the card the same way tapping it does (used by the "flip" keyboard
// shortcut, which has no drag position to act on).
export interface ProblemCardHandle {
  fling: (direction: 'left' | 'right' | 'up' | 'down') => void
  toggleFlip: () => void
  // 'next' no-ops (rather than falling through to flipping the card, like
  // the chevron button does) when this card has no reveal stages - safe to
  // call unconditionally from a keyboard shortcut that doesn't know whether
  // the top card has stages.
  stepReveal: (direction: 'prev' | 'next') => void
}

type Axis = 'none' | 'horizontal' | 'vertical'

export const ProblemCard = forwardRef<ProblemCardHandle, ProblemCardProps>(function ProblemCard(
  {
    problem,
    onReviewed,
    onReviewedEasy,
    onRevisit,
    onExclude,
    isTop,
    stackDepth,
    onFlipChange,
    canUndo,
    onUndo,
    startFlipped = false,
    progressiveReveal = true,
    onOpenNotes,
    hasNote = false,
    reviewCount,
    lastReviewedAt,
    language,
  },
  ref,
) {
  const [flipped, setFlipped] = useState(startFlipped)
  const [stageIndex, setStageIndex] = useState(0)
  const [copied, setCopied] = useState(false)

  // Falls back to Python (see getSolution) if this problem doesn't have a
  // translation for the selected language yet.
  const solution = getSolution(problem, language)

  // startFlipped is exactly settings.revealSolutionOnFlip (recall mode) -
  // progressive reveal only makes sense there, since the other mode shows
  // the solution immediately by design. progressiveReveal is the Settings
  // toggle for the stage stepping itself - off shows the full solution
  // upfront instead. Falls back to a single reveal when no stages are
  // authored for this problem/language yet.
  const stages: RevealStage[] | null =
    startFlipped && progressiveReveal && solution.revealStages && solution.revealStages.length > 0
      ? [...solution.revealStages, { label: 'Solution', code: solution.code }]
      : null
  // Whatever's actually on screen right now - mid-reveal, that's the current
  // stage's (possibly partial) code, not necessarily the full solution.
  const currentCode = stages ? stages[stageIndex].code : solution.code

  // Reset the "copied" checkmark if the card is put away and a new one shown
  // in its place (key changes on remount) - not strictly required since a
  // fresh mount already starts at false, but guards against a stale timer
  // from a previous copy firing setCopied after this instance unmounts.
  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  const copySolution = () => {
    navigator.clipboard.writeText(currentCode).then(() => setCopied(true))
  }

  const toggleFlipped = () => {
    if (!isTop) return
    const next = !flipped
    setFlipped(next)
    onFlipChange?.(next)
  }

  // Stage stepping lives only on the chevron buttons - tapping the card body
  // always flips (see toggleFlipped above), so these are the sole way to
  // move through the skeleton-to-solution reveal.
  const goToPrevStage = () => {
    setStageIndex((i) => Math.max(0, i - 1))
  }
  const goToNextStage = () => {
    if (stages && stageIndex < stages.length - 1) {
      setStageIndex((i) => i + 1)
    } else {
      setFlipped(true)
      onFlipChange?.(true)
    }
  }

  // Card position (drives the swipe/exit animation), on the "surface"
  // element - kept separate from the outer element's stackDepth-driven `y`
  // (in initial/animate below), since a MotionValue bound via style takes
  // over that transform key entirely and the two would otherwise fight over
  // plain `y` on the same element.
  const x = useMotionValue(0)
  const cardY = useMotionValue(0)
  // Content position, one per face so each face remembers its own scroll
  // spot independently. Driven manually here instead of native
  // `overflow-y: auto` scroll - see the block comment above handlePan for
  // why native scroll and this card's gestures can't coexist otherwise.
  const frontContentY = useMotionValue(0)
  const backContentY = useMotionValue(0)

  const frontFaceRef = useRef<HTMLDivElement>(null)
  const frontContentRef = useRef<HTMLDivElement>(null)
  const backFaceRef = useRef<HTMLDivElement>(null)
  const backContentRef = useRef<HTMLDivElement>(null)

  // Not React state - read/written only inside the pan handlers below, so
  // changing it should never trigger a re-render.
  const axisLockRef = useRef<Axis>('none')

  // Which way this card is leaving, used by `exit` below. This has to be
  // React state, not just read off x/cardY at exit time: `exit` is a plain
  // object evaluated during this component's last ordinary render, and
  // MotionValue.set() (what fling() and the pan handlers use) does *not*
  // trigger a re-render - so reading x.get()/cardY.get() inside exit
  // silently sees whatever they were at that last render, not a value a
  // just-fired fling() set a moment earlier. Routing the direction through
  // setState instead forces the fresh re-render `exit` needs to pick it up.
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | 'up' | 'down' | null>(null)

  useImperativeHandle(ref, () => ({
    fling: (direction) => {
      setExitDirection(direction)
      if (direction === 'left') {
        x.set(-FLING_START_OFFSET)
        cardY.set(0)
      } else if (direction === 'right') {
        x.set(FLING_START_OFFSET)
        cardY.set(0)
      } else if (direction === 'up') {
        cardY.set(-FLING_START_OFFSET)
        x.set(0)
      } else {
        cardY.set(FLING_START_OFFSET)
        x.set(0)
      }
    },
    toggleFlip: toggleFlipped,
    stepReveal: (direction) => {
      if (direction === 'prev') {
        goToPrevStage()
      } else if (stages) {
        // Only step forward through stages here - unlike the chevron
        // button, this shortcut shouldn't fall through to flipping the
        // card open once a card with no stages is on top.
        goToNextStage()
      }
    },
  }))

  const rotate = useTransform(x, [-240, 240], [-18, 18])
  // REVIEWED fades in over the normal swipe range and back out past the easy
  // threshold, handing off to MASTERED - a crossfade that teaches the second
  // tier exists without needing any copy to explain it.
  const reviewedStampOpacity = useTransform(x, [-260, -200, -140, -30], [0, 1, 1, 0])
  const masteredStampOpacity = useTransform(x, [-260, -200], [1, 0])
  const revisitStampOpacity = useTransform(x, [30, 140], [0, 1])
  // Same REVISIT wording as the horizontal gesture - swiping up is an
  // alternate route to the identical action, not a different outcome.
  const revisitUpStampOpacity = useTransform(cardY, [-140, -30], [1, 0])
  const excludeStampOpacity = useTransform(cardY, [30, 140], [0, 1])

  // How much further the currently-visible face's content can still scroll
  // in each direction, in pixels. Read fresh on every pan tick rather than
  // cached in state - these are plain reads (scrollHeight/clientHeight) and
  // the gesture only ever writes `transform` elsewhere, which doesn't
  // invalidate layout, so this doesn't cause forced-reflow thrashing.
  const getMaxScroll = () => {
    const faceEl = flipped ? backFaceRef.current : frontFaceRef.current
    const contentEl = flipped ? backContentRef.current : frontContentRef.current
    if (!faceEl || !contentEl) return 0
    return Math.max(0, contentEl.scrollHeight - faceEl.clientHeight)
  }
  const activeContentY = flipped ? backContentY : frontContentY

  const handlePanStart = () => {
    axisLockRef.current = 'none'
  }

  // Custom pan handling replaces Framer's `drag` prop for both axes,
  // because this card mixes a swipeable card with scrollable content: the
  // vertical axis alone has to arbitrate between "scroll the explanation/
  // code" and "swipe the card up or down." Native `overflow-y: auto` +
  // `touch-action` can't express "let scroll happen, then hand off to swipe
  // once the content hits its edge" - touch-action is a static,
  // direction-agnostic on/off per axis decided once at gesture start, so
  // there's no reliable way to let the browser own scrolling and have JS
  // take over mid-gesture once a boundary is hit (this is the same category
  // of conflict noted in the gesture doc in CLAUDE.md, just on a new axis).
  // Driving both card position and content scroll ourselves sidesteps the
  // ambiguity entirely: there's no native scroll on this surface to fight,
  // so touch-action can just be `none` unconditionally.
  const handlePan = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (!isTop) return
    if (axisLockRef.current === 'none') {
      if (Math.abs(info.offset.x) < AXIS_LOCK_SLOP && Math.abs(info.offset.y) < AXIS_LOCK_SLOP) return
      axisLockRef.current = Math.abs(info.offset.x) > Math.abs(info.offset.y) ? 'horizontal' : 'vertical'
    }

    if (axisLockRef.current === 'horizontal') {
      x.set(x.get() + info.delta.x)
      return
    }

    // Vertical: content scroll absorbs movement first - only once the
    // content is already at the relevant edge does further movement spill
    // over into moving the card itself, so scrolling and swiping chain
    // together within one continuous gesture.
    const dy = info.delta.y
    const maxScroll = getMaxScroll()
    const currentContentY = activeContentY.get()
    if (dy < 0) {
      // Finger moving up: reveal more content below while there's room;
      // once maxed out, the remainder swipes the card up (-> revisit).
      const room = -maxScroll - currentContentY
      const toContent = Math.max(dy, room)
      activeContentY.set(currentContentY + toContent)
      cardY.set(cardY.get() + (dy - toContent))
    } else if (dy > 0) {
      // Finger moving down: reveal more content above while there's room;
      // once back at the top, the remainder swipes the card down (-> exclude).
      const room = -currentContentY
      const toContent = Math.min(dy, room)
      activeContentY.set(currentContentY + toContent)
      cardY.set(cardY.get() + (dy - toContent))
    }
  }

  const handlePanEnd = () => {
    if (!isTop) return
    const axis = axisLockRef.current
    axisLockRef.current = 'none'

    if (axis === 'horizontal') {
      const dx = x.get()
      if (dx <= -SWIPE_THRESHOLD_EASY) {
        setExitDirection('left')
        onReviewedEasy()
      } else if (dx <= -SWIPE_THRESHOLD) {
        setExitDirection('left')
        onReviewed()
      } else if (dx >= SWIPE_THRESHOLD) {
        setExitDirection('right')
        onRevisit()
      } else {
        animate(x, 0, SPRING_BACK)
      }
      return
    }

    if (axis === 'vertical') {
      const dy = cardY.get()
      if (dy <= -SWIPE_THRESHOLD) {
        setExitDirection('up')
        onRevisit()
      } else if (dy >= SWIPE_THRESHOLD) {
        setExitDirection('down')
        onExclude()
      } else {
        animate(cardY, 0, SPRING_BACK)
      }
    }
  }

  // Content can change height (a longer stage's code, a flip to the other
  // face) without a resize ever firing - reclamp so a face that just became
  // shorter than its current scroll offset doesn't leave content stranded
  // off-screen with no way to scroll back.
  useLayoutEffect(() => {
    const maxScroll = getMaxScroll()
    const clamped = Math.max(-maxScroll, Math.min(0, activeContentY.get()))
    if (clamped !== activeContentY.get()) activeContentY.set(clamped)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, stageIndex])

  const undoButton = isTop && canUndo && (
    <button
      type="button"
      className="icon-button icon-button-sm card-top-actions-left"
      aria-label="Undo last swipe"
      title="Undo last swipe"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => {
        // stopPropagation() here prevents this click from ever reaching a
        // separate bubble-phase onClick (React never dispatches it once
        // propagation is stopped during capture) - so the action has to run
        // right here instead of in a plain onClick handler.
        e.stopPropagation()
        onUndo?.()
      }}
    >
      <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  )

  const notesButton = isTop && onOpenNotes && (
    <button
      type="button"
      className={`icon-button icon-button-sm card-top-actions-right-2${hasNote ? ' icon-button-active' : ''}`}
      aria-label={hasNote ? 'Edit note' : 'Add note'}
      title={hasNote ? 'Edit note' : 'Add note'}
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => {
        // Same capture-phase gotcha as undoButton above: the action has to
        // run right here, not in a separate bubble-phase onClick.
        e.stopPropagation()
        onOpenNotes()
      }}
    >
      <NotebookPen size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  )

  const copyButton = isTop && (
    <button
      type="button"
      className="icon-button icon-button-sm card-top-actions-right-3"
      aria-label={copied ? 'Solution copied' : 'Copy solution to clipboard'}
      title={copied ? 'Copied!' : 'Copy solution'}
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => {
        // Same capture-phase gotcha as undoButton above: the action has to
        // run right here, not in a separate bubble-phase onClick.
        e.stopPropagation()
        copySolution()
      }}
    >
      {copied ? (
        <Check size={16} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Copy size={16} strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  )

  const linkButton = (
    <a
      className="icon-button icon-button-sm card-top-actions-right"
      href={problem.url}
      target="_blank"
      rel="noreferrer"
      aria-label="View original problem on LeetCode"
      title="View original problem on LeetCode"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => e.stopPropagation()}
    >
      <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
    </a>
  )

  return (
    <motion.div
      className="problem-card"
      style={{ zIndex: 100 - stackDepth }}
      initial={{ scale: 1 - stackDepth * 0.04, y: stackDepth * 12, opacity: stackDepth > 2 ? 0 : 1 }}
      animate={{ scale: 1 - stackDepth * 0.04, y: stackDepth * 12, opacity: stackDepth > 2 ? 0 : 1 }}
      transition={SPRING_BACK}
    >
      <motion.div
        className="problem-card-surface"
        style={{ x, y: cardY, rotate }}
        onPanStart={isTop ? handlePanStart : undefined}
        onPan={isTop ? handlePan : undefined}
        onPanEnd={isTop ? handlePanEnd : undefined}
        onTap={toggleFlipped}
        exit={{
          x: exitDirection === 'left' ? -FLING_DISTANCE : exitDirection === 'right' ? FLING_DISTANCE : 0,
          y: exitDirection === 'up' ? -FLING_DISTANCE : exitDirection === 'down' ? FLING_DISTANCE : 0,
          opacity: 0,
          transition: { duration: 0.25 },
        }}
        transition={SPRING_BACK}
      >
        {isTop && (
          <>
            <motion.div className="card-stamp card-stamp-reviewed" style={{ opacity: reviewedStampOpacity }}>
              REVIEWED
            </motion.div>
            <motion.div className="card-stamp card-stamp-mastered" style={{ opacity: masteredStampOpacity }}>
              MASTERED
            </motion.div>
            <motion.div className="card-stamp card-stamp-revisit" style={{ opacity: revisitStampOpacity }}>
              REVISIT
            </motion.div>
            <motion.div className="card-stamp card-stamp-revisit-up" style={{ opacity: revisitUpStampOpacity }}>
              REVISIT
            </motion.div>
            <motion.div className="card-stamp card-stamp-exclude" style={{ opacity: excludeStampOpacity }}>
              EXCLUDE
            </motion.div>
          </>
        )}
        <div className={`card-inner${flipped ? ' flipped' : ''}`}>
          <div className="card-face card-front" ref={frontFaceRef}>
            {undoButton}
            {copyButton}
            {notesButton}
            {linkButton}
            <motion.div className="card-face-content" ref={frontContentRef} style={{ y: frontContentY }}>
              <div className="card-front-header">
                {reviewCount > 0 && (
                  <span
                    className="review-count-badge"
                    title={`Reviewed ${reviewCount} time${reviewCount === 1 ? '' : 's'}${
                      lastReviewedAt ? `, last on ${new Date(lastReviewedAt).toLocaleDateString()}` : ''
                    }`}
                  >
                    <History size={12} strokeWidth={2} aria-hidden="true" />
                    {reviewCount}
                    {lastReviewedAt && <span className="review-count-badge-date">· {formatLastReviewed(lastReviewedAt)}</span>}
                  </span>
                )}
                {problem.patterns.map((pattern) => (
                  <span key={pattern} className="pattern-tag">
                    {pattern}
                  </span>
                ))}
              </div>
              <div className="card-title-row">
                <span
                  className={`difficulty-dot difficulty-dot-${problem.difficulty.toLowerCase()}`}
                  aria-hidden="true"
                />
                <h2 className="card-title">{problem.title}</h2>
              </div>
              <pre className="solution-code card-solution">
                <code>{currentCode}</code>
              </pre>
              {stages ? (
                <div className="card-stage-nav">
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    aria-label="Previous step"
                    title="Previous step"
                    disabled={stageIndex === 0}
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onClickCapture={(e) => {
                      e.stopPropagation()
                      goToPrevStage()
                    }}
                  >
                    <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <p className="card-stage-hint">
                    {stages[stageIndex].label} ({stageIndex + 1}/{stages.length})
                  </p>
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    aria-label="Next step"
                    title="Next step"
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onClickCapture={(e) => {
                      e.stopPropagation()
                      goToNextStage()
                    }}
                  >
                    <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <p className="card-flip-hint">Tap card for explanation</p>
              )}
            </motion.div>
          </div>
          <div className="card-face card-back" ref={backFaceRef}>
            {undoButton}
            {linkButton}
            <motion.div className="card-face-content" ref={backContentRef} style={{ y: backContentY }}>
              <h2 className="card-title">{problem.title}</h2>
              <div className="detail-block">
                <h3>Summary</h3>
                <p>{problem.summary}</p>
              </div>
              <div className="detail-block">
                <h3>Approach</h3>
                <p>{problem.approachSummary}</p>
              </div>
              <div className="detail-block">
                <h3>Walkthrough</h3>
                <p>{problem.walkthrough}</p>
              </div>
              <div className="detail-block detail-complexity">
                <h3>Complexity</h3>
                <p>Time: {problem.complexity.time}</p>
                <p>Space: {problem.complexity.space}</p>
              </div>
              {problem.pitfalls.length > 0 && (
                <div className="detail-block">
                  <h3>Pitfalls</h3>
                  <ul>
                    {problem.pitfalls.map((pitfall) => (
                      <li key={pitfall}>{pitfall}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="card-flip-hint">Tap card for solution</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
})
