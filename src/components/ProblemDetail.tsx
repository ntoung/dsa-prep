import { useState } from 'react'
import type { Problem } from '../types'

interface ProblemDetailProps {
  problem: Problem | null
  isReviewed: boolean
  onToggleReviewed: (id: string) => void
}

export function ProblemDetail({ problem, isReviewed, onToggleReviewed }: ProblemDetailProps) {
  const [revealed, setRevealed] = useState(false)

  if (!problem) {
    return (
      <section className="problem-detail problem-detail-empty">
        <p>Select a problem to review it.</p>
      </section>
    )
  }

  return (
    <section className="problem-detail">
      <div className="problem-detail-header">
        <div>
          <h2>{problem.title}</h2>
          <div className="problem-detail-meta">
            <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>
              {problem.difficulty}
            </span>
            <span className="pattern-tag">{problem.pattern}</span>
            <a href={problem.url} target="_blank" rel="noreferrer">
              View original problem
            </a>
          </div>
        </div>
        <button
          type="button"
          className={`reviewed-toggle${isReviewed ? ' active' : ''}`}
          onClick={() => onToggleReviewed(problem.id)}
        >
          {isReviewed ? 'Reviewed' : 'Mark reviewed'}
        </button>
      </div>

      {problem.needsReview && (
        <p className="needs-review-banner">Flagged for review: {problem.reviewReason}</p>
      )}

      {!revealed ? (
        <button type="button" className="reveal-button" onClick={() => setRevealed(true)}>
          Reveal solution
        </button>
      ) : (
        <div className="problem-detail-body">
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
          <div className="detail-block">
            <h3>Solution</h3>
            <pre className="solution-code">
              <code>{problem.solutionCode}</code>
            </pre>
          </div>
        </div>
      )}
    </section>
  )
}
