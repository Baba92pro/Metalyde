import type { LucideIcon } from "lucide-react"
import { Compass, PenTool, ShieldCheck } from "lucide-react"

/**
 * The marketing OS runs every campaign through the same three sequential
 * agents. Each agent must reach "Success" before the next one starts, so the
 * pipeline always advances left-to-right.
 */
export type AgentKey = "strategist" | "creative" | "reviewer"

export type AgentStatus = "Idle" | "Running" | "Success"

export interface AgentDefinition {
  key: AgentKey
  name: string
  role: string
  icon: LucideIcon
}

export interface AgentState {
  status: AgentStatus
  progress: number
}

export interface Campaign {
  id: string
  name: string
  client: string
  agents: Record<AgentKey, AgentState>
}

/** Ordered list of agents — order defines the execution sequence. */
export const AGENTS: AgentDefinition[] = [
  {
    key: "strategist",
    name: "Strategy Agent",
    role: "Audience, positioning & channel plan",
    icon: Compass,
  },
  {
    key: "creative",
    name: "Creative Agent",
    role: "Copy, assets & variant generation",
    icon: PenTool,
  },
  {
    key: "reviewer",
    name: "Reviewer & Financial Agent",
    role: "QA, brand safety & margin sign-off",
    icon: ShieldCheck,
  },
]

const CLIENT_NAMES = [
  "Northwind Retail",
  "Lumen Skincare",
  "Atlas Fintech",
  "Verdant Foods",
  "Helio Travel",
  "Pulse Fitness",
  "Cobalt SaaS",
  "Maison Lumière",
]

const CAMPAIGN_THEMES = [
  "Spring Launch",
  "Black Friday Push",
  "Brand Refresh",
  "Lead-Gen Sprint",
  "Product Teardown",
  "Always-On Social",
  "Lifecycle Revamp",
  "Q3 Demand Gen",
]

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/** A fresh campaign always starts with the first agent running. */
function freshAgents(): Record<AgentKey, AgentState> {
  return {
    strategist: { status: "Running", progress: 0 },
    creative: { status: "Idle", progress: 0 },
    reviewer: { status: "Idle", progress: 0 },
  }
}

let campaignCounter = 0

export function createCampaign(): Campaign {
  campaignCounter += 1
  return {
    id: `cmp_${Date.now()}_${campaignCounter}`,
    name: pick(CAMPAIGN_THEMES),
    client: pick(CLIENT_NAMES),
    agents: freshAgents(),
  }
}

/** Seeded campaigns shown on first load, captured at different stages. */
export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: "cmp_seed_1",
    name: "Spring Launch",
    client: "Northwind Retail",
    agents: {
      strategist: { status: "Success", progress: 100 },
      creative: { status: "Running", progress: 42 },
      reviewer: { status: "Idle", progress: 0 },
    },
  },
  {
    id: "cmp_seed_2",
    name: "Lead-Gen Sprint",
    client: "Atlas Fintech",
    agents: {
      strategist: { status: "Success", progress: 100 },
      creative: { status: "Success", progress: 100 },
      reviewer: { status: "Running", progress: 68 },
    },
  },
  {
    id: "cmp_seed_3",
    name: "Brand Refresh",
    client: "Lumen Skincare",
    agents: {
      strategist: { status: "Running", progress: 15 },
      creative: { status: "Idle", progress: 0 },
      reviewer: { status: "Idle", progress: 0 },
    },
  },
]
