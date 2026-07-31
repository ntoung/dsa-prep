import type { Problem } from '../types'
import type { useNotes } from '../hooks/useNotes'
import { NotesPanel } from './NotesPanel'

interface NotesPanelHostProps {
  problemId: string | null
  problems: Map<string, Problem>
  notes: ReturnType<typeof useNotes>
  onClose: () => void
}

// Shared by SwipeReview and LearnView, both of which open the same
// NotesPanel for whichever problem's note icon was tapped - looks up the
// problem from its id (bailing out safely if it's ever missing, e.g. a
// stale id) so each caller doesn't have to duplicate that lookup.
export function NotesPanelHost({ problemId, problems, notes, onClose }: NotesPanelHostProps) {
  if (!problemId) return null
  const problem = problems.get(problemId)
  if (!problem) return null
  return (
    <NotesPanel
      title={problem.title}
      value={notes.getNote(problemId)}
      onChange={(text) => notes.setNote(problemId, text)}
      onClose={onClose}
    />
  )
}
