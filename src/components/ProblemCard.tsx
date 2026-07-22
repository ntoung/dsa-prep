import { motion, useTransform, useMotionValue, type PanInfo } from 'framer-motion'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Undo2 } from 'lucide-react'
import type { Problem, RevealStage } from '../types'

interface ProblemCardProps {
  problem: Problem
  onReviewed: () => void
  onReviewedEasy: () => void
  onRevisit: () => void
  isTop: boolean
  stackDepth: number
  onFlipChange?: (flipped: boolean) => void
  canUndo?: boolean
  onUndo?: () => void
  // When true, the card starts on the explanation face instead of the
  // solution face, so the solution isn't the first thing you see.
  startFlipped?: boolean
}

const SWIPE_THRESHOLD = 100
// A swipe past this point grades the card "easy" (promote 2 Leitner stages
// instead of 1) rather than a plain pass - a further, more deliberate throw
// for a confident recall. See the MASTERED stamp below for the visual cue
// that teaches this tier during the drag itself.
const SWIPE_THRESHOLD_EASY = 220

export function ProblemCard({
  problem,
  onReviewed,
  onReviewedEasy,
  onRevisit,
  isTop,
  stackDepth,
  onFlipChange,
  canUndo,
  onUndo,
  startFlipped = false,
}: ProblemCardProps) {
  const [flipped, setFlipped] = useState(startFlipped)
  const [stageIndex, setStageIndex] = useState(0)

  // startFlipped is exactly settings.revealSolutionOnFlip (recall mode) -
  // progressive reveal only makes sense there, since the other mode shows
  // the solution immediately by design. Falls back to a single reveal when
  // no stages are authored for this problem yet.
  const stages: RevealStage[] | null =
    startFlipped && problem.revealStages && problem.revealStages.length > 0
      ? [...problem.revealStages, { label: 'Solution', code: problem.solutionCode }]
      : null

  const toggleFlipped = () => {
    if (!isTop) return
    if (!flipped && stages && stageIndex < stages.length - 1) {
      setStageIndex((i) => i + 1)
      return
    }
    const next = !flipped
    setFlipped(next)
    onFlipChange?.(next)
  }

  // Explicit step controls alongside the tap-to-advance gesture above - same
  // transitions, just addressable without having to tap the card itself.
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
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-18, 18])
  // REVIEWED fades in over the normal swipe range and back out past the easy
  // threshold, handing off to MASTERED - a crossfade that teaches the second
  // tier exists without needing any copy to explain it.
  const reviewedStampOpacity = useTransform(x, [-260, -200, -140, -30], [0, 1, 1, 0])
  const masteredStampOpacity = useTransform(x, [-260, -200], [1, 0])
  const revisitStampOpacity = useTransform(x, [30, 140], [0, 1])

  const handleDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_THRESHOLD_EASY) {
      onReviewedEasy()
    } else if (info.offset.x <= -SWIPE_THRESHOLD) {
      onReviewed()
    } else if (info.offset.x >= SWIPE_THRESHOLD) {
      onRevisit()
    }
  }

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
      style={{ x, rotate, zIndex: 100 - stackDepth }}
      drag={isTop ? 'x' : false}
      dragElastic={0.6}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      onTap={toggleFlipped}
      initial={{ scale: 1 - stackDepth * 0.04, y: stackDepth * 12, opacity: stackDepth > 2 ? 0 : 1 }}
      animate={{ scale: 1 - stackDepth * 0.04, y: stackDepth * 12, opacity: stackDepth > 2 ? 0 : 1 }}
      exit={{ x: x.get() < 0 ? -500 : 500, opacity: 0, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
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
        </>
      )}
      <div className={`card-inner${flipped ? ' flipped' : ''}`}>
        <div className="card-face card-front">
          {undoButton}
          {linkButton}
          <div className="card-front-header">
            <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>
              {problem.difficulty}
            </span>
            <span className="pattern-tag">{problem.pattern}</span>
          </div>
          <h2 className="card-title">{problem.title}</h2>
          <p className="card-category">{problem.category}</p>
          <pre className="solution-code card-solution">
            <code>{stages ? stages[stageIndex].code : problem.solutionCode}</code>
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
        </div>
        <div className="card-face card-back">
          {undoButton}
          {linkButton}
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
        </div>
      </div>
    </motion.div>
  )
}
