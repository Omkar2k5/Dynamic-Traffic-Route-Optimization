"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function MapLegend() {
  return (
    <Card className="absolute bottom-4 left-4 w-64 bg-card/90 backdrop-blur border-glow-cyan z-10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Map Legend</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-red-500 shadow-lg shadow-red-500/50 flex items-center justify-center text-xs">
              ⚠️
            </div>
            <span className="text-xs text-foreground">Critical Incident</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50 flex items-center justify-center text-xs">
              ⚠️
            </div>
            <span className="text-xs text-foreground">Warning</span>
          </div>
        </div>

        <div className="border-t border-border pt-2 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Traffic Signals</p>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30"></div>
            <span className="text-xs text-foreground">Green</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30"></div>
            <span className="text-xs text-foreground">Yellow</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/30"></div>
            <span className="text-xs text-foreground">Red</span>
          </div>
        </div>

        <div className="border-t border-border pt-2">
          <p className="text-xs text-muted-foreground">Congestion Level</p>
          <div className="flex gap-1 mt-2">
            <div className="flex-1 h-2 rounded bg-green-500/50"></div>
            <div className="flex-1 h-2 rounded bg-yellow-500/50"></div>
            <div className="flex-1 h-2 rounded bg-red-500/50"></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
