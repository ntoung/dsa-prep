import { useCallback, useEffect, useState } from 'react'
import { loadVersioned, saveVersioned, type Migration } from '../lib/versionedStorage'

const EXCLUDED_KEY = 'dsa-prep:excluded-problems'
const EXCLUDED_VERSION = 1

function normalizeExcludedIds(data: unknown): string[] {
  return Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string') : []
}

const EXCLUDED_MIGRATIONS: Migration<string[]>[] = [{ version: 1, migrate: normalizeExcludedIds }]

function loadExcludedIds(): string[] {
  return loadVersioned(EXCLUDED_KEY, EXCLUDED_VERSION, EXCLUDED_MIGRATIONS, () => [])
}

// A problem here is skipped entirely by the Swipe queue - distinct from the
// Leitner schedule (spacedRepetition.ts), which only ever defers a problem,
// never removes it. Kept as its own small hook/storage key rather than a
// field on ReviewRecord, since "never show this again" isn't a review
// outcome.
export function useExcludedProblems() {
  const [excludedIds, setExcludedIds] = useState<string[]>(() => loadExcludedIds())

  useEffect(() => {
    saveVersioned(EXCLUDED_KEY, EXCLUDED_VERSION, excludedIds)
  }, [excludedIds])

  const exclude = useCallback((id: string) => {
    setExcludedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const unexclude = useCallback((id: string) => {
    setExcludedIds((prev) => prev.filter((excludedId) => excludedId !== id))
  }, [])

  const isExcluded = useCallback((id: string) => excludedIds.includes(id), [excludedIds])

  return { excludedIds, exclude, unexclude, isExcluded }
}
