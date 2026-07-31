import { useCallback, useEffect, useState } from 'react'
import { loadVersioned, saveVersioned, type Migration } from '../lib/versionedStorage'

const GLOBAL_NOTE_KEY = 'dsa-prep:global-note'
const GLOBAL_NOTE_VERSION = 1

function normalizeGlobalNote(data: unknown): string {
  return typeof data === 'string' ? data : ''
}

const GLOBAL_NOTE_MIGRATIONS: Migration<string>[] = [{ version: 1, migrate: normalizeGlobalNote }]

function loadGlobalNote(): string {
  return loadVersioned(GLOBAL_NOTE_KEY, GLOBAL_NOTE_VERSION, GLOBAL_NOTE_MIGRATIONS, () => '')
}

// A single free-text scratchpad independent of any problem - unlike
// useNotes.ts's per-problem map, there's exactly one value here.
export function useGlobalNote() {
  const [value, setValueState] = useState<string>(() => loadGlobalNote())

  useEffect(() => {
    saveVersioned(GLOBAL_NOTE_KEY, GLOBAL_NOTE_VERSION, value)
  }, [value])

  const setValue = useCallback((text: string) => {
    setValueState(text)
  }, [])

  return { value, setValue }
}
