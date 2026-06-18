import { NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

/**
 * Campaign orchestration route — `POST /api/campaign/run`
 * ----------------------------------------------------------------------------
 * Runs a client brief through the three-agent pipeline used across Metalyde:
 *   Agent 1 — Ingestion & Strategy
 *   Agent 2 — Copywriting        (depends on Agent 1)
 *   Agent 3 — Reviewer & Financial (depends on Agents 1 & 2)
 *
 * HYBRID by design:
 *   • Default                       → returns a fully-structured MOCK payload.
 *     No network call, no cost — the demo always works out of the box.
 *   • USE_LIVE_AGENT=true (+ key)   → runs the real agent chain against the
 *     Anthropic Messages API and returns the SAME payload shape.
 *
 * Live mode is behind an explicit flag (not just key presence) so a key in the
 * environment never triggers paid calls by accident.
 *
 * The response contract is identical in both modes (only `metadata.mode`
 * differs), so the UI never has to care which path executed. The dashboard
 * doesn't call this yet — its terminal is driven by a local state machine.
 *
 * Requires the Node.js runtime for the Anthropic SDK; never cached.
 */
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* -------------------------------------------------------------------------- */
/*  Request / response contract                                               */
/* -------------------------------------------------------------------------- */

type ScenarioId = "ecostride" | "flowstate"

interface CampaignRequest {
  scenarioId: ScenarioId
  clientBrief: {
    targetAudience: string
    budget: string
    goals: string
  }
}

interface AgentResult {
  status: "completed" | "failed"
  executionTimeMs: number
  rawOutput: string
}

interface CampaignResponse {
  success: true
  timestamp: string
  metadata: {
    orchestrator: string
    mode: "mock" | "live"
    model: string
    totalTokensUsed: number
  }
  pipelineResults: {
    agent_1_strategy: AgentResult
    agent_2_copywriting: AgentResult
    agent_3_reviewer: AgentResult
  }
  computedMetrics: {
    hoursSaved: number
    marginDelta: number
  }
}

const ORCHESTRATOR = "Metalyde-OS-Engine-v1"
const MODEL = process.env.METALYDE_AGENT_MODEL ?? "claude-sonnet-4-6"

/* -------------------------------------------------------------------------- */
/*  Route handler                                                             */
/* -------------------------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CampaignRequest>

    // Validate shape, types and the scenario enum — not just presence.
    const error = validate(body)
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }
    const { scenarioId, clientBrief } = body as CampaignRequest

    // Live path requires an explicit opt-in flag AND a key — otherwise the
    // deterministic, zero-cost mock runs.
    const useLiveAgent = process.env.USE_LIVE_AGENT === "true"
    if (useLiveAgent && !process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "USE_LIVE_AGENT is true but ANTHROPIC_API_KEY is missing." },
        { status: 500 },
      )
    }

    const payload = useLiveAgent
      ? await runLivePipeline(scenarioId, clientBrief)
      : await runMockPipeline(scenarioId, clientBrief)

    return NextResponse.json(payload, { status: 200 })
  } catch (err) {
    console.error("[Metalyde Pipeline Error]:", err)
    return NextResponse.json(
      { success: false, error: "Internal Server Error during agent orchestration." },
      { status: 500 },
    )
  }
}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

function validate(body: Partial<CampaignRequest>): string | null {
  if (!body || typeof body !== "object") return "Invalid request body."
  if (body.scenarioId !== "ecostride" && body.scenarioId !== "flowstate") {
    return "Field 'scenarioId' must be 'ecostride' or 'flowstate'."
  }
  const b = body.clientBrief
  if (
    !b ||
    typeof b.targetAudience !== "string" ||
    typeof b.budget !== "string" ||
    typeof b.goals !== "string"
  ) {
    return "Field 'clientBrief' must include targetAudience, budget and goals (strings)."
  }
  return null
}

/* -------------------------------------------------------------------------- */
/*  Mock pipeline — scenario-aware, no API key required                       */
/* -------------------------------------------------------------------------- */

interface ScenarioScript {
  strategy: string
  copywriting: (brief: CampaignRequest["clientBrief"]) => string
  reviewer: (brief: CampaignRequest["clientBrief"]) => string
  hoursSaved: number
  marginDelta: number
}

/**
 * Outputs are branched per scenario so the mock is indistinguishable from a
 * real run — e.g. FlowState never talks about "eco-empathy".
 */
const SCENARIO_SCRIPTS: Record<ScenarioId, ScenarioScript> = {
  ecostride: {
    strategy:
      "Market positioning generated for EcoStride. 3 audience clusters ranked: " +
      "urban eco-millennials, conscious Gen-Z, premium sustainable runners. " +
      "Channel matrix: Paid Meta + Organic TikTok + creator seeding.",
    copywriting: () =>
      "5 high-converting hooks written from the strategy. Angle: green-empathy " +
      'with proof-of-impact. Lead hook: "Run lighter — on your feet and on the planet."',
    reviewer: (brief) =>
      `Unit economics validated against goal "${brief.goals}". Budget of ` +
      `${brief.budget} optimized for maximum operating leverage; blended ROAS modeled at 3.4×.`,
    hoursSaved: 42,
    marginDelta: 18,
  },
  flowstate: {
    strategy:
      "Market positioning generated for FlowState. 3 ICP clusters ranked: " +
      "mid-market CMOs, VP Marketing, RevOps leads. " +
      "Channel matrix: LinkedIn ABM + outbound email + intent retargeting.",
    copywriting: () =>
      "5-touch cold email cadence drafted from the strategy. Angle: pipeline " +
      'velocity vs. cost-per-demo. Lead subject: "Book 120 demos without hiring more SDRs."',
    reviewer: (brief) =>
      `Unit economics validated against goal "${brief.goals}". Budget of ` +
      `${brief.budget} optimized for maximum operating leverage; projected $480K pipeline at a 22% reply rate.`,
    hoursSaved: 58,
    marginDelta: 24,
  },
}

async function runMockPipeline(
  scenarioId: ScenarioId,
  clientBrief: CampaignRequest["clientBrief"],
): Promise<CampaignResponse> {
  const script = SCENARIO_SCRIPTS[scenarioId]

  // Simulate sequential agent latency so loading states and the reported
  // executionTimeMs values stay coherent.
  const t1 = await timed(1400, () => script.strategy)
  const t2 = await timed(1800, () => script.copywriting(clientBrief))
  const t3 = await timed(1100, () => script.reviewer(clientBrief))

  return {
    success: true,
    timestamp: new Date().toISOString(),
    metadata: {
      orchestrator: ORCHESTRATOR,
      mode: "mock",
      model: MODEL,
      totalTokensUsed: 4250,
    },
    pipelineResults: {
      agent_1_strategy: result(t1.ms, t1.value),
      agent_2_copywriting: result(t2.ms, t2.value),
      agent_3_reviewer: result(t3.ms, t3.value),
    },
    computedMetrics: {
      hoursSaved: script.hoursSaved,
      marginDelta: script.marginDelta,
    },
  }
}

/* -------------------------------------------------------------------------- */
/*  Live pipeline — real Anthropic calls, same response shape                 */
/* -------------------------------------------------------------------------- */

async function runLivePipeline(
  scenarioId: ScenarioId,
  clientBrief: CampaignRequest["clientBrief"],
): Promise<CampaignResponse> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let totalTokens = 0

  const call = async (system: string, prompt: string) => {
    const start = Date.now()
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    })
    totalTokens += msg.usage.input_tokens + msg.usage.output_tokens
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
    return { ms: Date.now() - start, value: text }
  }

  const briefBlock =
    `Client scenario: ${scenarioId}\n` +
    `Target audience: ${clientBrief.targetAudience}\n` +
    `Budget: ${clientBrief.budget}\n` +
    `Goals: ${clientBrief.goals}`

  // Agent 1 — Strategy.
  const a1 = await call(
    "You are the Ingestion & Strategy agent inside Metalyde, an AI OS for " +
      "marketing agencies. Produce a concise, decision-ready strategy: 3 ranked " +
      "audience clusters, positioning angle and a channel matrix. No preamble.",
    `${briefBlock}\n\nDeliver the strategy brief.`,
  )

  // Agent 2 — Copywriting (depends on Agent 1).
  const a2 = await call(
    "You are the Copywriting agent inside Metalyde. Turn the upstream strategy " +
      "into ready-to-ship copy: 5 hooks + 2 primary-text variants mapped to the " +
      "audience clusters. Output only the copy.",
    `${briefBlock}\n\nStrategy:\n${a1.value}\n\nWrite the campaign copy.`,
  )

  // Agent 3 — Reviewer & Financial (depends on Agents 1 & 2).
  const a3 = await call(
    "You are the Reviewer & Financial agent inside Metalyde. Review the strategy " +
      "and copy for brand safety and on-brief fit, then estimate the leverage vs. " +
      "a human team. End your reply with a line of EXACT form: " +
      "METRICS={\"hoursSaved\":<int>,\"marginDelta\":<int>}",
    `${briefBlock}\n\nStrategy:\n${a1.value}\n\nCopy:\n${a2.value}\n\nReview and sign off.`,
  )

  const metrics = parseMetrics(a3.value, scenarioId)

  return {
    success: true,
    timestamp: new Date().toISOString(),
    metadata: {
      orchestrator: ORCHESTRATOR,
      mode: "live",
      model: MODEL,
      totalTokensUsed: totalTokens,
    },
    pipelineResults: {
      agent_1_strategy: result(a1.ms, a1.value),
      agent_2_copywriting: result(a2.ms, a2.value),
      agent_3_reviewer: result(a3.ms, a3.value),
    },
    computedMetrics: metrics,
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function result(executionTimeMs: number, rawOutput: string): AgentResult {
  return { status: "completed", executionTimeMs, rawOutput }
}

async function timed<T>(ms: number, fn: () => T): Promise<{ ms: number; value: T }> {
  await new Promise((r) => setTimeout(r, ms))
  return { ms, value: fn() }
}

/** Pull the trailing METRICS={…} line from the reviewer, with scenario fallback. */
function parseMetrics(
  raw: string,
  scenarioId: ScenarioId,
): { hoursSaved: number; marginDelta: number } {
  const fallback = {
    hoursSaved: SCENARIO_SCRIPTS[scenarioId].hoursSaved,
    marginDelta: SCENARIO_SCRIPTS[scenarioId].marginDelta,
  }
  const match = raw.match(/METRICS=(\{[\s\S]*?\})/)
  if (!match) return fallback
  try {
    const parsed = JSON.parse(match[1]) as Partial<typeof fallback>
    return {
      hoursSaved:
        typeof parsed.hoursSaved === "number" ? parsed.hoursSaved : fallback.hoursSaved,
      marginDelta:
        typeof parsed.marginDelta === "number" ? parsed.marginDelta : fallback.marginDelta,
    }
  } catch {
    return fallback
  }
}
