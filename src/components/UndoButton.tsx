import { Undo2 } from 'lucide-react'

interface UndoButtonProps {
  onUndo: () => void
  label?: string
}

// Shared by ProblemCard, PatternCard, and MCQCard - previously copy-pasted
// identically in all three. Safe to share unlike the cards themselves: this
// is a static leaf button with no drag/pan/touch gesture involvement, so it
// doesn't touch the gesture-critical code CLAUDE.md flags around
// ProblemCard (see its capture-phase note below, and the "Gesture & scroll
// constraints" section in CLAUDE.md for why the cards themselves stay
// separate components).
export function UndoButton({ onUndo, label = 'Undo last swipe' }: UndoButtonProps) {
  return (
    <button
      type="button"
      className="icon-button icon-button-sm card-top-actions-left"
      aria-label={label}
      title={label}
      onPointerDownCapture={(e) => e.stopPropagation()}
      onClickCapture={(e) => {
        // Capture-phase gotcha (see CLAUDE.md): a bubble-phase onClick would
        // never fire once this stops propagation, so the action has to run
        // right here.
        e.stopPropagation()
        onUndo()
      }}
    >
      <Undo2 size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}
