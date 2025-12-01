import { DashboardLayout } from "@/components/layout/dashboard-layout"
import LiveCCTVMonitor from "@/components/cctv/live-cctv-monitor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { staticDatabase } from "@/lib/static-database"
import { Camera, Activity, AlertTriangle, TrendingUp } from "lucide-react"

export default function CCTVPage() {
  // Get static camera data
  const cameras = staticDatabase.getAllCameras();
  const statistics = staticDatabase.getStatistics();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-glow-cyan">CCTV Monitoring</h1>
          <p className="text-slate-400 mt-2">Integrated traffic congestion and accident detection with AI-powered analysis</p>
        </div>

        {/* Real-time Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-glow-cyan/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Cameras</CardTitle>
              <Camera className="h-4 w-4 text-glow-cyan" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-glow-cyan">{statistics.activeCameras}</div>
              <p className="text-xs text-slate-500 mt-1">of {statistics.totalCameras} total cameras</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-glow-cyan/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Vehicles</CardTitle>
              <Activity className="h-4 w-4 text-glow-cyan" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-glow-cyan">{statistics.totalVehicles}</div>
              <p className="text-xs text-slate-500 mt-1">across all locations</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-glow-cyan/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Accidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{statistics.accidentCount}</div>
              <p className="text-xs text-slate-500 mt-1">
                {statistics.criticalAccidents > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {statistics.criticalAccidents} critical
                  </Badge>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-glow-cyan/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Avg Congestion</CardTitle>
              <TrendingUp className="h-4 w-4 text-glow-cyan" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-glow-cyan">{statistics.averageCongestion}%</div>
              <p className="text-xs text-slate-500 mt-1">network-wide traffic density</p>
            </CardContent>
          </Card>
        </div>





        {/* Live CCTV Monitor */}
        <LiveCCTVMonitor />
      </div>
    </DashboardLayout>
  )
}
