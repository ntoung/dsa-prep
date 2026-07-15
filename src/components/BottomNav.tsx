import { Layers, BookOpen, BarChart3, Settings } from 'lucide-react'
import type { Tab } from '../types'

interface BottomNavProps {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; Icon: typeof Layers }[] = [
  { id: 'swipe', label: 'Swipe', Icon: Layers },
  { id: 'learn', label: 'Learn', Icon: BookOpen },
  { id: 'stats', label: 'Stats', Icon: BarChart3 },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav-item${active === tab.id ? ' active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-label={tab.label}
          aria-current={active === tab.id ? 'page' : undefined}
          title={tab.label}
        >
          <tab.Icon className="bottom-nav-icon" size={22} strokeWidth={2} aria-hidden="true" />
        </button>
      ))}
    </nav>
  )
}
