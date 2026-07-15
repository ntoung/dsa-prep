// Simple Leitner-style spaced repetition: each problem sits in a stage 0-5.
// A correct/confident review promotes it and pushes its next due date further
// out; a "revisit" demotes it and brings it back soon.
const STAGE_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30]
const MAX_STAGE = STAGE_INTERVAL_DAYS.length - 1

export interface ReviewRecord {
  stage: number
  dueAt: string
  lastReviewedAt: string | null
  reviewCount: number
}

export function newRecord(now: Date): ReviewRecord {
  return { stage: 0, dueAt: now.toISOString(), lastReviewedAt: null, reviewCount: 0 }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function promote(record: ReviewRecord, now: Date): ReviewRecord {
  const stage = Math.min(record.stage + 1, MAX_STAGE)
  return {
    stage,
    dueAt: addDays(now, STAGE_INTERVAL_DAYS[stage]).toISOString(),
    lastReviewedAt: now.toISOString(),
    reviewCount: record.reviewCount + 1,
  }
}

export function demote(record: ReviewRecord, now: Date): ReviewRecord {
  // Floor at stage 1 (never 0/immediate) so a "revisit later" swipe doesn't
  // make the card due again in the same session.
  const stage = Math.max(record.stage - 2, 1)
  return {
    stage,
    dueAt: addDays(now, STAGE_INTERVAL_DAYS[stage]).toISOString(),
    lastReviewedAt: now.toISOString(),
    reviewCount: record.reviewCount + 1,
  }
}

export function isDue(record: ReviewRecord | undefined, now: Date): boolean {
  if (!record) return true
  return new Date(record.dueAt).getTime() <= now.getTime()
}

export function isReviewed(record: ReviewRecord | undefined): boolean {
  return (record?.reviewCount ?? 0) > 0
}
