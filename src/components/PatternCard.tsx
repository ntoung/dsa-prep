import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { forwardRef, useImperativeHandle, useState } from 'react'
import type { Lesson } from '../data/lessons'
import { UndoButton } from './UndoButton'

const SWIPE_THRESHOLD = 100
const FLING_DISTANCE = 500
// Same rationale as ProblemCard's FLING_START_OFFSET: gives a button-driven
// dismissal a starting position past dead-center so the exit reads as a
// continuation of motion rather than a teleport.
const FLING_START_OFFSET = 150
const SPRING_BACK = { type: 'spring', stiffness: 300, damping: 30 } as const

export interface PatternCardHandle {
  fling: (direction: 'left' | 'right') => void
}

interface PatternCardProps {
  lesson: Lesson
  isTop: boolean
  stackDepth: number
  onDismiss: () => void
  onRevisit: () => void
  canUndo?: boolean
  onUndo?: () => void
}

// An educational interstitial sprinkled into the Swipe deck (see
// PATTERN_INTERVAL in SwipeReview.tsx) - reuses the same 18 Recognize/
// Template/Tips lessons Learn already owns rather than authoring new
// content. Unlike ProblemCard, there's nothing to grade here: dismissing
// never touches Leitner state or the daily goal, matching Learn's read-only
// posture. Only a horizontal swipe/drag axis exists (no flip, no up/down
// exclude), so - unlike ProblemCard - plain native vertical scroll is safe
// to leave in place for long lesson text; see .pattern-card-surface's
// touch-action in App.css.
export const PatternCard = forwardRef<PatternCardHandle, PatternCardProps>(function PatternCard(
  { lesson, isTop, stackDepth, onDismiss, onRevisit, canUndo, onUndo },
  ref,
) {
  const x = useMotionValue(0)
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null)

  useImperativeHandle(ref, () => ({
    fling: (direction) => {
      setExitDirection(direction)
      x.set(direction === 'left' ? -FLING_START_OFFSET : FLING_START_OFFSET)
    },
  }))

  const rotate = useTransform(x, [-240, 240], [-18, 18])
  // Same wording/color as ProblemCard's stamps - swiping a pattern card
  // mirrors the same two gestures, just without anything to grade underneath.
  const reviewedStampOpacity = useTransform(x, [-260, -140, -30], [1, 1, 0])
  const revisitStampOpacity = useTransform(x, [30, 140], [0, 1])

  const handleDragEnd = (_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) => {
    if (!isTop) return
    if (info.offset.x <= -SWIPE_THRESHOLD) {
      setExitDirection('left')
      onDismiss()
    } else if (info.offset.x >= SWIPE_THRESHOLD) {
      setExitDirection('right')
      onRevisit()
    } else {
      animate(x, 0, SPRING_BACK)
    }
  }

  const undoButton = isTop && canUndo && <UndoButton onUndo={() => onUndo?.()} />

  return (
    <motion.div
      className="problem-card"
      style={{ zIndex: 100 - stackDepth }}
      initial={{ scale: 1 - stackDepth * 0.04, y: stackDepth * 12, opacity: stackDepth > 2 ? 0 : 1 }}
      animate={{ scale: 1 - stackDepth * 0.04, y: stackDepth * 12, opacity: stackDepth > 2 ? 0 : 1 }}
      transition={SPRING_BACK}
    >
      <motion.div
        className="problem-card-surface pattern-card-surface"
        drag={isTop ? 'x' : false}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x, rotate }}
        exit={{
          x: exitDirection === 'left' ? -FLING_DISTANCE : exitDirection === 'right' ? FLING_DISTANCE : 0,
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
            <motion.div className="card-stamp card-stamp-revisit" style={{ opacity: revisitStampOpacity }}>
              REVISIT
            </motion.div>
          </>
        )}
        {undoButton}
        <div className="pattern-card-content">
          <span className="mcq-kind-tag">Pattern</span>
          <h2 className="card-title">{lesson.category}</h2>
          <div className="detail-block">
            <h3>Recognize</h3>
            <p>{lesson.recognize}</p>
          </div>
          <div className="detail-block">
            <h3>Template</h3>
            <p>{lesson.template}</p>
          </div>
          <div className="detail-block">
            <h3>Tips</h3>
            <p>{lesson.tips}</p>
          </div>
          <p className="card-flip-hint">Swipe left when it's familiar, right to see it again soon</p>
        </div>
      </motion.div>
    </motion.div>
  )
})
