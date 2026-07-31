import { AnimatePresence, motion } from 'framer-motion'
import {
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  ExternalLink,
  NotebookPen,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import problemsData from '../data/problems.json'
import { LESSONS, type Lesson, type PatternSnippet } from '../data/lessons'
import type { Problem } from '../types'
import type { useReviewState } from '../hooks/useReviewState'
import type { useExcludedProblems } from '../hooks/useExcludedProblems'
import type { useNotes } from '../hooks/useNotes'
import type { useSettings } from '../hooks/useSettings'
import { useEscapeToClose } from '../hooks/useEscapeToClose'
import { useOverlayHistory } from '../hooks/useOverlayHistory'
import { getSolution } from '../lib/getSolution'
import { LearnFlipCard } from './LearnFlipCard'
import { NotesPanelHost } from './NotesPanelHost'

const ALL_PROBLEMS = problemsData as Problem[]
const PROBLEMS_BY_ID = new Map(ALL_PROBLEMS.map((p) => [p.id, p]))
const MAX_HEAT_LEVEL = 4

function problemsByCategory(category: string): Problem[] {
  return ALL_PROBLEMS.filter((p) => p.category === category)
}

function lessonMatchesQuery(lesson: Lesson, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    lesson.category.toLowerCase().includes(q) ||
    lesson.recognize.toLowerCase().includes(q) ||
    lesson.template.toLowerCase().includes(q) ||
    lesson.tips.toLowerCase().includes(q)
  )
}

// idx is found on the lowercased text but sliced on the original - safe here since
// none of the category names contain casefolds that change string length.
function highlightFirstMatch(text: string, query: string): ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

interface LearnViewProps {
  review: ReturnType<typeof useReviewState>
  excluded: ReturnType<typeof useExcludedProblems>
  notes: ReturnType<typeof useNotes>
  settings: ReturnType<typeof useSettings>
  initialCategory?: string | null
  onInitialCategoryConsumed?: () => void
}

