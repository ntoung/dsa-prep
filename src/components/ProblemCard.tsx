import { motion, useTransform, useMotionValue, type PanInfo } from 'framer-motion'
import { useState } from 'react'
import { ExternalLink, Undo2 } from 'lucide-react'
import type { Problem } from '../types'

interface ProblemCardProps {
  problem: Problem
  onReviewed: () => void
  onRevisit: () => void
  isTop: boolean
  stackDepth: number
  onFlipChange?: (flipped: boolean) => void
  canUndo?: boolean
  onUndo?: () => void
}

const SWIPE_THRESHOLD = 100

export function ProblemCard({
  problem,
  onReviewed,
  onRevisit,
  isTop,
  stackDepth,
  onFlipChange,
  canUndo,
  onUndo,
}: ProblemCardProps) {
  const [flipped, setFlipped] = useState(false)

  const toggleFlipped = () => {
    if (!isTop) return
    const next = !flipped
    setFlipped(next)
    onFlipChange?.(next)
  }
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-18, 18])
  const reviewedStampOpacity = useTransform(x, [-140, -30], [1, 0])
  const revisitStampOpacity = useTransform(x, [30, 140], [0, 1])

  const handleDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (info.offset.x <= -SWIPE_THRESHOLD) {
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
          <pre
            className="solution-code card-solution"
            onPointerDownCapture={(e) => e.stopPropagation()}
          >
            <code>{problem.solutionCode}</code>
          </pre>
          <p className="card-flip-hint">Tap card for explanation</p>
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
        </div>
      </div>
    </motion.div>
  )
}
