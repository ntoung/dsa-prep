# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## localStorage schema

This app is client-side only — `localStorage` is the single copy of a user's data, no server or sync. Every key is wrapped as `{ version, data }` by `src/lib/versionedStorage.ts` and loaded through a list of `Migration`s; unrecognized or corrupt data is preserved under `<key>:backup` instead of being overwritten with defaults. Whenever one of these shapes changes, bump its version constant and add a migration (see the rule in `CLAUDE.md`).

### `dsa-prep:settings` — owned by `useSettings.ts`

```json
{
  "version": 5,
  "data": {
    "codeFontSize": 14,
    "enabledDifficulties": ["Easy", "Medium", "Hard"],
    "dailyGoal": 10,
    "practiceMode": "random",
    "revealSolutionOnFlip": true,
    "progressiveReveal": true,
    "enabledLists": ["neetcode150"],
    "enableMcq": true,
    "codeLanguage": "python"
  }
}
```

### `dsa-prep:review-state` — owned by `useReviewState.ts` (record shape in `src/lib/spacedRepetition.ts`)

`Record<problemId, ReviewRecord>` — a Leitner `stage` (0–5), one entry per reviewed problem:

```json
{
  "version": 1,
  "data": {
    "two-sum": {
      "stage": 3,
      "dueAt": "2026-08-02T14:30:00.000Z",
      "lastReviewedAt": "2026-07-26T14:30:00.000Z",
      "reviewCount": 4
    }
  }
}
```

### `dsa-prep:daily-activity` — owned by `useReviewState.ts`

`Record<YYYY-MM-DD, count>` — review actions taken per day, used to compute the streak:

```json
{
  "version": 1,
  "data": {
    "2026-07-27": 8,
    "2026-07-28": 3
  }
}
```

### `dsa-prep:daily-progress` — owned by `useReviewState.ts`

Today's progress toward the daily goal; resets when `date` no longer matches today:

```json
{
  "version": 1,
  "data": {
    "date": "2026-07-28",
    "count": 3
  }
}
```

### `dsa-prep:activity-log` — owned by `useReviewState.ts`

`ActivityLogEntry[]`, capped at the most recent 2000 entries:

```json
{
  "version": 1,
  "data": [
    {
      "problemId": "two-sum",
      "outcome": "reviewed-easy",
      "timestamp": "2026-07-28T14:32:10.000Z"
    }
  ]
}
```

### `dsa-prep:notes` — owned by `useNotes.ts`

`Record<problemId, string>` — free-text scratchpad notes, independent of review state:

```json
{
  "version": 1,
  "data": {
    "two-sum": "Hashmap of value -> index; check for the complement before inserting."
  }
}
```

### `dsa-prep:excluded-problems` — owned by `useExcludedProblems.ts`

`string[]` of problem ids permanently skipped by the Swipe queue:

```json
{
  "version": 1,
  "data": ["reverse-linked-list"]
}
```
