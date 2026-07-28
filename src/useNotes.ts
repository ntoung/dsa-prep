import { useCallback, useEffect, useState } from 'react'
import { loadVersioned, saveVersioned, type Migration } from './lib/versionedStorage'

const NOTES_KEY = 'dsa-prep:notes'
const NOTES_VERSION = 1

type Notes = Record<string, string>

function normalizeNotes(data: unknown): Notes {
  if (!data || typeof data !== 'object') return {}
  const result: Notes = {}
  for (const [id, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof value === 'string') result[id] = value
  }
  return result
}

const NOTES_MIGRATIONS: Migration<Notes>[] = [{ version: 1, migrate: normalizeNotes }]

function loadNotes(): Notes {
  return loadVersioned(NOTES_KEY, NOTES_VERSION, NOTES_MIGRATIONS, () => ({}))
}

// Personal free-text notes per problem - a scratchpad for a mnemonic or
// gotcha, independent of the Leitner review state (useReviewState.ts), which
// only ever tracks graded outcomes, never arbitrary text.
export function useNotes() {
  const [notes, setNotes] = useState<Notes>(() => loadNotes())

  useEffect(() => {
    saveVersioned(NOTES_KEY, NOTES_VERSION, notes)
  }, [notes])

  const getNote = useCallback((id: string) => notes[id] ?? '', [notes])

  const hasNote = useCallback((id: string) => Boolean(notes[id]), [notes])

  const setNote = useCallback((id: string, text: string) => {
    setNotes((prev) => {
      if (text === '') {
        if (!(id in prev)) return prev
        const next = { ...prev }
        delete next[id]
        return next
      }
      if (prev[id] === text) return prev
      return { ...prev, [id]: text }
    })
  }, [])

  return { getNote, hasNote, setNote }
}
