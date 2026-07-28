// Keeps the Swipe tab's current top-of-stack problem in the URL (?problem=<id>)
// so a refresh lands back on the same card instead of re-rolling the queue.
// replaceState (not pushState) - this fires on every swipe, and pushing a
// history entry per card would make the back button step through review
// history instead of leaving the app.
const PROBLEM_QUERY_PARAM = 'problem'

export function getProblemIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(PROBLEM_QUERY_PARAM)
}

export function setProblemIdInUrl(id: string | null): void {
  const url = new URL(window.location.href)
  if (id) {
    url.searchParams.set(PROBLEM_QUERY_PARAM, id)
  } else {
    url.searchParams.delete(PROBLEM_QUERY_PARAM)
  }
  window.history.replaceState(window.history.state, '', url)
}
