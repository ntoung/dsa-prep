import type { Tab } from '../types'

// Keeps the active bottom-nav tab reflected in the URL path (/, /learn,
// /stats, /settings) so the current tab survives a refresh and is
// shareable/bookmarkable. Uses replaceState (not pushState) - tab switches
// aren't meant to be a back-button stop, only the overlay stack
// (useOverlayHistory) owns back-button behavior today, and mixing the two
// would mean coordinating which "layer" the back button unwinds next.
const PATH_TO_TAB: Record<string, Tab> = {
  '/': 'swipe',
  '/learn': 'learn',
  '/stats': 'stats',
  '/settings': 'settings',
}

const TAB_TO_PATH: Record<Tab, string> = {
  swipe: '/',
  learn: '/learn',
  stats: '/stats',
  settings: '/settings',
}

export function getTabFromUrl(): Tab {
  return PATH_TO_TAB[window.location.pathname] ?? 'swipe'
}

export function setTabInUrl(tab: Tab): void {
  const url = new URL(window.location.href)
  url.pathname = TAB_TO_PATH[tab]
  window.history.replaceState(window.history.state, '', url)
}
