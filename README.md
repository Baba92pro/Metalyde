# Metalyde — Agency OS

An AI-native operating system for marketing agencies. The dashboard orchestrates
campaigns through a sequence of autonomous agents (Strategy → Creative → Reviewer
& Financial) and surfaces the operational leverage this creates for the agency.

## Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4** with shadcn/ui design tokens
- **lucide-react** icons

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the dev server                 |
| `npm run build`    | Production build                     |
| `npm run start`    | Serve the production build           |
| `npm run lint`     | Run ESLint                           |
| `npm run typecheck`| Type-check without emitting          |

## Project structure

```
src/
├── app/
│   ├── globals.css          # Tailwind v4 + theme tokens
│   ├── layout.tsx           # Root layout (dark mode)
│   └── page.tsx             # Renders the dashboard
├── components/
│   ├── ui/
│   │   └── button.tsx       # shadcn button
│   └── dashboard/
│       ├── dashboard.tsx    # Main screen + state/tick loop
│       ├── sidebar.tsx      # Nav (Dashboard, Briefs, Factory, ROI)
│       ├── pipeline-card.tsx# Per-campaign agent progress
│       └── leverage-card.tsx# Hours saved / margin / leverage ratio
└── lib/
    ├── pipeline.ts          # Domain model: agents, campaigns, factory
    └── utils.ts             # cn() helper
```

## How it works

Each campaign holds three agents that run **sequentially** — an agent must reach
`Success` before the next starts. A `setInterval` tick in `dashboard.tsx` advances
the currently-running agent. When the final Reviewer agent completes, reclaimed
hours and client margin are credited to the **Agency Leverage** metrics.

The data layer (`src/lib/pipeline.ts`) is intentionally mock/in-memory so the UI
can be wired to a real backend later without touching the components.
