"use client"

import { useEffect, useReducer, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Sidebar, type NavKey } from "./sidebar"
import { LeverageCard } from "./leverage-card"
import {
  Rocket,
  Activity,
  Layers,
  CheckCircle2,
  Cpu,
  Compass,
  PenTool,
  ShieldCheck,
  Loader2,
  Circle,
  Terminal,
  Leaf,
  Briefcase,
  Target,
  Wallet,
  Users,
  Flag,
  Upload,
  Power,
  Banknote,
  DollarSign,
  TrendingDown,
  PiggyBank,
  ScanSearch,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"

const TABS: Record<NavKey, string> = {
  dashboard: "Dashboard",
  briefs: "Client Briefs",
  factory: "Agent Factory",
  roi: "ROI Optimizer",
}

/* -------------------------------------------------------------------------- */
/*  Agent definitions — the ordered sequence the state machine walks through.  */
/* -------------------------------------------------------------------------- */

type AgentKey = "ingestion" | "copywriting" | "reviewer"
type AgentStatus = "Idle" | "Running" | "Success"

interface AgentDef {
  key: AgentKey
  label: string
  icon: LucideIcon
}

const AGENTS: AgentDef[] = [
  { key: "ingestion", label: "Ingestion & Strategy", icon: Compass },
  { key: "copywriting", label: "Copywriting", icon: PenTool },
  { key: "reviewer", label: "Reviewer & Financial", icon: ShieldCheck },
]

/* -------------------------------------------------------------------------- */
/*  Demo scenarios — pick one before launching to give the pipeline a brief.   */
/* -------------------------------------------------------------------------- */

type ScenarioId = "ecostride" | "flowstate"

interface AgentScript {
  /** Logged the moment the agent starts running. */
  run: string
  /** Logged the moment the agent reaches Success. */
  done: string
}

interface Scenario {
  id: ScenarioId
  name: string
  type: string
  icon: LucideIcon
  brief: {
    audience: string
    budget: string
    goals: string
  }
  /** Scenario-specific terminal output, per agent. */
  script: Record<AgentKey, AgentScript>
  /** Financial outcomes the metrics animate to once the pipeline completes. */
  targets: { hoursSaved: number; marginDelta: number }
}

const SCENARIOS: Scenario[] = [
  {
    id: "ecostride",
    name: "EcoStride",
    type: "D2C Sustainable Sneakers Launch",
    icon: Leaf,
    brief: {
      audience: "Eco-conscious millennials & Gen-Z, urban, 24–38",
      budget: "$45K · 6-week launch sprint",
      goals: "Drive 8,000 pre-orders & build brand trust",
    },
    script: {
      ingestion: {
        run: "Agent 1: Analyzing Instagram demographic data for sustainable footwear...",
        done: "Agent 1: Identified 3 high-intent eco audience clusters.",
      },
      copywriting: {
        run: "Agent 2: Crafting green-empathy ad hooks...",
        done: "Agent 2: 12 sustainability-led copy variants ready.",
      },
      reviewer: {
        run: "Agent 3: Modeling pre-order CAC vs. lifetime value...",
        done: "Agent 3: Blended ROAS validated at 3.4×.",
      },
    },
    targets: { hoursSaved: 42, marginDelta: 18 },
  },
  {
    id: "flowstate",
    name: "FlowState",
    type: "B2B SaaS Lead Generation",
    icon: Briefcase,
    brief: {
      audience: "Mid-market CMOs & VP Marketing, 200–2,000 employees",
      budget: "$30K / quarter · outbound-led",
      goals: "Book 120 qualified demos this quarter",
    },
    script: {
      ingestion: {
        run: "Agent 1: Scraping LinkedIn CMO profiles...",
        done: "Agent 1: 1,450 ICP-matched accounts enriched.",
      },
      copywriting: {
        run: "Agent 2: Writing high-converting cold email sequences...",
        done: "Agent 2: 5-touch outbound cadence drafted.",
      },
      reviewer: {
        run: "Agent 3: Forecasting pipeline value & demo conversion...",
        done: "Agent 3: Projected $480K pipeline at a 22% reply rate.",
      },
    },
    targets: { hoursSaved: 58, marginDelta: 24 },
  },
]

/** Each agent's badge stays "Running" for this long before advancing. */
const STEP_DURATION_MS = 2000

/* -------------------------------------------------------------------------- */
/*  State machine                                                             */
/* -------------------------------------------------------------------------- */

type Phase = "idle" | "running" | "complete"
type LogTone = "system" | "info" | "success"

interface LogLine {
  id: number
  time: string
  text: string
  tone: LogTone
}

interface MachineState {
  phase: Phase
  /** Index of the currently-running agent, or -1 when idle/complete. */
  step: number
  statuses: Record<AgentKey, AgentStatus>
  logs: LogLine[]
  nextLogId: number
  launched: number
  shipped: number
  /** The scenario the active run is executing against. */
  scenario: Scenario | null
}

type Action = { type: "LAUNCH"; scenario: Scenario } | { type: "ADVANCE" }

const idleStatuses = (): Record<AgentKey, AgentStatus> => ({
  ingestion: "Idle",
  copywriting: "Idle",
  reviewer: "Idle",
})

const initialState: MachineState = {
  phase: "idle",
  step: -1,
  statuses: idleStatuses(),
  logs: [],
  nextLogId: 0,
  launched: 0,
  shipped: 0,
  scenario: null,
}

function timestamp() {
  return new Date().toLocaleTimeString("en-US", { hour12: false })
}

/** Append a log line, advancing the id sequence. */
function log(state: MachineState, text: string, tone: LogTone): MachineState {
  return {
    ...state,
    logs: [...state.logs, { id: state.nextLogId, time: timestamp(), text, tone }],
    nextLogId: state.nextLogId + 1,
  }
}

function reducer(state: MachineState, action: Action): MachineState {
  switch (action.type) {
    case "LAUNCH": {
      const { scenario } = action
      // Fresh run: reset statuses, clear the terminal, keep id sequence + counters.
      let next: MachineState = {
        ...initialState,
        nextLogId: state.nextLogId,
        launched: state.launched + 1,
        shipped: state.shipped,
        scenario,
      }
      next = log(
        next,
        `› Launching "${scenario.name}" — ${scenario.type}...`,
        "system",
      )

      const first = AGENTS[0]
      next = {
        ...next,
        phase: "running",
        step: 0,
        statuses: { ...next.statuses, [first.key]: "Running" },
      }
      return log(next, scenario.script[first.key].run, "info")
    }

    case "ADVANCE": {
      if (state.phase !== "running" || state.step < 0 || !state.scenario) return state

      const scenario = state.scenario
      const current = AGENTS[state.step]
      let next: MachineState = {
        ...state,
        statuses: { ...state.statuses, [current.key]: "Success" },
      }
      next = log(next, scenario.script[current.key].done, "success")

      const upcoming = AGENTS[state.step + 1]
      if (upcoming) {
        next = {
          ...next,
          step: state.step + 1,
          statuses: { ...next.statuses, [upcoming.key]: "Running" },
        }
        return log(next, scenario.script[upcoming.key].run, "info")
      }

      // No agent left → pipeline complete.
      next = { ...next, phase: "complete", step: -1, shipped: next.shipped + 1 }
      return log(next, "✓ Pipeline complete — crediting agency leverage.", "system")
    }

    default:
      return state
  }
}

/* -------------------------------------------------------------------------- */
/*  Count-up animation                                                        */
/* -------------------------------------------------------------------------- */

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }

    let frame = 0
    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      setValue(Math.round(target * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, active, duration])

  return value
}

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                 */
/* -------------------------------------------------------------------------- */

