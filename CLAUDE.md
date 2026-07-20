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
- Deployed to Cloudflare Workers via `wrangler` (`@cloudflare/vite-plugin` in `vite.config.ts`, `npm run deploy`, `npm run preview` runs `wrangler dev`).

## Architecture

Four bottom-nav tabs:

- **Swipe** — the core review loop.
`ProblemCard.tsx` + `SwipeReview.tsx`, driven by a `framer-motion` drag gesture.
Backed by a lightweight Leitner spaced-repetition scheduler (`src/lib/spacedRepetition.ts`), persisted via `useReviewState.ts` to `localStorage`.
- **Learn** — 18 pattern-level lessons, one per problem category (`src/data/lessons.ts`).
Each is written so that reading it equips you to solve *any* problem in that category, not just describe one.
This replaced an earlier "Browse" search/list tab that was judged redundant with Swipe.
- **Stats** — streak, daily goal progress, and a per-category coverage heatmap (a grid of small cells, one per problem, shaded by spaced-repetition mastery stage) in `StatsView.tsx`.
- **Settings** — code font size (including an XS 10px option), daily goal, and difficulty filter, via `useSettings.ts`.

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