export function LearnView({
  review,
  excluded,
  notes,
  settings,
  initialCategory,
  onInitialCategoryConsumed,
}: LearnViewProps) {
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)
  // Which problems in the currently-open topic have their solution expanded
  // inline, right in the list - separate from activeProblemId, which opens
  // the full-screen flip card instead. Keyed by id rather than a single
  // "expanded index" so multiple rows (or all of them, via expandAll) can be
  // open at once.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  // Which row's copy-to-clipboard icon is showing its "copied" checkmark -
  // only one at a time makes sense, so a single id rather than a Set.
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null)
  // Same idea, for the Patterns list's own code-copy button - a separate
  // state since it's keyed by snippet name, not problem id.
  const [copiedSnippetName, setCopiedSnippetName] = useState<string | null>(null)
  const [notesOpenFor, setNotesOpenFor] = useState<string | null>(null)

  // Opens the topic overlay for a category handed off from elsewhere (e.g. the
  // Stats tab's Focus areas pills) - consumed immediately so switching away and
  // back to Learn doesn't reopen the same topic on its own.
  useEffect(() => {
    if (!initialCategory) return
    setActiveCategory(initialCategory)
    onInitialCategoryConsumed?.()
  }, [initialCategory, onInitialCategoryConsumed])

  const trimmedQuery = query.trim()
  const filteredLessons = LESSONS.filter((l) => lessonMatchesQuery(l, trimmedQuery))
  const activeLesson = activeCategory ? LESSONS.find((l) => l.category === activeCategory) : undefined
  const topicProblems = activeCategory ? ALL_PROBLEMS.filter((p) => p.category === activeCategory) : []
  const activeProblem = activeProblemId ? PROBLEMS_BY_ID.get(activeProblemId) : undefined

  const openTopic = (category: string) => {
    setActiveCategory(category)
    setExpandedIds(new Set())
  }
  const closeTopic = () => {
    setActiveCategory(null)
    setActiveProblemId(null)
  }
  const openProblem = (id: string) => {
    setFlipped(false)
    setActiveProblemId(id)
  }
  const closeProblem = () => setActiveProblemId(null)
  const toggleFlip = () => setFlipped((f) => !f)
  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  // Same close functions the X buttons use below, so Escape closes one
  // overlay level at a time (problem before topic) exactly like tapping X
  // does - see useEscapeToClose for how nested overlays stay ordered.
  useEscapeToClose(closeTopic, activeCategory !== null)
  useEscapeToClose(closeProblem, activeProblemId !== null)
  useEscapeToClose(closeSearch, searchOpen)

  // Same close functions as above, so the back button also closes one
  // overlay level at a time - see useOverlayHistory for how stacked levels
  // stay ordered without double-closing or over-popping.
  useOverlayHistory(activeCategory, closeTopic)
  useOverlayHistory(activeProblemId, closeProblem)

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const allExpanded = topicProblems.length > 0 && topicProblems.every((p) => expandedIds.has(p.id))
  const toggleExpandAll = () => {
    setExpandedIds(allExpanded ? new Set() : new Set(topicProblems.map((p) => p.id)))
  }

  useEffect(() => {
    if (!copiedRowId) return
    const timeout = setTimeout(() => setCopiedRowId(null), 1500)
    return () => clearTimeout(timeout)
  }, [copiedRowId])

  useEffect(() => {
    if (!copiedSnippetName) return
    const timeout = setTimeout(() => setCopiedSnippetName(null), 1500)
    return () => clearTimeout(timeout)
  }, [copiedSnippetName])

  const copyPatternCode = (snippet: PatternSnippet) => {
    navigator.clipboard.writeText(snippet.code).then(() => setCopiedSnippetName(snippet.name))
  }

  const copyRowSolution = (p: Problem) => {
    navigator.clipboard.writeText(getSolution(p, settings.codeLanguage).code).then(() => setCopiedRowId(p.id))
  }

  // Reviewing from here closes the overlay afterward, the same way a swipe
  // dismisses the card on the Swipe tab - there's no queue here, just the
  // one problem you opened.
  const handleReviewed = () => {
    if (!activeProblem) return
    review.markReviewed(activeProblem.id)
    closeProblem()
  }
  const handleRevisit = () => {
    if (!activeProblem) return
    review.markRevisit(activeProblem.id)
    closeProblem()
  }
  const handleExclude = () => {
    if (!activeProblem) return
    excluded.exclude(activeProblem.id)
    closeProblem()
  }

  return (
    <div className="learn-view">
      <div className="learn-header">
        <h1 className="view-title">Learn</h1>
        {!searchOpen && (
          <button
            type="button"
            className="icon-button icon-button-sm"
            aria-label="Search topics"
            title="Search topics"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
        {searchOpen && (
          <div className="search-wrap">
            <Search className="search-icon" size={16} strokeWidth={2} aria-hidden="true" />
            <input
              className="search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics or techniques…"
              aria-label="Search topics"
              autoFocus
            />
            <button
              type="button"
              className="icon-button icon-button-sm"
              aria-label="Close search"
              onClick={closeSearch}
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <div className="stats-card-header learn-section-header">
        <h3>Topics</h3>
      </div>
      {filteredLessons.length === 0 ? (
        <p className="no-results">No topics match "{trimmedQuery}"</p>
      ) : (
        <div className="learn-list">
          {filteredLessons.map((lesson) => {
            const problems = problemsByCategory(lesson.category)
            return (
              <section className="learn-card" key={lesson.category}>
                <button type="button" className="learn-card-header" onClick={() => openTopic(lesson.category)}>
                  <ChevronRight className="learn-card-chevron" size={16} strokeWidth={2} aria-hidden="true" />
                  <span className="learn-card-title">{highlightFirstMatch(lesson.category, trimmedQuery)}</span>
                  <span className="learn-card-count">{problems.length} problems</span>
                  <div className="category-heat-row">
                    {problems.map((problem) => {
                      const stage = Math.min(review.reviewState[problem.id]?.stage ?? 0, MAX_HEAT_LEVEL)
                      return <div key={problem.id} className={`heatmap-cell level-${stage}`} />
                    })}
                  </div>
                </button>
              </section>
            )
          })}
        </div>
      )}

      {!trimmedQuery && (
        <>
          <div className="stats-card-header learn-section-header">
            <h3>Patterns</h3>
          </div>
          <div className="pattern-snippet-grid">
            {LESSONS.flatMap((lesson) =>
              lesson.snippets.map((snippet) => (
                <div className="pattern-snippet-card" key={snippet.name}>
                  <div className="topic-list-header">
                    <h3>{snippet.name}</h3>
                    <button
                      type="button"
                      className="icon-button icon-button-sm"
                      aria-label={copiedSnippetName === snippet.name ? 'Code copied' : 'Copy code to clipboard'}
                      title={copiedSnippetName === snippet.name ? 'Copied!' : 'Copy code'}
                      onClick={() => copyPatternCode(snippet)}
                    >
                      {copiedSnippetName === snippet.name ? (
                        <Check size={16} strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <Copy size={16} strokeWidth={2} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <pre className="solution-code">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              )),
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {activeLesson && (
          <div className="overlay-wrap overlay-wrap-topic">
            <motion.div
              key="topic-overlay"
              className="overlay-view"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="learn-topic-title"
            >
            <div className="overlay-header">
              <button type="button" className="icon-button" aria-label="Close" onClick={closeTopic}>
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
              <div className="overlay-header-title">
                <h2 id="learn-topic-title">{activeLesson.category}</h2>
                <span>{topicProblems.length} problems</span>
              </div>
            </div>
            <div className="detail-body">
              <div className="detail-block">
                <h3>Recognize it</h3>
                <p>{activeLesson.recognize}</p>
              </div>
              <div className="detail-block">
                <h3>Template</h3>
                <p>{activeLesson.template}</p>
              </div>
              <div className="detail-block">
                <h3>Tips</h3>
                <p>{activeLesson.tips}</p>
              </div>
              <div className="detail-block">
                <div className="topic-list-header">
                  <h3>Problems in this category</h3>
                  <button
                    type="button"
                    className="icon-button icon-button-sm"
                    aria-label={allExpanded ? 'Collapse all solutions' : 'Expand all solutions'}
                    title={allExpanded ? 'Collapse all' : 'Expand all'}
                    onClick={toggleExpandAll}
                  >
                    {allExpanded ? (
                      <ChevronsDownUp size={16} strokeWidth={2} aria-hidden="true" />
                    ) : (
                      <ChevronsUpDown size={16} strokeWidth={2} aria-hidden="true" />
                    )}
                  </button>
                </div>
                <div className="topic-problem-list">
                  {topicProblems.map((p) => {
                    const expanded = expandedIds.has(p.id)
                    const hasNote = notes.hasNote(p.id)
                    const copied = copiedRowId === p.id
                    const rowCode = getSolution(p, settings.codeLanguage).code
                    return (
                      <div className="topic-problem-item" key={p.id}>
                        <div className="topic-problem-row">
                          <button
                            type="button"
                            className="topic-problem-row-main"
                            aria-label={`${p.title}, ${p.difficulty}`}
                            onClick={() => openProblem(p.id)}
                          >
                            <span
                              className={`difficulty-dot difficulty-dot-${p.difficulty.toLowerCase()}`}
                              aria-hidden="true"
                            />
                            <span className="topic-problem-title">{p.title}</span>
                          </button>
                          {/* Hidden until the row is hovered/focused - same three actions
                              (link/copy/notes) as the full-screen card below, so opening a
                              row via a mouse or via tap both reach the same actions. */}
                          <div className="topic-row-icons">
                            <a
                              className="icon-button icon-button-sm"
                              href={p.url}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="View original problem on LeetCode"
                              title="View original problem on LeetCode"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={16} strokeWidth={2} aria-hidden="true" />
                            </a>
                            <button
                              type="button"
                              className="icon-button icon-button-sm"
                              aria-label={copied ? 'Solution copied' : 'Copy solution to clipboard'}
                              title={copied ? 'Copied!' : 'Copy solution'}
                              onClick={() => copyRowSolution(p)}
                            >
                              {copied ? (
                                <Check size={16} strokeWidth={2} aria-hidden="true" />
                              ) : (
                                <Copy size={16} strokeWidth={2} aria-hidden="true" />
                              )}
                            </button>
                            <button
                              type="button"
                              className={`icon-button icon-button-sm${hasNote ? ' icon-button-active' : ''}`}
                              aria-label={hasNote ? 'Edit note' : 'Add note'}
                              title={hasNote ? 'Edit note' : 'Add note'}
                              onClick={() => setNotesOpenFor(p.id)}
                            >
                              <NotebookPen size={16} strokeWidth={2} aria-hidden="true" />
                            </button>
                          </div>
                          <button
                            type="button"
                            className="icon-button icon-button-sm topic-problem-expand-btn"
                            aria-label={expanded ? 'Hide solution' : 'Show solution'}
                            title={expanded ? 'Hide solution' : 'Show solution'}
                            aria-expanded={expanded}
                            onClick={() => toggleExpanded(p.id)}
                          >
                            <ChevronDown
                              className={`topic-problem-expand-icon${expanded ? ' expanded' : ''}`}
                              size={16}
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                        {expanded && (
                          <pre className="solution-code topic-problem-solution">
                            <code>{rowCode}</code>
                          </pre>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeProblem && (
          <div className="overlay-wrap overlay-wrap-problem">
            <motion.div
              key="problem-overlay"
              className="overlay-view"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.28 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="learn-problem-title"
            >
            <div className="overlay-header">
              <button type="button" className="icon-button" aria-label="Close" onClick={closeProblem}>
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
              <div className="overlay-header-title">
                <h2 id="learn-problem-title">{activeProblem.title}</h2>
              </div>
            </div>
            <div className="detail-body learn-problem-body">
              <LearnFlipCard
                problem={activeProblem}
                flipped={flipped}
                onToggleFlip={toggleFlip}
                onOpenNotes={() => setNotesOpenFor(activeProblem.id)}
                hasNote={notes.hasNote(activeProblem.id)}
                language={settings.codeLanguage}
              />
              <div className="swipe-actions">
                <button
                  type="button"
                  className="icon-button icon-button-danger"
                  aria-label="Exclude from review rotation"
                  title="Exclude"
                  onClick={handleExclude}
                >
                  <Ban size={22} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-warning"
                  aria-label="Revisit later"
                  title="Revisit later"
                  onClick={handleRevisit}
                >
                  <RotateCcw size={24} strokeWidth={2} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button icon-button-positive"
                  aria-label="Mark reviewed"
                  title="Mark reviewed"
                  onClick={handleReviewed}
                >
                  <Check size={26} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <NotesPanelHost
        problemId={notesOpenFor}
        problems={PROBLEMS_BY_ID}
        notes={notes}
        onClose={() => setNotesOpenFor(null)}
      />
    </div>
  )
}
