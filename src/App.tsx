import { useMemo, useState } from 'react'
import problemsData from './data/problems.json'
import type { Problem } from './types'
import { useReviewedSet } from './useReviewedSet'
import { ProblemList } from './components/ProblemList'
import { ProblemDetail } from './components/ProblemDetail'
import './App.css'

const ALL_PROBLEMS = problemsData as Problem[]
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const

function App() {
  const [search, setSearch] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(ALL_PROBLEMS[0]?.id ?? null)
  const { reviewed, toggleReviewed } = useReviewedSet()

  const filteredProblems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return ALL_PROBLEMS.filter((problem) => {
      if (difficultyFilter && problem.difficulty !== difficultyFilter) return false
      if (query && !problem.title.toLowerCase().includes(query)) return false
      return true
    })
  }, [search, difficultyFilter])

  const selectedProblem = ALL_PROBLEMS.find((problem) => problem.id === selectedId) ?? null

  return (
    <>
      <header className="app-header">
        <div className="app-title">
          <h1>NeetCode 150 Review</h1>
          <p className="app-progress">
            {reviewed.size} / {ALL_PROBLEMS.length} reviewed
          </p>
        </div>
        <div className="app-controls">
          <input
            type="search"
            className="app-search"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="app-filter-pills">
            {DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                className={`filter-pill${difficultyFilter === difficulty ? ' active' : ''}`}
                onClick={() => setDifficultyFilter(difficultyFilter === difficulty ? null : difficulty)}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="app-body">
        <ProblemList
          problems={filteredProblems}
          selectedId={selectedId}
          reviewed={reviewed}
          onSelect={setSelectedId}
        />
        <ProblemDetail
          key={selectedProblem?.id ?? 'none'}
          problem={selectedProblem}
          isReviewed={selectedProblem ? reviewed.has(selectedProblem.id) : false}
          onToggleReviewed={toggleReviewed}
        />
      </main>
    </>
  )
}

export default App
