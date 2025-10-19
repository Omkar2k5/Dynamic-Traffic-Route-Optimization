import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MapContainer } from "@/components/map/map-container"
import { StatsOverview } from "@/components/dashboard/stats-overview"
import { IncidentsPanel } from "@/components/dashboard/incidents-panel"
import { AlertsPanel } from "@/components/dashboard/alerts-panel"
import { RealtimeMetrics } from "@/components/dashboard/realtime-metrics"

export default function Home() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
        {/* Main map area */}
        <div className="lg:col-span-3 rounded-lg border border-glow-cyan overflow-hidden">
          <MapContainer />
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <StatsOverview />
          <RealtimeMetrics />
          <IncidentsPanel />
          <AlertsPanel />
        </div>
      </div>
    </DashboardLayout>
  )
}
