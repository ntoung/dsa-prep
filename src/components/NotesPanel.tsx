import { X } from 'lucide-react'
import { useEscapeToClose } from '../hooks/useEscapeToClose'

interface NotesPanelProps {
  title: string
  placeholder?: string
  value: string
  onChange: (text: string) => void
  onClose: () => void
}

export function NotesPanel({ title, placeholder, value, onChange, onClose }: NotesPanelProps) {
  useEscapeToClose(onClose)

  return (
    <div className="notes-overlay" onClick={onClose}>
      <div className="notes-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notes-panel-header">
          <h2>{title}</h2>
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
          placeholder={placeholder ?? 'Jot a mnemonic, gotcha, or reminder for this problem...'}
          autoFocus
        />
      </div>
    </div>
  )
}
