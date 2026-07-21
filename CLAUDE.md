# dsa-prep

A mobile-first, gesture-driven NeetCode 150 review app.
Swipe left to mark a problem reviewed, swipe right to revisit it later, tap to flip the card and see the explanation.

## Stack

- React 19 + TypeScript + Vite.
- `framer-motion` for the swipe/drag card gestures.
- `lucide-react` for all icons.
No emoji in the UI — this was deliberately replaced early on for cross-platform rendering consistency.
- Single `src/App.css` with CSS custom properties for theming (light/dark via `prefers-color-scheme`).
No CSS framework.
- Deployed to Cloudflare Pages, git-integrated (Cloudflare builds and deploys automatically on push to `main`; no local deploy script or `wrangler`). Build command `npm run build`, output directory `dist`. `npm run preview` runs `vite preview` for a local look at the production build. Client-side env vars for Production/Preview must be set in the Cloudflare Pages dashboard, not just a local `.env` — see `FEEDBACK_ENDPOINT`/`FEEDBACK_SECRET` in `.env.example`.

## Architecture

Four bottom-nav tabs:

- **Swipe** — the core review loop.
`ProblemCard.tsx` + `SwipeReview.tsx`, driven by a `framer-motion` drag gesture.
Backed by a lightweight Leitner spaced-repetition scheduler (`src/lib/spacedRepetition.ts`), persisted via `useReviewState.ts` to `localStorage`.
- **Learn** — 18 pattern-level lessons, one per problem category (`src/data/lessons.ts`).
Each is written so that reading it equips you to solve *any* problem in that category, not just describe one.
`LearnView.tsx` has a search box (filters by category name or a substring match inside the lesson text) above the topic list.
Tapping a topic opens a full-screen detail overlay (Recognize/Template/Tips plus every problem in that category); tapping a problem opens a second full-screen overlay with a flip card.
Both overlays are `position: fixed` (z-index 400/500, above `.goal-toast`'s 300) so they cover `BottomNav` with no changes to `App.tsx`.
Browser/hardware back button closes one overlay level at a time via `history.pushState`/`popstate` in `LearnView.tsx` — see the *Consumed-ref comments there before touching that logic, it's there specifically to avoid double-closing or over-popping.
The flip card (`LearnFlipCard.tsx`) deliberately duplicates `ProblemCard.tsx`'s front/back JSX rather than sharing a component — see "Gesture & scroll constraints" below for why `ProblemCard.tsx` itself should stay untouched.
This tab is read-only reference and never writes to the spaced-repetition review state.
- **Stats** — streak, daily goal progress, and a per-category coverage heatmap (a grid of small cells, one per problem, shaded by spaced-repetition mastery stage) in `StatsView.tsx`.
- **Settings** — code font size (including an XS 10px option), daily goal, and difficulty filter, via `useSettings.ts`.
Also a bug/feature feedback form (`FeedbackForm.tsx`) that POSTs straight to a Google Apps Script Web App, which appends a row to a Sheet — see `google-apps-script/README.md`.
This is the one deliberate exception to "no backend": no server we host or maintain, just a `fetch` to Google's infrastructure, and it degrades to rendering nothing if `FEEDBACK_ENDPOINT` isn't set.
`FEEDBACK_ENDPOINT`/`FEEDBACK_SECRET` are read via `import.meta.env` without Vite's default `VITE_` prefix — `vite.config.ts` sets `envPrefix: 'FEEDBACK_'` instead, since these are the only two client-exposed env vars this app has.

**Data:** `src/data/problems.json` holds all 150 problems, each with a full write-up — summary, approach, walkthrough, complexity, pitfalls, and a Python solution.

**Persistence:** fully client-side, `localStorage` only.
No backend, no auth, no database, single-device by design.
See "Foundational stances" below before adding anything server-backed.

## Code style for solutions

All 150 Python solutions in `problems.json` follow a consistent style.
Match it when adding or editing solutions:

- Use `collections.Counter` / `collections.defaultdict` where they'd replace manual dict bookkeeping.
- `i`, `j` for generic loop indices; `n`, `m` for lengths/dimensions.
Keep semantic names like `left`/`right`/`slow`/`fast` where they're clearer than generic indices — don't force those into `i`/`j`.
- `result` as the name for the answer-accumulator variable, not `best`/ad hoc names.
- Cache `len()` into `n`/`m` instead of calling it repeatedly.
- Prefer `enumerate()` and `zip()` over manual index bookkeeping.
- Never use a bare `l` as a variable name (looks like `1`/`I`).
- PEP 585 lowercase generics (`list[int]`, `dict[str, int]`) — never `List`/`Dict` from `typing`.

## Gesture & scroll constraints — read before touching `ProblemCard.tsx`

The Swipe card has **no internal scrollable regions**, and that's deliberate, not an oversight.

It was tried once: the code block got its own `overflow-x: auto` plus `stopPropagation()` on pointerdown to keep its horizontal scroll independent of the card's `drag="x"` gesture.
This passed thorough CDP-based testing (chrome-devtools-axi) at the time, shipped, and then broke swiping on a real phone — `stopPropagation()` silently swallowed any swipe gesture that started with a finger over the code text, which is the largest touchable area on the card.
CDP-simulated drags never revealed this; only real touch input did.

The fix, and the standing rule: the card's height budget grows instead (`min(760px, 100%)` on `.problem-card`), and a smaller font option (XS, 10px) gives another lever for long lines.
Lines that still don't fit are clipped (`overflow-x: hidden`), not scrolled.
**Do not re-add scroll inside `.problem-card` along the drag axis without re-litigating this tradeoff.**

This fragility is also why `LearnFlipCard.tsx` (the Learn tab's problem detail view) duplicates `ProblemCard.tsx`'s front/back JSX instead of extracting a shared component — real-device testing isn't available in every environment that touches this code, so the lower-risk tradeoff is a small amount of duplicated static JSX over introducing a shared abstraction into gesture-critical code.
`LearnFlipCard.tsx` has no `drag`, so it doesn't need the capture-phase `stopPropagation` workaround below — a plain bubble-phase `onClick` is correct there.

**Framer Motion + nested interactive elements gotcha**, hit while building the card's icon buttons (link, undo):

1. Framer Motion's drag/tap listeners are native listeners on the draggable DOM node, firing during native event bubbling — *before* React's own delegated root listener dispatches synthetic events.
A bubble-phase `stopPropagation()` on a nested element fires too late to stop it.
Use capture-phase handlers (`onPointerDownCapture` / `onClickCapture`) instead.
2. Calling `stopPropagation()` inside a capture-phase handler prevents the event from ever completing its round-trip to fire a *separate* bubble-phase `onClick` on that same element.
The actual action must be invoked directly inside the capture handler — a separate `onClick` alongside a capture-phase `stopPropagation()` will silently never fire.
This exact bug ("the undo button isn't working") shipped once before being caught.

## Testing

- Real-device testing is required for anything touching drag/swipe/touch behavior.
CDP simulation is necessary but not sufficient sign-off — see the gesture gotcha above for why.
- `e2e/run.js` drives a Browserbase cloud browser through a `localtunnel` tunnel.
This has been unreliable due to tunnel connectivity, confirmed via direct testing to be infrastructure flakiness, not app bugs.
Don't sink excessive time re-diagnosing tunnel timeouts — a couple of retries is reasonable, then fall back to manual verification via chrome-devtools-axi (mobile viewport emulation, screenshots, real click/drag testing).

## Foundational stances

- **Swipe is the product.**
New features should fit the gesture-driven card paradigm, not regress toward desktop list/search patterns.
- **Spaced repetition, not a checkbox.**
Review state is a Leitner-style scheduler, not a boolean "reviewed" flag.
Extend that model rather than adding a parallel simpler tracking mechanism.
- **Icon-first UI.**
Prefer icon-only buttons with `aria-label`s over visible text buttons, consistent with the rest of the app.
- **Review parameters are user-configurable, not hardcoded.**
Daily goal, font size, and difficulty filter all became Settings rather than constants — apply the same instinct to future tunable behavior.
- **Client-side only, single device.**
No backend, no sync, no accounts.
Treat any server-backed feature (e.g. cross-device sync) as a real architecture change worth confirming explicitly, not an incremental add-on.
- **Learn teaches patterns, not solutions.**
Each lesson should generalize to every problem in its category, not describe one specific problem.
