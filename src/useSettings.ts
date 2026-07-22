import { useCallback, useEffect, useState } from 'react'
import type { Difficulty, PracticeMode } from './types'
import { loadVersioned, saveVersioned, type Migration } from './lib/versionedStorage'
import { PROBLEM_LISTS } from './data/problemLists'

const SETTINGS_KEY = 'dsa-prep:settings'
const SETTINGS_VERSION = 3

export const CODE_FONT_SIZES = [10, 12, 14, 16, 18, 20] as const
const DEFAULT_CODE_FONT_SIZE = 14

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']
const DEFAULT_ENABLED_DIFFICULTIES: Difficulty[] = [...DIFFICULTIES]

export const DEFAULT_DAILY_GOAL = 10

export const PRACTICE_MODES: PracticeMode[] = ['bfs', 'dfs', 'random']
const DEFAULT_PRACTICE_MODE: PracticeMode = 'random'

const DEFAULT_ENABLED_LISTS: string[] = ['neetcode150']

interface Settings {
  codeFontSize: number
  enabledDifficulties: Difficulty[]
  dailyGoal: number
  practiceMode: PracticeMode
  // When true, cards start on the explanation face instead of the solution
  // face, so recall is tested before the answer is shown. On by default -
  // testing effect over passive review. Existing users keep whatever value
  // they already have on disk; this default only reaches fresh installs.
  revealSolutionOnFlip: boolean
  enabledLists: string[]
  // Sprinkles occasional multiple-choice cards (pattern-recognition or
  // complexity-recall) into the Swipe deck for already-reviewed problems.
  // Answering one grades the underlying problem via the same Leitner
  // promote/demote a swipe would - not a parallel tracking mechanism.
  enableMcq: boolean
}

// Fills in defaults for anything missing/invalid rather than discarding the
// rest of the object - this doubles as the v0 -> v1 migration for settings
// saved before versioning existed, the v1 -> v2 migration that added
// enabledLists, and the v2 -> v3 migration that added enableMcq (see
// versionedStorage.ts).
function normalizeSettings(data: unknown): Settings {
  const parsed = (data ?? {}) as Partial<Settings>
  const enabledLists = Array.isArray(parsed.enabledLists)
    ? parsed.enabledLists.filter((id) => PROBLEM_LISTS.some((list) => list.id === id))
    : []
  return {
    codeFontSize: parsed.codeFontSize ?? DEFAULT_CODE_FONT_SIZE,
    enabledDifficulties:
      parsed.enabledDifficulties && parsed.enabledDifficulties.length > 0
        ? parsed.enabledDifficulties
        : DEFAULT_ENABLED_DIFFICULTIES,
    dailyGoal: parsed.dailyGoal && parsed.dailyGoal > 0 ? parsed.dailyGoal : DEFAULT_DAILY_GOAL,
    practiceMode: parsed.practiceMode && PRACTICE_MODES.includes(parsed.practiceMode) ? parsed.practiceMode : DEFAULT_PRACTICE_MODE,
    revealSolutionOnFlip: parsed.revealSolutionOnFlip ?? true,
    enabledLists: enabledLists.length > 0 ? enabledLists : DEFAULT_ENABLED_LISTS,
    enableMcq: parsed.enableMcq ?? true,
  }
}

const SETTINGS_MIGRATIONS: Migration<Settings>[] = [
  { version: 1, migrate: normalizeSettings },
  { version: 2, migrate: normalizeSettings },
  { version: 3, migrate: normalizeSettings },
]

function loadSettings(): Settings {
  return loadVersioned(SETTINGS_KEY, SETTINGS_VERSION, SETTINGS_MIGRATIONS, () => normalizeSettings(undefined))
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  useEffect(() => {
    saveVersioned(SETTINGS_KEY, SETTINGS_VERSION, settings)
  }, [settings])

  const setCodeFontSize = useCallback((codeFontSize: number) => {
    setSettings((prev) => ({ ...prev, codeFontSize }))
  }, [])

  const setDailyGoal = useCallback((dailyGoal: number) => {
    setSettings((prev) => ({ ...prev, dailyGoal: Math.max(1, dailyGoal) }))
  }, [])

  const toggleDifficulty = useCallback((difficulty: Difficulty) => {
    setSettings((prev) => {
      const isEnabled = prev.enabledDifficulties.includes(difficulty)
      // Always keep at least one difficulty enabled so the deck is never empty by mistake.
      if (isEnabled && prev.enabledDifficulties.length === 1) return prev
      const enabledDifficulties = isEnabled
        ? prev.enabledDifficulties.filter((d) => d !== difficulty)
        : [...prev.enabledDifficulties, difficulty]
      return { ...prev, enabledDifficulties }
    })
  }, [])

  const setPracticeMode = useCallback((practiceMode: PracticeMode) => {
    setSettings((prev) => ({ ...prev, practiceMode }))
  }, [])

  const setRevealSolutionOnFlip = useCallback((revealSolutionOnFlip: boolean) => {
    setSettings((prev) => ({ ...prev, revealSolutionOnFlip }))
  }, [])

  const setEnableMcq = useCallback((enableMcq: boolean) => {
    setSettings((prev) => ({ ...prev, enableMcq }))
  }, [])

  const toggleList = useCallback((listId: string) => {
    setSettings((prev) => {
      const isEnabled = prev.enabledLists.includes(listId)
      // Always keep at least one list enabled so the deck is never empty by mistake.
      if (isEnabled && prev.enabledLists.length === 1) return prev
      const enabledLists = isEnabled ? prev.enabledLists.filter((id) => id !== listId) : [...prev.enabledLists, listId]
      return { ...prev, enabledLists }
    })
  }, [])

  return {
    ...settings,
    setCodeFontSize,
    setDailyGoal,
    toggleDifficulty,
    setPracticeMode,
    setRevealSolutionOnFlip,
    setEnableMcq,
    toggleList,
  }
}
