import { useState } from 'react'
import type { Problem } from '../types'

interface ProblemListProps {
  problems: Problem[]
  selectedId: string | null
  reviewed: Set<string>
  onSelect: (id: string) => void
}

function groupByCategory(problems: Problem[]): [string, Problem[]][] {
  const groups = new Map<string, Problem[]>()
  for (const problem of problems) {
    const list = groups.get(problem.category)
    if (list) {
      list.push(problem)
    } else {
      groups.set(problem.category, [problem])
    }
  }
  return [...groups.entries()]
}

export function ProblemList({ problems, selectedId, reviewed, onSelect }: ProblemListProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const groups = groupByCategory(problems)

  const toggleCategory = (category: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  return (
    <nav className="problem-list" aria-label="Problem list">
      {groups.map(([category, items]) => {
        const isCollapsed = collapsed.has(category)
        const doneCount = items.filter((p) => reviewed.has(p.id)).length
        return (
          <section key={category} className="problem-category">
            <button
              type="button"
              className="problem-category-header"
              onClick={() => toggleCategory(category)}
              aria-expanded={!isCollapsed}
            >
              <span className={`chevron${isCollapsed ? ' collapsed' : ''}`} aria-hidden="true" />
              <span className="problem-category-name">{category}</span>
              <span className="problem-category-count">
                {doneCount}/{items.length}
              </span>
            </button>
            {!isCollapsed && (
              <ul className="problem-category-items">
                {items.map((problem) => (
                  <li key={problem.id}>
                    <button
                      type="button"
                      className={`problem-row${problem.id === selectedId ? ' selected' : ''}`}
                      onClick={() => onSelect(problem.id)}
                    >
                      {reviewed.has(problem.id) && (
                        <span className="reviewed-check" aria-hidden="true">
                          ✓
                        </span>
                      )}
                      <span className="problem-row-title">{problem.title}</span>
                      {problem.needsReview && (
                        <span className="needs-review-dot" title="Flagged for review" aria-hidden="true" />
                      )}
                      <span className={`difficulty-badge difficulty-${problem.difficulty.toLowerCase()}`}>
                        {problem.difficulty}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
      {groups.length === 0 && <p className="problem-list-empty">No problems match your search.</p>}
    </nav>
  )
}
