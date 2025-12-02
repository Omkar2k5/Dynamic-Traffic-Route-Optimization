"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RoutesGrid } from "@/components/routes/routes-grid"
import { RouteOptimizationPanel } from "@/components/routes/route-optimization-panel"
import { DelayedRoutesMap } from "@/components/routes/delayed-routes-map"
import { useState } from "react"

export default function RoutesPage() {
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null)

  return (
    <DashboardLayout>
      <div className="space-y-4 h-full flex flex-col">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Delayed Routes</h1>
          <p className="text-muted-foreground mt-1">
            Monitor delayed routes within 10km and discover bypass alternatives
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 flex-1 overflow-auto">
          {/* Map - Left Column */}
          <div className="xl:col-span-2 overflow-auto">
            <DelayedRoutesMap 
              selectedRoute={selectedRoute}
              onRouteSelect={setSelectedRoute}
              radius={10}
            />
          </div>

          {/* Routes Grid - Middle Column */}
          <div className="xl:col-span-1 overflow-auto">
            <RoutesGrid selectedRoute={selectedRoute} onSelectRoute={setSelectedRoute} />
          </div>

          {/* Optimization Panel - Right Column */}
          <div className="xl:col-span-1 overflow-auto">
            <RouteOptimizationPanel selectedRoute={selectedRoute} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
