"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Compass, Layers } from "lucide-react"

interface MapControlsProps {
  onZoom: (direction: "in" | "out") => void
  onReset: () => void
}

export function MapControls({ onZoom, onReset }: MapControlsProps) {
  const [showLayers, setShowLayers] = useState(false)

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
      <Button
        size="icon"
        variant="outline"
        className="bg-card/80 backdrop-blur border-border hover:bg-card"
        onClick={() => onZoom("in")}
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="bg-card/80 backdrop-blur border-border hover:bg-card"
        onClick={() => onZoom("out")}
      >
        <ZoomOut className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="bg-card/80 backdrop-blur border-border hover:bg-card"
        onClick={onReset}
      >
        <Compass className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="bg-card/80 backdrop-blur border-border hover:bg-card"
        onClick={() => setShowLayers(!showLayers)}
      >
        <Layers className="w-4 h-4" />
      </Button>
    </div>
  )
}
