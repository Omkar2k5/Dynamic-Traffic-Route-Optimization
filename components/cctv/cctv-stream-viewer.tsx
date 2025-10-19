"use client"

import { useState, useEffect } from "react"
import type { CCTVCamera } from "@/lib/types"
import { mockMLDetections, mockCCTVAnalytics } from "@/lib/mock-data"
import { AlertTriangle, Activity, Zap } from "lucide-react"

interface CCTVStreamViewerProps {
  camera: CCTVCamera
}

export function CCTVStreamViewer({ camera }: CCTVStreamViewerProps) {
  const [detections, setDetections] = useState<typeof mockMLDetections>([])
  const [analytics, setAnalytics] = useState<(typeof mockCCTVAnalytics)[0] | null>(null)

  useEffect(() => {
    // Filter detections for this camera
    const cameraDetections = mockMLDetections.filter((d) => d.cameraId === camera.id)
    setDetections(cameraDetections)

    // Get analytics for this camera
    const cameraAnalytics = mockCCTVAnalytics.find((a) => a.cameraId === camera.id)
    setAnalytics(cameraAnalytics || null)
  }, [camera.id])

  const getDetectionColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/50"
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/50"
    }
  }

  const getDetectionIcon = (type: string) => {
    switch (type) {
      case "accident":
        return "🚗"
      case "congestion":
        return "🚦"
      case "stalled-vehicle":
        return "⚠️"
      case "debris":
        return "🛑"
      case "pedestrian-crossing":
        return "🚶"
      default:
        return "📹"
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stream */}
      <div className="rounded-lg overflow-hidden border border-glow-cyan/30">
        <img src={camera.streamUrl || "/placeholder.svg"} alt={camera.name} className="w-full h-auto" />
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-glow-cyan" />
              <span className="text-xs text-slate-400">Traffic Density</span>
            </div>
            <div className="text-2xl font-bold text-glow-cyan">{analytics.trafficDensity}%</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-glow-cyan" />
              <span className="text-xs text-slate-400">Avg Speed</span>
            </div>
            <div className="text-2xl font-bold text-glow-cyan">{analytics.averageVehicleSpeed} mph</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-glow-cyan" />
              <span className="text-xs text-slate-400">Incidents</span>
            </div>
            <div className="text-2xl font-bold text-glow-cyan">{analytics.detectedIncidents}</div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-glow-cyan/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-slate-400">Congestion</span>
            </div>
            <div
              className={`text-2xl font-bold ${
                analytics.congestionLevel === "critical"
                  ? "text-red-400"
                  : analytics.congestionLevel === "high"
                    ? "text-orange-400"
                    : analytics.congestionLevel === "medium"
                      ? "text-yellow-400"
                      : "text-green-400"
              }`}
            >
              {analytics.congestionLevel}
            </div>
          </div>
        </div>
      )}

      {/* ML Detections */}
      {detections.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-glow-cyan">AI Detections</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {detections.map((detection) => (
              <div
                key={detection.id}
                className={`p-4 rounded-lg border ${getDetectionColor(detection.severity)} bg-slate-800/30`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getDetectionIcon(detection.detectionType)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold capitalize">{detection.detectionType.replace("-", " ")}</h4>
                      <span className="text-xs font-medium">{detection.confidence}% confidence</span>
                    </div>
                    <p className="text-sm opacity-90">{detection.description}</p>
                    <p className="text-xs opacity-75 mt-1">{new Date(detection.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {detections.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No AI detections at this time</p>
        </div>
      )}
    </div>
  )
}
