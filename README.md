# Metalyde — Agency OS

An AI-native operating system for marketing agencies. The dashboard orchestrates
campaigns through a sequence of autonomous agents (**Strategy → Copywriting →
Reviewer & Financial**) and surfaces, in real time, the operational leverage this
creates: hours reclaimed, client margin, leverage ratio.

Built for the Build Challenge (2–4h). The intent was to show **how I'd architect
this**, not ship a complete product — the data layer is mocked, but the
boundaries are drawn exactly where a real backend plugs in.

## Demo

- Loom walkthrough: [link]
- Run locally: `npm install && npm run dev` → http://localhost:3000

## What's real vs. mocked

Being explicit here, because it's the point.

| Layer | Status |
|---|---|
| Dashboard panel (scenario picker, brief, animated pipeline, live terminal, leverage card) | **Real**, fully built |
| Pipeline state machine (`useReducer`, 2s/agent cadence, count-up) | **Real** |
| Front ↔ API data flow (`POST /api/campaign/run`) | **Real** — the front fetches the payload and drives the UI from it |
| Client Briefs / Agent Factory / ROI Optimizer panels | **Mockups** — designed and navigable, not yet wired to state |
| Agent *content* (Strategy, Copy, Reviewer outputs) | **Mocked** server-side, scenario-aware |
| Live LLM call (Anthropic) — full Strategy → Copywriting → Reviewer chain | **Implemented**, gated behind `USE_LIVE_AGENT` |

The live Anthropic call is fully written in `src/app/api/campaign/run/route.ts`.
It's off by default so the demo runs at **zero cost**. Set `USE_LIVE_AGENT=true`
with an `ANTHROPIC_API_KEY` and the **full three-agent chain** runs against the
Anthropic API — Strategy → Copywriting → Reviewer & Financial, each agent
consuming the previous one's output — and returns the **same payload shape** as
the mock, so **no front-end change is required**.

## The key design decision: one swap boundary

The static mock scenario and the live API payload both reduce to the **same
front-end shape** (`RunSpec`: per-agent script + financial targets). The state
machine only ever reads that shape, so it never knows whether the data came from
a static scenario or a live LLM call. Swapping mock → production is a single
insertion point in `launch()`, not a rewrite.

```
click → launch() → fetch /api/campaign/run → normalize to RunSpec
      → dispatch LAUNCH → state machine paces 3×2s → terminal + metrics
      (fetch fails → transparent fallback to static mock, identical UX)
```

## Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-first, oklch tokens) with shadcn/ui design tokens
- **lucide-react** icons

## How it works

The Dashboard runs a **state machine** (`useReducer` + discriminated-union
actions). On launch, the front calls `POST /api/campaign/run`, normalizes the
payload into a `RunSpec`, and dispatches `LAUNCH`. A `useEffect`/`setTimeout`
loop fires `ADVANCE` every 2s, walking the three agents sequentially — each must
reach `Success` before the next starts. When the final Reviewer agent completes,
reclaimed hours and client margin count up (RAF + easeOutCubic) into the
**Agency Leverage** metrics.

The API route (`route.ts`) has strict request typing, surface validation
(400 on bad `scenarioId`), try/catch, and returns the **same payload shape** in
both live and mock modes — so the UI is identical regardless of source. In mock
mode the three agents are scenario-aware; the two scenarios (EcoStride /
FlowState) return genuinely distinct, non-overlapping outputs.

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

To try the live agents, copy `.env.example` to `.env.local`, set
`USE_LIVE_AGENT=true` and add your `ANTHROPIC_API_KEY`.

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the dev server                 |
| `npm run build`    | Production build                     |
| `npm run start`    | Serve the production build           |
| `npm run lint`     | Run ESLint                           |
| `npm run typecheck`| Type-check without emitting          |

## What I'd build next

- Wire the Client Briefs / Agent Factory / ROI Optimizer mockups to real state.
- Persist briefs & runs (Postgres/Supabase) — the only missing layer; boundaries already exist.
- Stream agent output token-by-token to the terminal (SSE) instead of one-shot JSON + client-paced animation.
- Formalize the sequential agent hand-off (currently manual prompt-passing) via an orchestrator (LangGraph / Vercel AI SDK).
- Auth + multi-tenant per agency.
