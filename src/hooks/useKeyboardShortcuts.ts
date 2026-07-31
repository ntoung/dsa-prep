import { useEffect, useRef } from 'react'
import { matchesShortcutEvent, type ShortcutDef } from './lib/keyboardShortcuts'

export interface ShortcutBinding {
  def: ShortcutDef
  handler: () => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

// Bindings are read from a ref on every keydown rather than added to the
// effect's dependency array, so the listener attaches once per mount instead
// of re-attaching whenever a handler closure changes - which, bound to
// per-render state like the current top card, would otherwise be every render.
export function useKeyboardShortcuts(bindings: ShortcutBinding[], enabled = true): void {
  const bindingsRef = useRef(bindings)
  bindingsRef.current = bindings

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return
      const binding = bindingsRef.current.find((b) => matchesShortcutEvent(event, b.def))
      if (!binding) return
      event.preventDefault()
      binding.handler()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
