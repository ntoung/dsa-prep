import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'dsa-prep:reviewed'

function loadReviewedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function useReviewedSet() {
  const [reviewed, setReviewed] = useState<Set<string>>(() => loadReviewedSet())

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...reviewed]))
  }, [reviewed])

  const toggleReviewed = useCallback((id: string) => {
    setReviewed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  return { reviewed, toggleReviewed }
}
