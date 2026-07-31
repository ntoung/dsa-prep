// Single source of truth for every keyboard shortcut's key binding and its
// display copy - components wire the handler, but the id/key/label/
// description live here once so the help overlay (which just renders
// ALL_SHORTCUTS) can never drift out of sync with what's actually bound.
export interface ShortcutDef {
  id: string
  key: string
  label: string
  description: string
}

export const SHORTCUTS = {
  help: { id: 'help', key: '?', label: '?', description: 'Show this shortcut list' },
  undo: { id: 'undo', key: 'ArrowLeft', label: '←', description: 'Undo last swipe' },
  exclude: { id: 'exclude', key: 'ArrowDown', label: '↓', description: 'Exclude from review rotation' },
  revisit: { id: 'revisit', key: 'ArrowUp', label: '↑', description: 'Revisit later' },
  markReviewed: { id: 'markReviewed', key: 'ArrowRight', label: '→', description: 'Mark reviewed' },
  flip: { id: 'flip', key: 'f', label: 'F', description: 'Flip card' },
  revealPrev: { id: 'revealPrev', key: 'j', label: 'J', description: 'Previous reveal step' },
  revealNext: { id: 'revealNext', key: 'k', label: 'K', description: 'Next reveal step' },
  toggleNotes: { id: 'toggleNotes', key: 'n', label: 'N', description: 'Add or edit note' },
  openGlobalNote: { id: 'openGlobalNote', key: 'g', label: 'G', description: 'Open notepad' },
}

export const ALL_SHORTCUTS: ShortcutDef[] = Object.values(SHORTCUTS)

export function matchesShortcutEvent(event: KeyboardEvent, def: ShortcutDef): boolean {
  return event.key.toLowerCase() === def.key.toLowerCase()
}
