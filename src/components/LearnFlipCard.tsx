import { ExternalLink } from 'lucide-react'
import type { Problem } from '../types'

interface LearnFlipCardProps {
  problem: Problem
  flipped: boolean
  onToggleFlip: () => void
}

export function LearnFlipCard({ problem, flipped, onToggleFlip }: LearnFlipCardProps) {
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

  return (
    <div className="learn-flip-card" onClick={onToggleFlip}>
      <div className={`card-inner${flipped ? ' flipped' : ''}`}>
        <div className="card-face card-front">
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
          <pre className="solution-code card-solution">
            <code>{problem.solutionCode}</code>
          </pre>
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
