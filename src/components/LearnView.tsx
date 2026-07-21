import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Search, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import problemsData from '../data/problems.json'
import { LESSONS, type Lesson } from '../data/lessons'
import type { Problem } from '../types'
import { LearnFlipCard } from './LearnFlipCard'

const ALL_PROBLEMS = problemsData as Problem[]
const PROBLEMS_BY_ID = new Map(ALL_PROBLEMS.map((p) => [p.id, p]))

function countByCategory(category: string): number {
  return ALL_PROBLEMS.filter((p) => p.category === category).length
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

export function LearnView() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null)
  const [flipped, setFlipped] = useState(false)

  const trimmedQuery = query.trim()
  const filteredLessons = LESSONS.filter((l) => lessonMatchesQuery(l, trimmedQuery))
  const activeLesson = activeCategory ? LESSONS.find((l) => l.category === activeCategory) : undefined
  const topicProblems = activeCategory ? ALL_PROBLEMS.filter((p) => p.category === activeCategory) : []
  const activeProblem = activeProblemId ? PROBLEMS_BY_ID.get(activeProblemId) : undefined

  const openTopic = (category: string) => setActiveCategory(category)
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

  // Back-button/gesture support: push a history entry per open overlay level, and let a
  // shared popstate listener close the topmost one instead of navigating away. The
  // *Consumed refs stop the level effect's own cleanup from double-popping when the
  // close already happened via a real popstate; isProgrammaticPopRef stops the reverse -
  // our own history.back() call re-triggering itself as if the user pressed back.
  const isProgrammaticPopRef = useRef(false)
  const topicConsumedRef = useRef(false)
  const problemConsumedRef = useRef(false)

  useEffect(() => {
    if (activeCategory === null) return
    topicConsumedRef.current = false
    history.pushState({ learnOverlay: 'topic' }, '')
    return () => {
      if (!topicConsumedRef.current) {
        isProgrammaticPopRef.current = true
        history.back()
      }
    }
  }, [activeCategory])

  useEffect(() => {
    if (activeProblemId === null) return
    problemConsumedRef.current = false
    history.pushState({ learnOverlay: 'problem' }, '')
    return () => {
      if (!problemConsumedRef.current) {
        isProgrammaticPopRef.current = true
        history.back()
      }
    }
  }, [activeProblemId])

  useEffect(() => {
    function onPopState() {
      if (isProgrammaticPopRef.current) {
        isProgrammaticPopRef.current = false
        return
      }
      if (activeProblemId !== null) {
        problemConsumedRef.current = true
        setActiveProblemId(null)
      } else if (activeCategory !== null) {
        topicConsumedRef.current = true
        setActiveCategory(null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [activeCategory, activeProblemId])

  return (
    <div className="learn-view">
      <h1 className="view-title">Learn</h1>

      <div className="search-wrap">
        <Search className="search-icon" size={16} strokeWidth={2} aria-hidden="true" />
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics or techniques…"
          aria-label="Search topics"
        />
      </div>

      {filteredLessons.length === 0 ? (
        <p className="no-results">No topics match "{trimmedQuery}"</p>
      ) : (
        <div className="learn-list">
          {filteredLessons.map((lesson) => (
            <section className="learn-card" key={lesson.category}>
              <button type="button" className="learn-card-header" onClick={() => openTopic(lesson.category)}>
                <span className="learn-card-title">{highlightFirstMatch(lesson.category, trimmedQuery)}</span>
                <span className="learn-card-count">{countByCategory(lesson.category)} problems</span>
                <ChevronRight className="learn-card-chevron" size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </section>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeLesson && (
          <motion.div
            key="topic-overlay"
            className="overlay-view overlay-view-topic"
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
                <h3>Problems in this category</h3>
                <div className="topic-problem-list">
                  {topicProblems.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className="topic-problem-row"
                      onClick={() => openProblem(p.id)}
                    >
                      <span className="topic-problem-title">{p.title}</span>
                      <span className={`difficulty-badge difficulty-${p.difficulty.toLowerCase()}`}>
                        {p.difficulty}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeProblem && (
          <motion.div
            key="problem-overlay"
            className="overlay-view overlay-view-problem"
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
              <LearnFlipCard problem={activeProblem} flipped={flipped} onToggleFlip={toggleFlip} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
