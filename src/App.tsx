import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Tab } from './types'
import { useReviewState } from './useReviewState'
import { useSettings } from './useSettings'
import { BottomNav } from './components/BottomNav'
import { SwipeReview } from './components/SwipeReview'
import { LearnView } from './components/LearnView'
import { StatsView } from './components/StatsView'
import { SettingsView } from './components/SettingsView'
import './App.css'

function App() {
  const [tab, setTab] = useState<Tab>('swipe')
  const review = useReviewState()
  const settings = useSettings()

  const shellStyle = { '--code-font-size': `${settings.codeFontSize}px` } as CSSProperties

  return (
    <div className="app-shell" style={shellStyle}>
      <div className="app-view">
        {tab === 'swipe' && <SwipeReview review={review} settings={settings} />}
        {tab === 'learn' && <LearnView />}
        {tab === 'stats' && <StatsView review={review} settings={settings} />}
        {tab === 'settings' && <SettingsView settings={settings} />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

export default App
