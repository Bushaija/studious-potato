"use client"

import { Percent, Building } from "lucide-react"
import { StatCard } from "./StatCard"

export interface DashboardStatsProps {
  executedCount?: number
  facilityId?: number
}

export function DashboardStats() {
  

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StatCard
        title="Facilities Executed"
        value={`${0}/${17}`}
        icon={<Building className="h-4 w-4 text-muted-foreground" />}
      />

      <StatCard
        title="Execution Rate"
        value={`${0.00}%`}
        icon={<Percent className="h-4 w-4 text-muted-foreground" />}
      />
    </div>
  )
} 