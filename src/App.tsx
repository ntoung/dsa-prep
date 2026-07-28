import { useState } from 'react'
import type { CSSProperties } from 'react'
import { HelpCircle } from 'lucide-react'
import type { Tab } from './types'
import { useReviewState } from './useReviewState'
import { useSettings } from './useSettings'
import { useExcludedProblems } from './useExcludedProblems'
import { useNotes } from './useNotes'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'
import { SHORTCUTS } from './lib/keyboardShortcuts'
import { BottomNav } from './components/BottomNav'
import { SwipeReview } from './components/SwipeReview'
import { LearnView } from './components/LearnView'
import { StatsView } from './components/StatsView'
import { SettingsView } from './components/SettingsView'
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay'
import './App.css'

function App() {
  const [tab, setTab] = useState<Tab>('swipe')
  const [pendingTopic, setPendingTopic] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const review = useReviewState()
  const settings = useSettings()
  const excluded = useExcludedProblems()
  const notes = useNotes()

  // The one shortcut that's always available, everywhere - Swipe's own
  // review-action shortcuts are scoped to SwipeReview itself since they only
  // make sense there.
  useKeyboardShortcuts([{ def: SHORTCUTS.help, handler: () => setShortcutsOpen((open) => !open) }])

  const shellStyle = { '--code-font-size': `${settings.codeFontSize}px` } as CSSProperties

  const openTopic = (category: string) => {
    setPendingTopic(category)
    setTab('learn')
  }

  return (
    <div className="app-shell" style={shellStyle}>
      <div className="app-view">
        {tab === 'swipe' && <SwipeReview review={review} settings={settings} excluded={excluded} notes={notes} />}
        {tab === 'learn' && (
          <LearnView
            review={review}
            excluded={excluded}
            notes={notes}
            settings={settings}
            initialCategory={pendingTopic}
            onInitialCategoryConsumed={() => setPendingTopic(null)}
          />
        )}
        {tab === 'stats' && <StatsView review={review} settings={settings} onOpenTopic={openTopic} />}
        {tab === 'settings' && <SettingsView settings={settings} excluded={excluded} />}

        <button
          type="button"
          className="icon-button shortcuts-help-button"
          aria-label="Show keyboard shortcuts"
          title="Keyboard shortcuts"
          onClick={() => setShortcutsOpen(true)}
        >
          <HelpCircle size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <BottomNav active={tab} onChange={setTab} />

      {shortcutsOpen && <KeyboardShortcutsOverlay onClose={() => setShortcutsOpen(false)} />}
    </div>
  )
}

export default App
