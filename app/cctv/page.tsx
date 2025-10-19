import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CCTVGrid } from "@/components/cctv/cctv-grid"
import { CCTVAnalytics } from "@/components/cctv/cctv-analytics"

export default function CCTVPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-glow-cyan">CCTV Monitoring</h1>
          <p className="text-slate-400 mt-2">Real-time traffic monitoring with AI-powered detection</p>
        </div>

        <CCTVAnalytics />
        <CCTVGrid />
      </div>
    </DashboardLayout>
  )
}
