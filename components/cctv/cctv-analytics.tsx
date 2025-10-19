"use client"

import { mockCCTVCameras, mockMLDetections, mockCCTVAnalytics } from "@/lib/mock-data"
import { AlertTriangle, Camera, TrendingUp } from "lucide-react"

export function CCTVAnalytics() {
  const activeCameras = mockCCTVCameras.filter((c) => c.status === "active").length
  const totalDetections = mockMLDetections.length
  const criticalDetections = mockMLDetections.filter((d) => d.severity === "critical").length
  const avgCongestion =
    Math.round(mockCCTVAnalytics.reduce((sum, a) => sum + a.trafficDensity, 0) / mockCCTVAnalytics.length) || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-slate-800/50 rounded-lg p-6 border border-glow-cyan/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400">Active Cameras</h3>
          <Camera className="w-5 h-5 text-glow-cyan" />
        </div>
        <div className="text-3xl font-bold text-glow-cyan">{activeCameras}</div>
        <p className="text-xs text-slate-500 mt-2">of {mockCCTVCameras.length} total</p>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-6 border border-glow-cyan/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400">AI Detections</h3>
          <TrendingUp className="w-5 h-5 text-glow-cyan" />
        </div>
        <div className="text-3xl font-bold text-glow-cyan">{totalDetections}</div>
        <p className="text-xs text-slate-500 mt-2">Last 24 hours</p>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-6 border border-glow-cyan/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400">Critical Alerts</h3>
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div className="text-3xl font-bold text-red-400">{criticalDetections}</div>
        <p className="text-xs text-slate-500 mt-2">Require immediate attention</p>
      </div>

      <div className="bg-slate-800/50 rounded-lg p-6 border border-glow-cyan/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-400">Avg Congestion</h3>
          <TrendingUp className="w-5 h-5 text-glow-cyan" />
        </div>
        <div className="text-3xl font-bold text-glow-cyan">{avgCongestion}%</div>
        <p className="text-xs text-slate-500 mt-2">Network-wide</p>
      </div>
    </div>
  )
}
