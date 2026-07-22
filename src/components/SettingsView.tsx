import { Minus, Plus } from 'lucide-react'
import { CODE_FONT_SIZES, DIFFICULTIES, PRACTICE_MODES } from '../useSettings'
import type { useSettings } from '../useSettings'
import { PROBLEM_LISTS } from '../data/problemLists'
import { FeedbackForm } from './FeedbackForm'

const SAMPLE_CODE = `def contains_duplicate(nums: list[int]) -> bool:
    seen = set()
    for n in nums:
        if n in seen:
            return True
        seen.add(n)
    return False
`

interface SettingsViewProps {
  settings: ReturnType<typeof useSettings>
}

const SIZE_LABELS: Record<number, string> = {
  10: 'XS',
  12: 'S',
  14: 'M',
  16: 'L',
  18: 'XL',
  20: 'XXL',
}

const PRACTICE_MODE_LABELS: Record<string, string> = {
  bfs: 'BFS',
  dfs: 'DFS',
  random: 'Random',
}

const PRACTICE_MODE_HINTS: Record<string, string> = {
  bfs: 'Spreads cards across topics, with a little repetition mixed in.',
  dfs: 'Drills one topic at a time before moving to the next.',
  random: 'Fully shuffled, ignoring topic entirely.',
}

export function SettingsView({ settings }: SettingsViewProps) {
  return (
    <div className="settings-view">
      <h1 className="view-title">Settings</h1>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Daily goal</h3>
        </div>
        <p className="settings-hint">How many cards to review per day before we celebrate.</p>
        <div className="settings-stepper">
          <button
            type="button"
            className="icon-button icon-button-sm"
            aria-label="Decrease daily goal"
            title="Decrease daily goal"
            onClick={() => settings.setDailyGoal(settings.dailyGoal - 1)}
          >
            <Minus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <span className="settings-stepper-value">{settings.dailyGoal}</span>
          <button
            type="button"
            className="icon-button icon-button-sm"
            aria-label="Increase daily goal"
            title="Increase daily goal"
            onClick={() => settings.setDailyGoal(settings.dailyGoal + 1)}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Code font size</h3>
          <span>{settings.codeFontSize}px</span>
        </div>
        <div className="settings-size-pills">
          {CODE_FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={`filter-pill${settings.codeFontSize === size ? ' active' : ''}`}
              onClick={() => settings.setCodeFontSize(size)}
            >
              {SIZE_LABELS[size]}
            </button>
          ))}
        </div>
        <pre className="solution-code settings-preview">
          <code>{SAMPLE_CODE}</code>
        </pre>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Review difficulty</h3>
        </div>
        <p className="settings-hint">Only show these difficulties in the Swipe deck.</p>
        <div className="settings-size-pills">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              className={`filter-pill${settings.enabledDifficulties.includes(difficulty) ? ' active' : ''}`}
              onClick={() => settings.toggleDifficulty(difficulty)}
            >
              {difficulty}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Problem lists</h3>
        </div>
        <p className="settings-hint">Only include problems from these lists in the Swipe deck.</p>
        <div className="settings-size-pills">
          {PROBLEM_LISTS.map((list) => (
            <button
              key={list.id}
              type="button"
              className={`filter-pill${settings.enabledLists.includes(list.id) ? ' active' : ''}`}
              onClick={() => settings.toggleList(list.id)}
            >
              {list.name}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Practice mode</h3>
        </div>
        <p className="settings-hint">{PRACTICE_MODE_HINTS[settings.practiceMode]}</p>
        <div className="settings-size-pills">
          {PRACTICE_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`filter-pill${settings.practiceMode === mode ? ' active' : ''}`}
              onClick={() => settings.setPracticeMode(mode)}
            >
              {PRACTICE_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Solution reveal</h3>
        </div>
        <p className="settings-hint">Show the solution on the card front, or hold it back until you flip.</p>
        <div className="settings-size-pills">
          <button
            type="button"
            className={`filter-pill${!settings.revealSolutionOnFlip ? ' active' : ''}`}
            onClick={() => settings.setRevealSolutionOnFlip(false)}
          >
            Show on front
          </button>
          <button
            type="button"
            className={`filter-pill${settings.revealSolutionOnFlip ? ' active' : ''}`}
            onClick={() => settings.setRevealSolutionOnFlip(true)}
          >
            Hide until flip
          </button>
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-card-header">
          <h3>Multiple choice cards</h3>
        </div>
        <p className="settings-hint">
          Sprinkle occasional pattern/complexity quiz cards into the Swipe deck for problems you've already reviewed.
        </p>
        <div className="settings-size-pills">
          <button
            type="button"
            className={`filter-pill${settings.enableMcq ? ' active' : ''}`}
            onClick={() => settings.setEnableMcq(true)}
          >
            On
          </button>
          <button
            type="button"
            className={`filter-pill${!settings.enableMcq ? ' active' : ''}`}
            onClick={() => settings.setEnableMcq(false)}
          >
            Off
          </button>
        </div>
      </div>

      <FeedbackForm />
    </div>
  )
}
