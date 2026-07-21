import { Flame } from 'lucide-react'
import problemsData from '../data/problems.json'
import type { Problem } from '../types'
import type { useReviewState } from '../useReviewState'
import type { useSettings } from '../useSettings'
import { averageStageByCategory } from '../lib/categoryStats'

const FOCUS_AREA_COUNT = 3

const ALL_PROBLEMS = problemsData as Problem[]
const MAX_HEAT_LEVEL = 4

interface StatsViewProps {
  review: ReturnType<typeof useReviewState>
  settings: ReturnType<typeof useSettings>
}

interface CategoryGroup {
  category: string
  problems: Problem[]
}

function groupByCategory(): CategoryGroup[] {
  const order: string[] = []
  const groups = new Map<string, Problem[]>()
  for (const problem of ALL_PROBLEMS) {
    let list = groups.get(problem.category)
    if (!list) {
      list = []
      groups.set(problem.category, list)
      order.push(problem.category)
    }
    list.push(problem)
  }
  return order.map((category) => ({ category, problems: groups.get(category)! }))
}

export function StatsView({ review, settings }: StatsViewProps) {
  const todayProgress = Math.min(100, Math.round((review.todayCount / settings.dailyGoal) * 100))
  const totalProgress = Math.round((review.reviewedCount / ALL_PROBLEMS.length) * 100)
  const categoryGroups = groupByCategory()

  // "Weakest" only among categories you've actually started - otherwise
  // every untouched category would tie for weakest and drown out the
  // categories that genuinely need more review.
  const weaknessByCategory = averageStageByCategory(ALL_PROBLEMS, review.reviewState)
  const focusAreas = categoryGroups
    .filter(({ problems }) => problems.some((p) => review.isReviewed(p.id)))
    .map(({ category }) => ({ category, avgStage: weaknessByCategory.get(category) ?? 0 }))
    .sort((a, b) => a.avgStage - b.avgStage)
    .slice(0, FOCUS_AREA_COUNT)

  return (
    <div className="stats-view">
      <h1 className="view-title">Stats</h1>

      <div className="stats-card stats-streak">
        <span className="stats-streak-number">{review.streak}</span>
        <span className="stats-streak-label">
          day streak <Flame size={16} strokeWidth={2} aria-hidden="true" />
        </span>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Today's goal</h3>
          <span>
            {review.todayCount} / {settings.dailyGoal}
          </span>
        </div>
        <div className="stats-progress-bar">
          <div className="stats-progress-fill" style={{ width: `${todayProgress}%` }} />
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Total reviewed</h3>
          <span>
            {review.reviewedCount} / {ALL_PROBLEMS.length}
          </span>
        </div>
        <div className="stats-progress-bar">
          <div className="stats-progress-fill" style={{ width: `${totalProgress}%` }} />
        </div>
      </div>

      {focusAreas.length > 0 && (
        <div className="stats-card">
          <div className="stats-card-header">
            <h3>Focus areas</h3>
          </div>
          <p className="settings-hint">Weakest categories right now - review these next.</p>
          <div className="settings-size-pills">
            {focusAreas.map(({ category }) => (
              <span key={category} className="focus-area-pill">
                {category}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Coverage by category</h3>
        </div>
        <p className="settings-hint">Each square is one problem, shaded by how well you know it.</p>
        <div className="category-stats">
          {categoryGroups.map(({ category, problems }) => {
            const reviewed = problems.filter((p) => review.isReviewed(p.id)).length
            return (
              <div className="category-stat-row" key={category}>
                <div className="category-stat-header">
                  <span>{category}</span>
                  <span>
                    {reviewed} / {problems.length}
                  </span>
                </div>
                <div className="category-heat-row">
                  {problems.map((problem) => {
                    const stage = Math.min(review.reviewState[problem.id]?.stage ?? 0, MAX_HEAT_LEVEL)
                    const reviewCount = review.reviewState[problem.id]?.reviewCount ?? 0
                    return (
                      <div
                        key={problem.id}
                        className={`heatmap-cell level-${stage}`}
                        title={`${problem.title}: reviewed ${reviewCount} time${reviewCount === 1 ? '' : 's'}`}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="heatmap-legend">
          <span>Not started</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={`heatmap-cell level-${level}`} />
          ))}
          <span>Mastered</span>
        </div>
      </div>
    </div>
  )
}
