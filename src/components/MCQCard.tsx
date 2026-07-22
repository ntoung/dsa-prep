import { motion } from 'framer-motion'
import { useState } from 'react'
import { Check, Undo2, X } from 'lucide-react'
import type { Problem } from '../types'
import { buildMcqQuestion } from '../lib/mcqGenerator'

const FEEDBACK_DURATION_MS = 900

interface MCQCardProps {
  problem: Problem
  isTop: boolean
  stackDepth: number
  onCorrect: () => void
  onIncorrect: () => void
  canUndo?: boolean
  onUndo?: () => void
}

export function MCQCard({ problem, isTop, stackDepth, onCorrect, onIncorrect, canUndo, onUndo }: MCQCardProps) {
  // Built once per card instance (remounts per-id via key={id} in
  // SwipeReview, same as ProblemCard's flip state), not on every render.
  const [question] = useState(() => buildMcqQuestion(problem))
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const handleSelect = (index: number) => {
    if (!isTop || selectedIndex !== null || !question) return
    setSelectedIndex(index)
    const isCorrect = index === question.correctIndex
    setTimeout(() => (isCorrect ? onCorrect() : onIncorrect()), FEEDBACK_DURATION_MS)
  }

  const undoButton = isTop && canUndo && (
    <button
      type="button"
      className="icon-button icon-button-sm card-top-actions-left"
      aria-label="Undo last answer"
      title="Undo last answer"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => {
        e.stopPropagation()
        onUndo?.()
      }}
    >
      <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  )

  // Practically unreachable - pattern-recognition always has 17 other
  // patterns to draw distractors from - but keeps this a safe no-op rather
  // than crashing if a future content change ever shrinks the pattern pool.
  if (!question) return null

  return (
    <motion.div
      className="problem-card mcq-card"
      style={{ zIndex: 100 - stackDepth }}
      initial={{ scale: 1 - stackDepth * 0.04, y: stackDepth * 12, opacity: stackDepth > 2 ? 0 : 1 }}
      animate={{ scale: 1 - stackDepth * 0.04, y: stackDepth * 12, opacity: stackDepth > 2 ? 0 : 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {undoButton}
      <span className="mcq-kind-tag">{question.kind === 'pattern' ? 'Pattern check' : 'Complexity check'}</span>
      <h2 className="card-title">{problem.title}</h2>
      <p className="mcq-prompt">{question.prompt}</p>
      <div className="mcq-options">
        {question.options.map((option, index) => {
          const showFeedback = selectedIndex !== null
          const isCorrectOption = index === question.correctIndex
          const isSelected = selectedIndex === index
          const stateClass = !showFeedback
            ? ''
            : isCorrectOption
              ? 'mcq-option-correct'
              : isSelected
                ? 'mcq-option-incorrect'
                : ''
          return (
            <button
              key={option}
              type="button"
              className={`mcq-option${stateClass ? ` ${stateClass}` : ''}`}
              disabled={showFeedback}
              onClick={() => handleSelect(index)}
            >
              <span>{option}</span>
              {showFeedback && isCorrectOption && <Check size={18} strokeWidth={2.5} aria-hidden="true" />}
              {showFeedback && isSelected && !isCorrectOption && <X size={18} strokeWidth={2.5} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}
