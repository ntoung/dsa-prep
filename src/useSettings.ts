import { useCallback, useEffect, useState } from 'react'
import type { Difficulty } from './types'

const SETTINGS_KEY = 'dsa-prep:settings'

export const CODE_FONT_SIZES = [10, 12, 14, 16, 18, 20] as const
const DEFAULT_CODE_FONT_SIZE = 14

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard']
const DEFAULT_ENABLED_DIFFICULTIES: Difficulty[] = [...DIFFICULTIES]

export const DEFAULT_DAILY_GOAL = 10

interface Settings {
  codeFontSize: number
  enabledDifficulties: Difficulty[]
  dailyGoal: number
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<Settings>) : {}
    return {
      codeFontSize: parsed.codeFontSize ?? DEFAULT_CODE_FONT_SIZE,
      enabledDifficulties:
        parsed.enabledDifficulties && parsed.enabledDifficulties.length > 0
          ? parsed.enabledDifficulties
          : DEFAULT_ENABLED_DIFFICULTIES,
      dailyGoal: parsed.dailyGoal && parsed.dailyGoal > 0 ? parsed.dailyGoal : DEFAULT_DAILY_GOAL,
    }
  } catch {
    return {
      codeFontSize: DEFAULT_CODE_FONT_SIZE,
      enabledDifficulties: DEFAULT_ENABLED_DIFFICULTIES,
      dailyGoal: DEFAULT_DAILY_GOAL,
    }
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings())

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
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

  return { ...settings, setCodeFontSize, setDailyGoal, toggleDifficulty }
}
