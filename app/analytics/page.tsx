"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AnalyticsOverview } from "@/components/analytics/analytics-overview"
import { TrafficTrendsChart } from "@/components/analytics/traffic-trends-chart"
import { IncidentAnalysis } from "@/components/analytics/incident-analysis"
import { PredictionsPanel } from "@/components/analytics/predictions-panel"
import { SystemHealthChart } from "@/components/analytics/system-health-chart"
import { PeakHoursAnalysis } from "@/components/analytics/peak-hours-analysis"

export default function AnalyticsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-4 h-full flex flex-col overflow-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Predictions</h1>
          <p className="text-muted-foreground mt-1">Real-time traffic analytics and predictive insights</p>
        </div>

        <AnalyticsOverview />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TrafficTrendsChart />
          <SystemHealthChart />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <IncidentAnalysis />
          <PeakHoursAnalysis />
        </div>

        <PredictionsPanel />
      </div>
    </DashboardLayout>
  )
}
