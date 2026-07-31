import { useEffect, useRef } from 'react'

// Same shared-stack shape as useEscapeToClose, but for the browser/hardware
// back button instead of the Escape key: each open overlay pushes one
// history entry, and a single shared popstate listener closes only the
// most-recently-opened one still on the stack - so a topic opened, then a
// problem opened within it, closes the problem first on back, matching
// Escape's one-layer-at-a-time behavior.
const popStack: (() => void)[] = []
let isProgrammaticPop = false
let listenerInstalled = false

function ensureListener() {
  if (listenerInstalled) return
  listenerInstalled = true
  window.addEventListener('popstate', () => {
    if (isProgrammaticPop) {
      isProgrammaticPop = false
      return
    }
    const topmost = popStack.pop()
    topmost?.()
  })
}

// Pushes one history entry for as long as `value` is non-null, and calls
// onClose when the back button pops it. If the overlay closes some other
// way instead (e.g. its own X button), the pushed entry is popped
// programmatically on cleanup rather than left dangling in history -
// isProgrammaticPop is what stops that self-triggered pop from also being
// treated as a real back-button press and double-closing the next overlay
// down. consumedRef is the mirror image: it stops a real back-button close
// from running the cleanup's history.back() a second time for the entry the
// browser already navigated past.
export function useOverlayHistory<T>(value: T | null, onClose: () => void): void {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const consumedRef = useRef(false)

  useEffect(() => {
    if (value === null) return
    ensureListener()
    consumedRef.current = false
    const close = () => {
      consumedRef.current = true
      onCloseRef.current()
    }
    popStack.push(close)
    history.pushState({}, '')
    return () => {
      if (consumedRef.current) return
      const index = popStack.indexOf(close)
      if (index !== -1) popStack.splice(index, 1)
      isProgrammaticPop = true
      history.back()
    }
  }, [value])
}