export function Dashboard() {
  const [active, setActive] = useState<NavKey>("dashboard")
  const [selectedId, setSelectedId] = useState<ScenarioId>(SCENARIOS[0].id)
  const [state, dispatch] = useReducer(reducer, initialState)

  const isRunning = state.phase === "running"
  const isComplete = state.phase === "complete"

  const selectedScenario = SCENARIOS.find((s) => s.id === selectedId) ?? SCENARIOS[0]

  // Drive the sequential transitions: each running agent advances after 2s.
  useEffect(() => {
    if (state.phase !== "running" || state.step < 0) return
    const timer = setTimeout(() => dispatch({ type: "ADVANCE" }), STEP_DURATION_MS)
    return () => clearTimeout(timer)
  }, [state.phase, state.step])

  // Animate the financial metrics once Agent 3 signs off — using the run's targets.
  const targets = state.scenario?.targets ?? selectedScenario.targets
  const hoursSaved = useCountUp(targets.hoursSaved, isComplete)
  const marginDelta = useCountUp(targets.marginDelta, isComplete)
  const leverageRatio = 1 + hoursSaved / 40

  // Keep the terminal pinned to its latest line.
  const logEndRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [state.logs])

  const launch = () => dispatch({ type: "LAUNCH", scenario: selectedScenario })

  const stats = {
    active: isRunning ? 1 : 0,
    total: state.launched,
    shipped: state.shipped,
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <div className="hidden md:block">
        <Sidebar active={active} onSelect={setActive} />
      </div>

      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{TABS[active]}</h1>
            <p className="text-sm text-muted-foreground">
              AI-native marketing operations, orchestrated end to end.
            </p>
          </div>
          <Button
            onClick={launch}
            disabled={isRunning}
            size="lg"
            className="h-11 gap-2 px-5 text-sm font-semibold shadow-lg shadow-primary/20"
          >
            <Rocket className="size-4.5" />
            {isRunning ? "Pipeline running..." : "Launch AI Campaign"}
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {active === "dashboard" ? (
            <div className="mx-auto flex max-w-6xl flex-col gap-6">
              {/* Demo scenario selector */}
              <section className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="flex size-5 items-center justify-center rounded-md bg-primary/15">
                      <Target className="size-3.5 text-primary" />
                    </span>
                    Demo Scenario
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Pick a brief, then launch the agents
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SCENARIOS.map((scenario) => {
                    const Icon = scenario.icon
                    const isSelected = scenario.id === selectedId
                    return (
                      <button
                        key={scenario.id}
                        onClick={() => setSelectedId(scenario.id)}
                        disabled={isRunning}
                        aria-pressed={isSelected}
                        className={[
                          "group flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                          "disabled:cursor-not-allowed disabled:opacity-60",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background/40 hover:border-primary/40 hover:bg-accent/40",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "flex size-10 items-center justify-center rounded-lg",
                            isSelected ? "bg-primary/20" : "bg-primary/10",
                          ].join(" ")}
                        >
                          <Icon className="size-5 text-primary" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-card-foreground">
                            {scenario.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {scenario.type}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="size-4 shrink-0 text-primary" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Client brief summary */}
                <div className="mt-4 rounded-lg border border-border bg-background/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Client Brief
                    </span>
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                      {selectedScenario.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <BriefItem
                      icon={Users}
                      label="Target Audience"
                      value={selectedScenario.brief.audience}
                    />
                    <BriefItem
                      icon={Wallet}
                      label="Budget"
                      value={selectedScenario.brief.budget}
                    />
                    <BriefItem
                      icon={Flag}
                      label="Goals"
                      value={selectedScenario.brief.goals}
                    />
                  </div>
                </div>
              </section>

              {/* Stat strip */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile icon={Activity} label="Active Pipelines" value={stats.active} accent />
                <StatTile icon={Layers} label="Total Campaigns" value={stats.total} />
                <StatTile icon={CheckCircle2} label="Shipped" value={stats.shipped} />
                <StatTile icon={Cpu} label="Agents Online" value={3} />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Pipeline + terminal */}
                <section className="flex flex-col gap-4 lg:col-span-2">
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="flex size-5 items-center justify-center rounded-md bg-primary/15">
                          <Activity className="size-3.5 text-primary" />
                        </span>
                        Multi-Agent Pipeline
                      </h2>
                      <PhaseTag phase={state.phase} />
                    </div>

                    <div className="flex flex-col gap-3">
                      {AGENTS.map((agent) => {
                        const status = state.statuses[agent.key]
                        const script = (state.scenario ?? selectedScenario).script[agent.key]
                        const subtitle =
                          status === "Running"
                            ? script.run
                            : status === "Success"
                              ? script.done
                              : "Queued"
                        const Icon = agent.icon
                        return (
                          <div
                            key={agent.key}
                            className="flex items-center gap-3 rounded-lg border border-border bg-background/40 p-3"
                          >
                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
                              <Icon className="size-4.5 text-primary" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-card-foreground">{agent.label}</p>
                              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
                            </div>
                            <StatusBadge status={status} />
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Real-time agent terminal */}
                  <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                      <Terminal className="size-4 text-primary" />
                      <span className="text-xs font-medium text-card-foreground">Agent activity log</span>
                      <span className="ml-auto flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-destructive/60" />
                        <span className="size-2 rounded-full bg-warning/70" />
                        <span className="size-2 rounded-full bg-success/70" />
                      </span>
                    </div>
                    <div className="h-56 overflow-y-auto bg-background/60 p-4 font-mono text-xs leading-relaxed">
                      {state.logs.length === 0 ? (
                        <p className="text-muted-foreground">
                          Awaiting launch — &ldquo;{selectedScenario.name}&rdquo; brief loaded. Click
                          &ldquo;Launch AI Campaign&rdquo; to start the pipeline.
                        </p>
                      ) : (
                        state.logs.map((line) => (
                          <div key={line.id} className="flex gap-3">
                            <span className="shrink-0 text-muted-foreground/60 tabular-nums">
                              {line.time}
                            </span>
                            <span className={logToneClass(line.tone)}>{line.text}</span>
                          </div>
                        ))
                      )}
                      {isRunning && (
                        <span className="mt-1 inline-block animate-pulse text-primary">▋</span>
                      )}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                </section>

                {/* Financial sidebar */}
                <div className="flex flex-col gap-6">
                  <LeverageCard
                    hoursSaved={hoursSaved}
                    marginDelta={marginDelta}
                    leverageRatio={leverageRatio}
                  />
                  <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold text-card-foreground">How leverage compounds</h3>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Each launch drives the three sequential agents — Ingestion &amp; Strategy,
                      Copywriting, then Reviewer &amp; Financial. When the final agent signs off,
                      reclaimed hours and client margin are credited automatically to your leverage
                      ratio.
                    </p>
                    <Button
                      onClick={launch}
                      disabled={isRunning}
                      variant="outline"
                      size="sm"
                      className="mt-4 w-full gap-2"
                    >
                      <Rocket className="size-4" />
                      {isRunning ? "Running..." : "Launch another"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : active === "briefs" ? (
            <BriefsPanel />
          ) : active === "factory" ? (
            <FactoryPanel />
          ) : (
            <RoiPanel />
          )}
        </div>
      </main>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Presentational helpers                                                    */
/* -------------------------------------------------------------------------- */

function logToneClass(tone: LogTone) {
  switch (tone) {
    case "success":
      return "text-success"
    case "system":
      return "text-primary"
    default:
      return "text-foreground"
  }
}

function BriefItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-accent/40 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-card-foreground">{value}</p>
    </div>
  )
}

function PhaseTag({ phase }: { phase: Phase }) {
  const map: Record<Phase, { label: string; className: string }> = {
    idle: { label: "Idle", className: "bg-muted text-muted-foreground" },
    running: { label: "Running", className: "bg-primary/15 text-primary" },
    complete: { label: "Shipped", className: "bg-success/15 text-success" },
  }
  const { label, className } = map[phase]
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>
}

function StatusBadge({ status }: { status: AgentStatus }) {
  if (status === "Success") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="size-3.5" />
        Success
      </span>
    )
  }
  if (status === "Running") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
        <Loader2 className="size-3.5 animate-spin" />
        Running
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
      <Circle className="size-3.5" />
      Idle
    </span>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={accent ? "size-4 text-primary" : "size-4"} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold text-card-foreground tabular-nums">{value}</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Client Briefs panel                                                       */
/* -------------------------------------------------------------------------- */

type BriefStatus = "Ready" | "In Review" | "Queued" | "Draft"

interface BriefRow {
  client: string
  sector: string
  budget: string
  status: BriefStatus
}

const BRIEFS: BriefRow[] = [
  { client: "EcoStride", sector: "Sustainable Retail", budget: "$45,000", status: "Ready" },
  { client: "FlowState", sector: "B2B SaaS", budget: "$30,000", status: "In Review" },
  { client: "Northwind Coffee", sector: "F&B · D2C", budget: "$22,000", status: "Queued" },
  { client: "Vantix Health", sector: "Healthtech", budget: "$68,000", status: "Ready" },
  { client: "Lumen Fitness", sector: "Wellness", budget: "$18,000", status: "Draft" },
]

const BRIEF_STATUS_STYLES: Record<BriefStatus, string> = {
  Ready: "bg-success/15 text-success",
  "In Review": "bg-primary/15 text-primary",
  Queued: "bg-muted text-muted-foreground",
  Draft: "bg-warning/15 text-warning",
}

function BriefsPanel() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Client Briefs</h2>
          <p className="text-sm text-muted-foreground">
            Every brief routed into the multi-agent pipeline.
          </p>
        </div>
        <Button size="lg" className="h-11 gap-2 px-5 text-sm font-semibold shadow-lg shadow-primary/20">
          <Upload className="size-4.5" />
          Upload New Brief
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Client</th>
                <th className="px-5 py-3">Sector</th>
                <th className="px-5 py-3">Budget</th>
                <th className="px-5 py-3">AI Status</th>
              </tr>
            </thead>
            <tbody>
              {BRIEFS.map((brief) => (
                <tr
                  key={brief.client}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/30"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-xs font-semibold text-primary">
                        {brief.client.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="font-medium text-card-foreground">{brief.client}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{brief.sector}</td>
                  <td className="px-5 py-4 font-mono text-card-foreground tabular-nums">
                    {brief.budget}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${BRIEF_STATUS_STYLES[brief.status]}`}
                    >
                      {brief.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Agent Factory panel                                                       */
/* -------------------------------------------------------------------------- */

interface FactoryAgent {
  id: string
  name: string
  role: string
  icon: LucideIcon
  model: string
  successRate: number
  defaultOn: boolean
}

const FACTORY_AGENTS: FactoryAgent[] = [
  {
    id: "strategy",
    name: "Strategy Lead",
    role: "Audience research & campaign planning",
    icon: Compass,
    model: "Claude 3.5 Sonnet",
    successRate: 98.4,
    defaultOn: true,
  },
  {
    id: "copy",
    name: "Ad Copy Architect",
    role: "High-converting copy & creative hooks",
    icon: PenTool,
    model: "GPT-4o",
    successRate: 96.1,
    defaultOn: true,
  },
  {
    id: "compliance",
    name: "Compliance Auditor",
    role: "Brand safety & legal review",
    icon: ShieldCheck,
    model: "Claude 3.5 Sonnet",
    successRate: 99.2,
    defaultOn: true,
  },
  {
    id: "audience",
    name: "Audience Miner",
    role: "ICP enrichment & segment discovery",
    icon: ScanSearch,
    model: "GPT-4o",
    successRate: 94.7,
    defaultOn: false,
  },
  {
    id: "analyst",
    name: "Performance Analyst",
    role: "Unit economics & ROAS forecasting",
    icon: Activity,
    model: "Claude 3.5 Sonnet",
    successRate: 97.3,
    defaultOn: true,
  },
  {
    id: "optimizer",
    name: "Budget Optimizer",
    role: "Spend allocation across channels",
    icon: Target,
    model: "GPT-4o",
    successRate: 95.8,
    defaultOn: false,
  },
]

function FactoryPanel() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(FACTORY_AGENTS.map((a) => [a.id, a.defaultOn])),
  )

  const onlineCount = Object.values(enabled).filter(Boolean).length

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Agent Factory</h2>
          <p className="text-sm text-muted-foreground">
            Configure the autonomous agents powering your campaigns.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-success/15 px-3 py-1.5 text-xs font-medium text-success">
          <span className="size-2 rounded-full bg-success" />
          {onlineCount} of {FACTORY_AGENTS.length} agents online
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FACTORY_AGENTS.map((agent) => {
          const Icon = agent.icon
          const isOn = enabled[agent.id]
          return (
            <div key={agent.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15">
                  <Icon className="size-5 text-primary" />
                </span>
                <Switch
                  on={isOn}
                  onToggle={() => setEnabled((prev) => ({ ...prev, [agent.id]: !prev[agent.id] }))}
                />
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-card-foreground">{agent.name}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{agent.role}</p>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/60 px-2.5 py-1 text-xs font-medium text-card-foreground">
                  <Cpu className="size-3" />
                  {agent.model}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isOn ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}
                >
                  <Power className="size-3" />
                  {isOn ? "On" : "Off"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-muted-foreground">Success rate</span>
                <span className="font-mono text-sm font-semibold text-success tabular-nums">
                  {agent.successRate.toFixed(1)}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
    >
      <span
        className={`inline-block size-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  )
}

/* -------------------------------------------------------------------------- */
/*  ROI Optimizer panel                                                       */
/* -------------------------------------------------------------------------- */

const ROI = {
  headcountMonthly: 48000,
  computeMonthly: 3200,
}

const ROI_BREAKDOWN: { role: string; human: number; ai: number }[] = [
  { role: "Senior Strategist", human: 12000, ai: 900 },
  { role: "Copywriting Team", human: 14000, ai: 800 },
  { role: "Compliance Reviewer", human: 9000, ai: 600 },
  { role: "Performance Analyst", human: 13000, ai: 900 },
]

function currency(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  })
}

function RoiPanel() {
  const netMonthly = ROI.headcountMonthly - ROI.computeMonthly
  const netAnnual = netMonthly * 12
  const reduction = Math.round((netMonthly / ROI.headcountMonthly) * 100)
  const aiWidth = Math.round((ROI.computeMonthly / ROI.headcountMonthly) * 100)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">ROI Optimizer</h2>
        <p className="text-sm text-muted-foreground">
          Traditional headcount versus the AI-native operating model.
        </p>
      </div>

      {/* Headline comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RoiTile
          icon={Users}
          label="Traditional Headcount Cost"
          value={currency(ROI.headcountMonthly)}
          suffix="/ mo"
          tone="muted"
        />
        <RoiTile
          icon={Cpu}
          label="AI Compute Cost"
          value={currency(ROI.computeMonthly)}
          suffix="/ mo"
          tone="primary"
        />
        <RoiTile
          icon={PiggyBank}
          label="Net Monthly Savings"
          value={currency(netMonthly)}
          suffix="/ mo"
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cost breakdown */}
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex size-5 items-center justify-center rounded-md bg-primary/15">
              <Banknote className="size-3.5 text-primary" />
            </span>
            Cost breakdown by function
          </h3>

          <div className="mt-5 flex flex-col gap-5">
            {ROI_BREAKDOWN.map((row) => {
              const ratio = Math.round((row.ai / row.human) * 100)
              return (
                <div key={row.role}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-card-foreground">{row.role}</span>
                    <span className="flex items-center gap-2 font-mono tabular-nums">
                      <span className="text-muted-foreground line-through">{currency(row.human)}</span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="font-semibold text-success">{currency(row.ai)}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Net gain card */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-md bg-success/15">
                <TrendingDown className="size-3.5 text-success" />
              </span>
              <h3 className="text-sm font-semibold text-card-foreground">Estimated agency gain</h3>
            </div>

            <div className="mt-4">
              <p className="font-mono text-3xl font-semibold text-success tabular-nums">
                {currency(netAnnual)}
              </p>
              <p className="text-xs text-muted-foreground">Projected savings / year</p>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2.5">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <TrendingDown className="size-4" />
                  Cost reduction
                </span>
                <span className="font-mono text-sm font-semibold text-success tabular-nums">
                  −{reduction}%
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2.5">
                <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <DollarSign className="size-4" />
                  AI share of spend
                </span>
                <span className="font-mono text-sm font-semibold text-card-foreground tabular-nums">
                  {aiWidth}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoiTile({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  suffix: string
  tone: "muted" | "primary" | "success"
}) {
  const valueTone =
    tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-card-foreground"
  const iconTone =
    tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-muted-foreground"
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={`size-4 ${iconTone}`} />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-3 flex items-baseline gap-1">
        <span className={`font-mono text-2xl font-semibold tabular-nums ${valueTone}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{suffix}</span>
      </p>
    </div>
  )
}
