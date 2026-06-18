"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FileText,
  Factory,
  TrendingUp,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

export type NavKey = "dashboard" | "briefs" | "factory" | "roi"

interface NavItem {
  key: NavKey
  label: string
  icon: LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "briefs", label: "Client Briefs", icon: FileText },
  { key: "factory", label: "Agent Factory", icon: Factory },
  { key: "roi", label: "ROI Optimizer", icon: TrendingUp },
]

interface SidebarProps {
  active: NavKey
  onSelect: (key: NavKey) => void
}

export function Sidebar({ active, onSelect }: SidebarProps) {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex h-20 items-center gap-3 border-b border-border px-5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/15">
          <Sparkles className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-card-foreground">Metalyde</p>
          <p className="text-xs text-muted-foreground">Agency OS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active
          const Icon = item.icon
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-accent/50 p-3">
          <p className="text-xs font-medium text-card-foreground">3 agents online</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Strategy · Creative · Reviewer
          </p>
        </div>
      </div>
    </aside>
  )
}
