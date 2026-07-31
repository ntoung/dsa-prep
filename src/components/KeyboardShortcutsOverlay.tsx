import { X } from 'lucide-react'
import { ALL_SHORTCUTS } from '../lib/keyboardShortcuts'
import { useEscapeToClose } from '../hooks/useEscapeToClose'

interface KeyboardShortcutsOverlayProps {
  onClose: () => void
}

export function KeyboardShortcutsOverlay({ onClose }: KeyboardShortcutsOverlayProps) {
  useEscapeToClose(onClose)

  return (
    <div className="shortcuts-overlay" onClick={onClose}>
      <div className="shortcuts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-panel-header">
          <h2>Keyboard shortcuts</h2>
          <button
            type="button"
            className="icon-button icon-button-sm"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <ul className="shortcuts-list">
          {ALL_SHORTCUTS.map((shortcut) => (
            <li key={shortcut.id} className="shortcuts-list-item">
              <span className="shortcuts-key">{shortcut.label}</span>
              <span className="shortcuts-description">{shortcut.description}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
