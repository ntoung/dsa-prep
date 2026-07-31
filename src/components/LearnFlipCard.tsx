import { Check, Copy, ExternalLink, NotebookPen } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Language, Problem } from '../types'
import { getSolution } from '../lib/getSolution'

interface LearnFlipCardProps {
  problem: Problem
  flipped: boolean
  onToggleFlip: () => void
  onOpenNotes?: () => void
  hasNote?: boolean
  language: Language
}

export function LearnFlipCard({
  problem,
  flipped,
  onToggleFlip,
  onOpenNotes,
  hasNote = false,
  language,
}: LearnFlipCardProps) {
  const [copied, setCopied] = useState(false)
  const code = getSolution(problem, language).code

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  const linkButton = (
    <a
      className="icon-button icon-button-sm card-top-actions-right"
      href={problem.url}
      target="_blank"
      rel="noreferrer"
      aria-label="View original problem on LeetCode"
      title="View original problem on LeetCode"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
    </a>
  )

  // Front-face only, same as ProblemCard - these act on the solution shown
  // there, not the explanation on the back.
  const notesButton = onOpenNotes && (
    <button
      type="button"
      className={`icon-button icon-button-sm card-top-actions-right-2${hasNote ? ' icon-button-active' : ''}`}
      aria-label={hasNote ? 'Edit note' : 'Add note'}
      title={hasNote ? 'Edit note' : 'Add note'}
      onClick={(e) => {
        e.stopPropagation()
        onOpenNotes()
      }}
    >
      <NotebookPen size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  )

  const copyButton = (
    <button
      type="button"
      className="icon-button icon-button-sm card-solution-copy-button"
      aria-label={copied ? 'Solution copied' : 'Copy solution to clipboard'}
      title={copied ? 'Copied!' : 'Copy solution'}
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(code).then(() => setCopied(true))
      }}
    >
      {copied ? (
        <Check size={16} strokeWidth={2} aria-hidden="true" />
      ) : (
        <Copy size={16} strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  )

  return (
    <div className="learn-flip-card" onClick={onToggleFlip}>
      <div className={`card-inner${flipped ? ' flipped' : ''}`}>
        <div className="card-face card-front">
          {notesButton}
          {linkButton}
          <div className="card-front-header">
            <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>
              {problem.difficulty}
            </span>
            {problem.patterns.map((pattern) => (
              <span key={pattern} className="pattern-tag">
                {pattern}
              </span>
            ))}
          </div>
          <h2 className="card-title">{problem.title}</h2>
          <p className="card-category">{problem.category}</p>
          <div className="card-solution-wrap">
            <pre className="solution-code card-solution">
              <code>{code}</code>
            </pre>
            {copyButton}
          </div>
          <p className="card-flip-hint">Tap card for explanation</p>
        </div>
        <div className="card-face card-back">
          {linkButton}
          <h2 className="card-title">{problem.title}</h2>
          <div className="detail-block">
            <h3>Summary</h3>
            <p>{problem.summary}</p>
          </div>
          <div className="detail-block">
            <h3>Approach</h3>
            <p>{problem.approachSummary}</p>
          </div>
          <div className="detail-block">
            <h3>Walkthrough</h3>
            <p>{problem.walkthrough}</p>
          </div>
          <div className="detail-block detail-complexity">
            <h3>Complexity</h3>
            <p>Time: {problem.complexity.time}</p>
            <p>Space: {problem.complexity.space}</p>
          </div>
          {problem.pitfalls.length > 0 && (
            <div className="detail-block">
              <h3>Pitfalls</h3>
              <ul>
                {problem.pitfalls.map((pitfall) => (
                  <li key={pitfall}>{pitfall}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
