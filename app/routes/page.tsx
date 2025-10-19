"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoutesGrid } from "@/components/routes/routes-grid"
import { RouteOptimizationPanel } from "@/components/routes/route-optimization-panel"
import { useState } from "react"

export default function RoutesPage() {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  return (
    <DashboardLayout>
      <div className="space-y-4 h-full flex flex-col">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Route Optimization</h1>
          <p className="text-muted-foreground mt-1">Optimize traffic routes and reduce congestion</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-auto">
          <div className="lg:col-span-2 overflow-auto">
            <RoutesGrid selectedRoute={selectedRoute} onSelectRoute={setSelectedRoute} />
          </div>
          <div className="overflow-auto">
            <RouteOptimizationPanel selectedRoute={selectedRoute} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
