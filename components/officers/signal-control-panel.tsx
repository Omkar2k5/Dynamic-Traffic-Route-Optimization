"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Zap, AlertTriangle } from "lucide-react"
import { mockSignals } from "@/lib/mock-data"
import { useState } from "react"

export function SignalControlPanel() {
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null)
  const [signalPhases, setSignalPhases] = useState<Record<string, string>>({})

  const activeSignals = mockSignals.filter((s) => s.status === "active").slice(0, 10)
  const maintenanceSignals = mockSignals.filter((s) => s.status === "maintenance")

  const handlePhaseChange = (signalId: string, phase: string) => {
    setSignalPhases((prev) => ({ ...prev, [signalId]: phase }))
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "green":
        return "bg-green-500/20 text-green-500 border-green-500/50"
      case "yellow":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50"
      case "red":
        return "bg-red-500/20 text-red-500 border-red-500/50"
      default:
        return "bg-gray-500/20 text-gray-500 border-gray-500/50"
    }
  }

  return (
    <Card className="border-glow-green">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Traffic Signal Control
          </span>
          <Badge variant="outline">{activeSignals.length} Active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Active Signals</p>
          <div className="grid grid-cols-2 gap-2">
            {activeSignals.map((signal) => (
              <div
                key={signal.id}
                className={`p-2 rounded border cursor-pointer transition-all ${
                  selectedSignal === signal.id
                    ? "border-green-400/70 bg-green-500/10"
                    : "border-border/50 hover:border-border"
                }`}
                onClick={() => setSelectedSignal(signal.id)}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-medium text-foreground">{signal.id}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded border ${getPhaseColor(signal.currentPhase)}`}>
                    {signal.currentPhase}
                  </span>
                </div>

                {selectedSignal === signal.id && (
                  <div className="flex gap-1">
                    {["red", "yellow", "green"].map((phase) => (
                      <Button
                        key={phase}
                        size="sm"
                        variant={signalPhases[signal.id] === phase ? "default" : "outline"}
                        className={`flex-1 text-xs h-7 ${
                          phase === "red"
                            ? "bg-red-500/20 hover:bg-red-500/30"
                            : phase === "yellow"
                              ? "bg-yellow-500/20 hover:bg-yellow-500/30"
                              : "bg-green-500/20 hover:bg-green-500/30"
                        }`}
                        onClick={() => handlePhaseChange(signal.id, phase)}
                      >
                        {phase[0].toUpperCase()}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {maintenanceSignals.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Maintenance Mode ({maintenanceSignals.length})
            </p>
            <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-xs text-yellow-500">
                {maintenanceSignals.length} signal(s) under maintenance. Manual control disabled.
              </p>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-border/50 flex gap-2">
          <Button size="sm" className="flex-1 bg-transparent" variant="outline">
            Sync All
          </Button>
          <Button size="sm" className="flex-1">
            Apply Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
