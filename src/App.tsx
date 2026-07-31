import { useState } from 'react'
import type { CSSProperties } from 'react'
import { HelpCircle } from 'lucide-react'
import type { Tab } from './types'
import { useReviewState } from './hooks/useReviewState'
import { useSettings } from './hooks/useSettings'
import { useExcludedProblems } from './hooks/useExcludedProblems'
import { useNotes } from './hooks/useNotes'
import { usePracticeSession } from './hooks/usePracticeSession'
import { useGlobalNote } from './hooks/useGlobalNote'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { SHORTCUTS } from './lib/keyboardShortcuts'
import { getTabFromUrl, setTabInUrl } from './lib/tabRoute'
import { BottomNav } from './components/BottomNav'
import { SwipeReview } from './components/SwipeReview'
import { LearnView } from './components/LearnView'
import { StatsView } from './components/StatsView'
import { SettingsView } from './components/SettingsView'
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay'
import { NotesPanel } from './components/NotesPanel'
import './App.css'

function App() {
  const [tab, setTabState] = useState<Tab>(getTabFromUrl)
  const [pendingTopic, setPendingTopic] = useState<string | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  // Lives here, not inside SwipeReview, so the 'g' shortcut and the header
  // button both open the same panel regardless of tab - the note itself is
  // global (independent of any problem), so its open state shouldn't be
  // scoped to whichever tab happens to render the button that triggers it.
  const [globalNoteOpen, setGlobalNoteOpen] = useState(false)
  const review = useReviewState()
  const settings = useSettings()
  const excluded = useExcludedProblems()
  const notes = useNotes()
  const globalNote = useGlobalNote()
  // Lives here (mounted for the app's whole lifetime) rather than inside
  // SwipeReview, so switching to Learn/Stats/Settings and back doesn't wipe
  // the deck's queue/index/undo-stack - see usePracticeSession's own comment.
  const session = usePracticeSession(review, settings, excluded)

  // The shortcuts that are always available, everywhere - Swipe's own
  // review-action shortcuts are scoped to SwipeReview itself since they only
  // make sense there.
  useKeyboardShortcuts([
    { def: SHORTCUTS.help, handler: () => setShortcutsOpen((open) => !open) },
    { def: SHORTCUTS.openGlobalNote, handler: () => setGlobalNoteOpen((open) => !open) },
  ])

  const shellStyle = { '--code-font-size': `${settings.codeFontSize}px` } as CSSProperties

  const setTab = (next: Tab) => {
    setTabState(next)
    setTabInUrl(next)
  }

  const openTopic = (category: string) => {
    setPendingTopic(category)
    setTab('learn')
  }

  return (
    <div className="app-shell" style={shellStyle}>
      <div className="app-view">
        {tab === 'swipe' && (
          <SwipeReview
            review={review}
            settings={settings}
            excluded={excluded}
            notes={notes}
            onOpenGlobalNote={() => setGlobalNoteOpen(true)}
            session={session}
          />
        )}
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
        {tab === 'stats' && (
          <StatsView review={review} settings={settings} excluded={excluded} onOpenTopic={openTopic} />
        )}
        {tab === 'settings' && <SettingsView settings={settings} />}

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
      {globalNoteOpen && (
        <NotesPanel
          title="Notepad"
          placeholder="Jot anything - not tied to any specific problem..."
          value={globalNote.value}
          onChange={globalNote.setValue}
          onClose={() => setGlobalNoteOpen(false)}
        />
      )}
    </div>
  )
}

export default App
