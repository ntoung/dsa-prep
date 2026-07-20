import { Minus, Plus } from 'lucide-react'
import { CODE_FONT_SIZES, DIFFICULTIES } from '../useSettings'
import type { useSettings } from '../useSettings'
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

      <FeedbackForm />
    </div>
  )
}
