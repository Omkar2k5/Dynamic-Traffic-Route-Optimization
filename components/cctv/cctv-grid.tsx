"use client"

import { useState } from "react"
import { mockCCTVCameras } from "@/lib/mock-data"
import { CCTVStreamViewer } from "./cctv-stream-viewer"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export function CCTVGrid() {
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)

  const selectedCameraData = mockCCTVCameras.find((c) => c.id === selectedCamera)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockCCTVCameras.map((camera) => (
          <div
            key={camera.id}
            className="relative rounded-lg border border-glow-cyan overflow-hidden bg-slate-900 hover:border-glow-cyan/80 transition-colors cursor-pointer group"
            onClick={() => setSelectedCamera(camera.id)}
          >
            <div className="aspect-video bg-slate-800 relative overflow-hidden">
              <img
                src={camera.streamUrl || "/placeholder.svg"}
                alt={camera.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-glow-cyan">{camera.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{camera.location.address}</p>
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    camera.status === "active" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                  }`}
                >
                  {camera.status}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{camera.resolution}</span>
                <span>Live</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedCameraData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg border border-glow-cyan w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-glow-cyan/20">
              <h2 className="text-xl font-bold text-glow-cyan">{selectedCameraData.name}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCamera(null)}
                className="text-slate-400 hover:text-glow-cyan"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              <CCTVStreamViewer camera={selectedCameraData} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
