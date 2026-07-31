import { useCallback, useEffect, useState } from 'react'
import type { Difficulty, Language, PracticeMode } from '../types'
import { loadVersioned, saveVersioned, type Migration } from '../lib/versionedStorage'
import { PROBLEM_LISTS } from '../data/problemLists'

const SETTINGS_KEY = 'dsa-prep:settings'
const SETTINGS_VERSION = 6

export const CODE_FONT_SIZES = [10, 12, 14, 16, 18, 20] as const
const DEFAULT_CODE_FONT_SIZE = 14

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']
const DEFAULT_ENABLED_DIFFICULTIES: Difficulty[] = [...DIFFICULTIES]

export const DEFAULT_DAILY_GOAL = 10

export const PRACTICE_MODES: PracticeMode[] = ['bfs', 'dfs', 'random']
const DEFAULT_PRACTICE_MODE: PracticeMode = 'random'

const DEFAULT_ENABLED_LISTS: string[] = ['neetcode150']

export const LANGUAGES: Language[] = ['python', 'javascript']
const DEFAULT_CODE_LANGUAGE: Language = 'python'

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
  // When true (and revealSolutionOnFlip is also on), a problem with authored
  // revealStages builds up from skeleton to full solution across taps. When
  // false, the full solution is shown immediately - no stage stepping.
  progressiveReveal: boolean
  enabledLists: string[]
  // Sprinkles occasional multiple-choice cards (pattern-recognition or
  // complexity-recall) into the Swipe deck for already-reviewed problems.
  // Answering one grades the underlying problem via the same Leitner
  // promote/demote a swipe would - not a parallel tracking mechanism.
  enableMcq: boolean
  // Sprinkles occasional pattern-lesson interstitials (Learn's own
  // Recognize/Template/Tips content, not new/duplicated text) into the
  // Swipe deck. Purely educational - dismissing one never touches Leitner
  // state or the daily goal, same read-only posture as the Learn tab.
  enablePatternCards: boolean
  // Which language's solution to display. Safe to set to any Language even
  // before every problem has a translation - getSolution() falls back to
  // Python for problems that don't have this language yet.
  codeLanguage: Language
}

// Fills in defaults for anything missing/invalid rather than discarding the
// rest of the object - this doubles as the v0 -> v1 migration for settings
// saved before versioning existed, the v1 -> v2 migration that added
// enabledLists, the v2 -> v3 migration that added enableMcq, the v3 ->
// v4 migration that added codeLanguage, the v4 -> v5 migration that added
// progressiveReveal, and the v5 -> v6 migration that added
// enablePatternCards (see versionedStorage.ts).
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
    progressiveReveal: parsed.progressiveReveal ?? true,
    enabledLists: enabledLists.length > 0 ? enabledLists : DEFAULT_ENABLED_LISTS,
    enableMcq: parsed.enableMcq ?? true,
    enablePatternCards: parsed.enablePatternCards ?? true,
    codeLanguage: parsed.codeLanguage && LANGUAGES.includes(parsed.codeLanguage) ? parsed.codeLanguage : DEFAULT_CODE_LANGUAGE,
  }
}

const SETTINGS_MIGRATIONS: Migration<Settings>[] = [
  { version: 1, migrate: normalizeSettings },
  { version: 2, migrate: normalizeSettings },
  { version: 3, migrate: normalizeSettings },
  { version: 4, migrate: normalizeSettings },
  { version: 5, migrate: normalizeSettings },
  { version: 6, migrate: normalizeSettings },
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

  const setProgressiveReveal = useCallback((progressiveReveal: boolean) => {
    setSettings((prev) => ({ ...prev, progressiveReveal }))
  }, [])

  const setEnableMcq = useCallback((enableMcq: boolean) => {
    setSettings((prev) => ({ ...prev, enableMcq }))
  }, [])

  const setEnablePatternCards = useCallback((enablePatternCards: boolean) => {
    setSettings((prev) => ({ ...prev, enablePatternCards }))
  }, [])

  const setCodeLanguage = useCallback((codeLanguage: Language) => {
    setSettings((prev) => ({ ...prev, codeLanguage }))
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
    setProgressiveReveal,
    setEnableMcq,
    setEnablePatternCards,
    setCodeLanguage,
    toggleList,
  }
}
