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

| Key | Version | Shape | Owner hook |
| --- | --- | --- | --- |
| `dsa-prep:settings` | 5 | `Settings` — code font size, enabled difficulties, daily goal, practice mode, reveal/progressive-reveal toggles, enabled problem lists, MCQ toggle, code language | `useSettings.ts` |
| `dsa-prep:review-state` | 1 | `Record<problemId, ReviewRecord>` — Leitner `stage` (0–5), `dueAt`, `lastReviewedAt`, `reviewCount`, one entry per reviewed problem | `useReviewState.ts` (record shape in `src/lib/spacedRepetition.ts`) |
| `dsa-prep:daily-activity` | 1 | `Record<YYYY-MM-DD, count>` — review actions taken per day, used to compute the streak | `useReviewState.ts` |
| `dsa-prep:daily-progress` | 1 | `{ date, count }` — today's progress toward the daily goal; resets when `date` no longer matches today | `useReviewState.ts` |
| `dsa-prep:activity-log` | 1 | `ActivityLogEntry[]` (`{ problemId, outcome, timestamp }`), capped at the most recent 2000 entries | `useReviewState.ts` |
| `dsa-prep:notes` | 1 | `Record<problemId, string>` — free-text scratchpad notes, independent of review state | `useNotes.ts` |
| `dsa-prep:excluded-problems` | 1 | `string[]` of problem ids permanently skipped by the Swipe queue | `useExcludedProblems.ts` |
