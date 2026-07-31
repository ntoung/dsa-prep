import type { RefObject } from 'react'
import { SHORTCUTS } from '../lib/keyboardShortcuts'
import { useKeyboardShortcuts, type ShortcutBinding } from './useKeyboardShortcuts'
import type { ProblemCardHandle } from '../components/ProblemCard'

interface UseSwipeShortcutsArgs {
  topId: string | undefined
  topMode: 'card' | 'mcq' | 'pattern' | undefined
  canUndo: boolean
  topCardRef: RefObject<ProblemCardHandle | null>
  onReviewed: (id: string) => void
  onRevisit: (id: string) => void
  onExclude: (id: string) => void
  onUndo: () => void
  onOpenNotes: (id: string) => void
}

// Keyboard equivalents of the Swipe tab's swipe/tap gestures on the top
// card - only meaningful for a real flip card on top (not the empty state
// or an MCQ card, which has its own answer-selection interaction instead of
// these actions). Undo stays available regardless, same as its icon button
// does. Deciding which shortcuts are currently live is SwipeReview's own
// policy, kept here rather than inline so its render body doesn't also have
// to compute it - the key-matching and listening itself stays in
// useKeyboardShortcuts.
export function useSwipeShortcuts({
  topId,
  topMode,
  canUndo,
  topCardRef,
  onReviewed,
  onRevisit,
  onExclude,
  onUndo,
  onOpenNotes,
}: UseSwipeShortcutsArgs): void {
  const bindings: ShortcutBinding[] = []
  if (topId && topMode === 'card') {
    bindings.push(
      { def: SHORTCUTS.markReviewed, handler: () => onReviewed(topId) },
      { def: SHORTCUTS.revisit, handler: () => onRevisit(topId) },
      { def: SHORTCUTS.exclude, handler: () => onExclude(topId) },
      { def: SHORTCUTS.flip, handler: () => topCardRef.current?.toggleFlip() },
      { def: SHORTCUTS.revealPrev, handler: () => topCardRef.current?.stepReveal('prev') },
      { def: SHORTCUTS.revealNext, handler: () => topCardRef.current?.stepReveal('next') },
      { def: SHORTCUTS.toggleNotes, handler: () => onOpenNotes(topId) },
    )
  }
  if (canUndo) {
    bindings.push({ def: SHORTCUTS.undo, handler: onUndo })
  }
  useKeyboardShortcuts(bindings)
}
