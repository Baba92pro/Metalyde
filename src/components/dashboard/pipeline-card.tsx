import { cn } from "@/lib/utils"
import { AGENTS, type AgentStatus, type Campaign } from "@/lib/pipeline"
import { CheckCircle2, Loader2, Circle } from "lucide-react"

const STATUS_STYLES: Record<AgentStatus, string> = {
  Idle: "text-muted-foreground",
  Running: "text-primary",
  Success: "text-success",
}

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "Success") return <CheckCircle2 className="size-4 text-success" />
  if (status === "Running") return <Loader2 className="size-4 animate-spin text-primary" />
  return <Circle className="size-4 text-muted-foreground" />
}

export function PipelineCard({ campaign }: { campaign: Campaign }) {
  const done = AGENTS.every((a) => campaign.agents[a.key].status === "Success")

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">{campaign.name}</h3>
          <p className="text-xs text-muted-foreground">{campaign.client}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            done ? "bg-success/15 text-success" : "bg-primary/15 text-primary",
          )}
        >
          {done ? "Shipped" : "In progress"}
        </span>
      </div>

      {/* Agents */}
      <div className="mt-4 flex flex-col gap-3">
        {AGENTS.map((agent) => {
          const state = campaign.agents[agent.key]
          return (
            <div key={agent.key} className="flex items-center gap-3">
              <StatusIcon status={state.status} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium text-card-foreground">{agent.name}</p>
                  <span
                    className={cn(
                      "font-mono text-xs tabular-nums",
                      STATUS_STYLES[state.status],
                    )}
                  >
                    {state.status === "Idle" ? "—" : `${state.progress}%`}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      state.status === "Success" ? "bg-success" : "bg-primary",
                    )}
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
