# Problem content schema

The contract for everything that goes into `problems.json` — what the
generation pipeline must produce and what the app's components read. This is
the source of truth for the shape of a `Problem`; `src/types.ts` is the
enforced version of it. If you change one, change the other.

Two additions on top of today's (Python-only, no-quiz-content) shape, both
designed to be **purely additive** — every existing field, every existing
`problems.json` entry, and every existing component keeps working
untouched. Nothing here requires a migration.

## Language: `translations`, not a restructure

```ts
export type Language = 'python' | 'javascript'
```

`Problem.solutionCode` and `Problem.revealStages` stay exactly as they are
today - implicitly Python, unchanged. A new sibling field carries anything
else:

```ts
export interface LanguageSolution {
  code: string
  revealStages?: RevealStage[] // same RevealStage shape as today
}

// Absent for every problem until a translation is authored for it. No
// needsReview flag here on purpose - "not present yet" already is the
// review gate (nothing publishes until it's ready), and needsReview is
// barely used elsewhere in this schema in practice (1 of 150 problems
// today, and nothing in the app reads it at runtime) - not worth a second
// review mechanism for one more content type.
translations?: Partial<Record<Exclude<Language, 'python'>, LanguageSolution>>
```

A single helper is the only thing that needs to know both fields exist:

```ts
export function getSolution(problem: Problem, language: Language): LanguageSolution {
  if (language === 'python') {
    return { code: problem.solutionCode, revealStages: problem.revealStages }
  }
  return problem.translations?.[language] ?? { code: problem.solutionCode, revealStages: problem.revealStages }
}
```

Falls back to Python when a problem doesn't have the selected language yet -
so a language switcher is safe to ship before every problem is translated;
untranslated problems just quietly show Python.

Why not couple a translation's `revealStages` to Python's (same stage count/
labels, only `code` differs per language)? Considered it - rejected for now.
It'd force every translation to match a stage structure decided independently
for Python, for a conceptual-parity benefit that's speculative before a
second language's content actually exists. Self-contained is simpler; revisit
only if drift between languages turns out to be a real problem once
JavaScript content exists to look at.

## Crux questions: authored from what's already there

```ts
export interface CruxQuestion {
  id: string
  language: Language
  // The solution split at exactly one blank - not a single string with an
  // embedded marker token. This makes "exactly one blank" true by
  // construction: no parsing required to render it, no way for a
  // generation pass to accidentally emit zero or two blanks.
  codeBefore: string
  codeAfter: string
  // The correct entry is the exact text that fills the gap between
  // codeBefore and codeAfter. Distractors should be plausible - same
  // register as this problem's own `pitfalls` (an off-by-one, a wrong
  // comparison direction, a missing edge-case guard) - not a random
  // unrelated line. 4 options total, matching the existing pattern/
  // complexity MCQs.
  options: string[]
  correctIndex: number
  needsReview: boolean
  reviewReason: string
}
```

Attached as `cruxQuestions?: CruxQuestion[]`, optional and absent by default.

**Authoring guidance, not a structural rule**: every problem's `revealStages`
already ends in a `# TODO: <description>` / `pass` placeholder marking
exactly the hard part still missing at that stage - e.g. for
`contains-duplicate`, stage 2's gap is "remember this value for future
checks," which *is* the crux (the set-membership trick the whole problem
hinges on). The generation pipeline should default to turning each problem's
final-stage gap into its first `CruxQuestion` - `codeBefore`/`codeAfter` are
already sitting right there in the stage's code, split at the `pass`. This is
guidance, not a hard link in the schema: `cruxQuestions` stays a plain array
so a problem can later get a second, different crux question without being
tied to stage structure.

## Relationship to the existing MCQ system

`src/lib/mcqGenerator.ts` stays exactly as it is for `'pattern'` and
`'complexity'` - both are, and should remain, synthesized at runtime from
fields every problem already has, no authoring required. Crux becomes a
third kind, only offered when authored content exists for the current
problem + selected language:

```ts
export interface McqQuestion {
  problemId: string
  kind: 'pattern' | 'complexity' | 'crux'
  prompt: string
  options: string[]
  correctIndex: number
}
```

`MCQCard.tsx` renders `'crux'` differently from the other two: `codeBefore`
+ a visually distinct blank + `codeAfter` in a code block (reusing
`.solution-code` styling), with each option rendered as a code snippet
rather than plain text.

## Implementation checklist (not yet done)

1. `src/types.ts`: add `Language`, `LanguageSolution`, `translations?`,
   `CruxQuestion`, `cruxQuestions?`, and the `getSolution` helper (probably
   in `src/lib/`, next to `spacedRepetition.ts`/`practiceQueue.ts`).
2. `useSettings.ts`: add `codeLanguage: Language` (default `'python'`), same
   pattern as `codeFontSize`. `SettingsView.tsx` gets a language picker -
   safe to ship immediately since `getSolution`'s fallback means every
   problem still renders correctly before any JavaScript content exists.
3. `ProblemCard.tsx`, `LearnFlipCard.tsx`, and `LearnView.tsx`'s topic-row
   copy/inline-expand switch from reading `problem.solutionCode` /
   `problem.revealStages` directly to `getSolution(problem, settings.codeLanguage)`.
4. `mcqGenerator.ts` + `MCQCard.tsx`: add the `'crux'` kind as described
   above.
5. Generation pipeline (external to this repo): author `translations.javascript`
   incrementally per problem, and default new problems' first
   `cruxQuestions` entry to the final revealStage's gap as described above.
