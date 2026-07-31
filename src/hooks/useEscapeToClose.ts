import { useEffect, useRef } from 'react'

// A single shared stack + one shared listener (not one per call site) so
// stacked overlays - e.g. the notes panel opened from within a Learn topic,
// itself opened from within a Learn problem - each close one layer at a
// time on Escape, instead of every open overlay's own listener reacting to
// the same keypress at once.
const closeStack: (() => void)[] = []
let listenerInstalled = false

function ensureListener() {
  if (listenerInstalled) return
  listenerInstalled = true
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    const topmost = closeStack[closeStack.length - 1]
    if (!topmost) return
    event.preventDefault()
    topmost()
  })
}

// Makes Escape close whatever this is called with, but only the
// most-recently-opened thing still on the stack - lets an overlay's own
// onClose (the same one its X button already uses) double as its Escape
// handler with no extra per-component wiring. Unlike useKeyboardShortcuts,
// this deliberately ignores focus (Escape should close a dialog even while
// typing inside it, matching how Escape behaves everywhere else).
export function useEscapeToClose(onClose: () => void, enabled = true): void {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!enabled) return
    ensureListener()
    const close = () => onCloseRef.current()
    closeStack.push(close)
    return () => {
      const index = closeStack.indexOf(close)
      if (index !== -1) closeStack.splice(index, 1)
    }
  }, [enabled])
}
