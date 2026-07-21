import { Send } from 'lucide-react'
import { useState } from 'react'

type FeedbackType = 'Bug' | 'Feature'
type Status = 'idle' | 'sending' | 'sent' | 'error'

const ENDPOINT = import.meta.env.VITE_FEEDBACK_ENDPOINT
const SECRET = import.meta.env.VITE_FEEDBACK_SECRET

export function FeedbackForm() {
  const [type, setType] = useState<FeedbackType>('Bug')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  if (!ENDPOINT) return null

  const submit = async () => {
    if (!description.trim() || status === 'sending') return
    setStatus('sending')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          type,
          description: description.trim(),
          secret: SECRET,
          userAgent: navigator.userAgent,
        }),
      })
      const data = (await res.json()) as { ok: boolean }
      if (!data.ok) throw new Error('rejected')
      setStatus('sent')
      setDescription('')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="stats-card">
      <div className="stats-card-header">
        <h3>Report a bug or request a feature</h3>
      </div>
      <div className="settings-size-pills">
        {(['Bug', 'Feature'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={`filter-pill${type === option ? ' active' : ''}`}
            onClick={() => setType(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <textarea
        className="feedback-textarea"
        placeholder={type === 'Bug' ? "What happened, and what did you expect?" : 'What would you like to see?'}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
      />
      <div className="feedback-submit-row">
        <button
          type="button"
          className="icon-button icon-button-sm"
          aria-label="Send feedback"
          title="Send feedback"
          disabled={!description.trim() || status === 'sending'}
          onClick={submit}
        >
          <Send size={16} strokeWidth={2} aria-hidden="true" />
        </button>
        {status === 'sent' && <span className="settings-hint">Thanks - sent.</span>}
        {status === 'error' && <span className="settings-hint">Couldn't send, try again.</span>}
      </div>
    </div>
  )
}
