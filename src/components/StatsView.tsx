import { useState } from 'react'
import { ChevronLeft, ChevronRight, Flame, X } from 'lucide-react'
import problemsData from '../data/problems.json'
import type { Problem } from '../types'
import type { useReviewState } from '../hooks/useReviewState'
import type { useSettings } from '../hooks/useSettings'
import type { useExcludedProblems } from '../hooks/useExcludedProblems'
import { averageStageByCategory } from '../lib/categoryStats'
import { buildMonthGrid } from '../lib/dailyActivityCalendar'

const FOCUS_AREA_COUNT = 3
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

const ALL_PROBLEMS = problemsData as Problem[]
const PROBLEMS_BY_ID = new Map(ALL_PROBLEMS.map((p) => [p.id, p]))

interface StatsViewProps {
  review: ReturnType<typeof useReviewState>
  settings: ReturnType<typeof useSettings>
  excluded: ReturnType<typeof useExcludedProblems>
  onOpenTopic: (category: string) => void
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

export function StatsView({ review, settings, excluded, onOpenTopic }: StatsViewProps) {
  const todayProgress = Math.min(100, Math.round((review.todayCount / settings.dailyGoal) * 100))
  const totalProgress = Math.round((review.reviewedCount / ALL_PROBLEMS.length) * 100)
  const categoryGroups = groupByCategory()

  const now = new Date()
  const [viewedMonth, setViewedMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const monthGrid = buildMonthGrid(
    viewedMonth.year,
    viewedMonth.month,
    review.dailyActivity,
    settings.dailyGoal,
    now,
  )
  const monthLabel = new Date(viewedMonth.year, viewedMonth.month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const isCurrentMonth = viewedMonth.year === now.getFullYear() && viewedMonth.month === now.getMonth()
  const changeMonth = (delta: number) => {
    setViewedMonth(({ year, month }) => {
      const next = new Date(year, month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

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

      <div className="stats-card">
        <div className="stats-metrics-activity">
          <div className="stats-tiles">
            <div className="stats-tile stats-tile-streak">
              <span className="stats-tile-number">{review.streak}</span>
              <span className="stats-tile-label">
                day streak <Flame size={14} strokeWidth={2} aria-hidden="true" />
              </span>
            </div>

            <div className="stats-tile">
              <span className="stats-tile-number">{review.todayCount}</span>
              <span className="stats-tile-label">today / {settings.dailyGoal}</span>
              <div className="stats-progress-bar">
                <div className="stats-progress-fill" style={{ width: `${todayProgress}%` }} />
              </div>
            </div>

            <div className="stats-tile">
              <span className="stats-tile-number">{review.reviewedCount}</span>
              <span className="stats-tile-label">total / {ALL_PROBLEMS.length}</span>
              <div className="stats-progress-bar">
                <div className="stats-progress-fill" style={{ width: `${totalProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="stats-daily-activity">
            <div className="stats-card-header stats-section-divider">
              <h3>Daily activity</h3>
              <div className="calendar-nav">
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Previous month"
                  onClick={() => changeMonth(-1)}
                >
                  <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />
                </button>
                <span>{monthLabel}</span>
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Next month"
                  onClick={() => changeMonth(1)}
                  disabled={isCurrentMonth}
                >
                  <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            </div>
            <p className="settings-hint">Each square is a day, shaded by problems done vs. your daily goal.</p>
            <div className="calendar-weekday-row">
              {WEEKDAY_LABELS.map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {monthGrid.map((day, i) =>
                day ? (
                  <div
                    key={day.key}
                    className={`heatmap-cell calendar-day level-${day.level}${day.isToday ? ' calendar-day-today' : ''}`}
                    title={`${day.date.toLocaleDateString()}: ${day.count} problem${day.count === 1 ? '' : 's'}`}
                  >
                    <span className="calendar-day-number">{day.date.getDate()}</span>
                  </div>
                ) : (
                  <div key={`blank-${i}`} className="calendar-day-blank" />
                ),
              )}
            </div>
            <div className="heatmap-legend">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((level) => (
                <div key={level} className={`heatmap-cell level-${level}`} />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {focusAreas.length > 0 && (
        <div className="stats-card">
          <div className="stats-card-header">
            <h3>Focus areas</h3>
          </div>
          <p className="settings-hint">Weakest categories right now - tap one to jump to its topic.</p>
          <div className="settings-size-pills">
            {focusAreas.map(({ category }) => (
              <button
                key={category}
                type="button"
                className="focus-area-pill"
                onClick={() => onOpenTopic(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {excluded.excludedIds.length > 0 && (
        <div className="stats-card">
          <div className="stats-card-header">
            <h3>Excluded problems</h3>
            <span>{excluded.excludedIds.length}</span>
          </div>
          <p className="settings-hint">Swiped down out of the review rotation. Tap to bring one back.</p>
          <ul className="excluded-list">
            {excluded.excludedIds.map((id) => {
              const problem = PROBLEMS_BY_ID.get(id)
              if (!problem) return null
              return (
                <li key={id} className="excluded-list-item">
                  <span>{problem.title}</span>
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    aria-label={`Restore ${problem.title} to the review rotation`}
                    title="Restore"
                    onClick={() => excluded.unexclude(id)}
                  >
                    <X size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
