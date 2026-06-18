import { Clock, TrendingUp, Gauge } from "lucide-react"

interface LeverageCardProps {
  hoursSaved: number
  marginDelta: number
  leverageRatio: number
}

export function LeverageCard({ hoursSaved, marginDelta, leverageRatio }: LeverageCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-md bg-primary/15">
          <Gauge className="size-3.5 text-primary" />
        </span>
        <h3 className="text-sm font-semibold text-card-foreground">Agency Leverage</h3>
      </div>

      {/* Headline ratio */}
      <div className="mt-4">
        <p className="font-mono text-3xl font-semibold text-card-foreground tabular-nums">
          {leverageRatio.toFixed(2)}×
        </p>
        <p className="text-xs text-muted-foreground">Output per human hour</p>
      </div>

      {/* Metrics */}
      <div className="mt-5 flex flex-col gap-3">
        <Metric
          icon={Clock}
          label="Hours reclaimed"
          value={`${hoursSaved}h`}
        />
        <Metric
          icon={TrendingUp}
          label="Client margin"
          value={`+${marginDelta}%`}
        />
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-accent/40 px-3 py-2.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="font-mono text-sm font-semibold text-card-foreground tabular-nums">{value}</span>
    </div>
  )
}
