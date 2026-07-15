import { useState } from 'react'
import problemsData from '../data/problems.json'
import { LESSONS } from '../data/lessons'
import type { Problem } from '../types'

const ALL_PROBLEMS = problemsData as Problem[]

function countByCategory(category: string): number {
  return ALL_PROBLEMS.filter((p) => p.category === category).length
}

export function LearnView() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (category: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  return (
    <div className="learn-view">
      <h1 className="view-title">Learn</h1>
      <p className="settings-hint">
        Each pattern below is the general technique behind every problem in that category - read it before you
        attempt one for the first time.
      </p>
      <div className="learn-list">
        {LESSONS.map((lesson) => {
          const isOpen = expanded.has(lesson.category)
          return (
            <section className="learn-card" key={lesson.category}>
              <button
                type="button"
                className="learn-card-header"
                onClick={() => toggle(lesson.category)}
                aria-expanded={isOpen}
              >
                <span className={`chevron${isOpen ? '' : ' collapsed'}`} aria-hidden="true" />
                <span className="learn-card-title">{lesson.category}</span>
                <span className="learn-card-count">{countByCategory(lesson.category)} problems</span>
              </button>
              {isOpen && (
                <div className="learn-card-body">
                  <div className="detail-block">
                    <h3>Recognize it</h3>
                    <p>{lesson.recognize}</p>
                  </div>
                  <div className="detail-block">
                    <h3>Template</h3>
                    <p>{lesson.template}</p>
                  </div>
                  <div className="detail-block">
                    <h3>Tips</h3>
                    <p>{lesson.tips}</p>
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
