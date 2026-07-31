import { Search, X } from 'lucide-react'
import { useState } from 'react'
import type { Problem } from '../types'
import { useEscapeToClose } from '../hooks/useEscapeToClose'

const MAX_RESULTS = 8

interface ProblemSearchProps {
  problems: Problem[]
  onSelect: (id: string) => void
  onClose: () => void
}

// Inline autocomplete, not a full-screen page - lives in .swipe-header and
// drops its results down over the card stack, so finding a problem never
// navigates you away from the card you were on.
export function ProblemSearch({ problems, onSelect, onClose }: ProblemSearchProps) {
  useEscapeToClose(onClose)
  const [query, setQuery] = useState('')
  const trimmed = query.trim().toLowerCase()
  const results = trimmed
    ? problems.filter((p) => p.title.toLowerCase().includes(trimmed)).slice(0, MAX_RESULTS)
    : []

  return (
    <div className="problem-search">
      <div className="problem-search-bar">
        <Search size={16} strokeWidth={2} aria-hidden="true" />
        <input
          className="problem-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems by name…"
          aria-label="Search problems"
          autoFocus
        />
        <button
          type="button"
          className="icon-button icon-button-sm"
          aria-label="Close search"
          onClick={onClose}
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      {trimmed &&
        (results.length === 0 ? (
          <div className="search-dropdown">
            <p className="no-results">No problems match "{query.trim()}"</p>
          </div>
        ) : (
          <div className="search-dropdown">
            <div className="search-result-list">
              {results.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className="search-result-item"
                  onClick={() => onSelect(p.id)}
                >
                  <span className="search-result-title">{p.title}</span>
                  <span className={`difficulty-badge difficulty-${p.difficulty.toLowerCase()}`}>
                    {p.difficulty}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
