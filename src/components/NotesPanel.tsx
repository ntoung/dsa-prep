import { X } from 'lucide-react'
import type { Problem } from '../types'
import { useEscapeToClose } from '../useEscapeToClose'

interface NotesPanelProps {
  problem: Problem
  value: string
  onChange: (text: string) => void
  onClose: () => void
}

export function NotesPanel({ problem, value, onChange, onClose }: NotesPanelProps) {
  useEscapeToClose(onClose)

  return (
    <div className="notes-overlay" onClick={onClose}>
      <div className="notes-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notes-panel-header">
          <h2>{problem.title}</h2>
          <button
            type="button"
            className="icon-button icon-button-sm"
            aria-label="Close notes"
            title="Close notes"
            onClick={onClose}
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <textarea
          className="notes-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Jot a mnemonic, gotcha, or reminder for this problem..."
          autoFocus
        />
      </div>
    </div>
  )
}
