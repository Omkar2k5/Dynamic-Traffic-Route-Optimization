"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, TrendingUp, Clock, Zap } from "lucide-react"

export function PredictionsPanel() {
  const predictions = [
    {
      id: 1,
      title: "Evening Rush Hour Peak",
      time: "17:00 - 19:00",
      severity: "warning",
      description: "Expected 70-80% congestion on major routes",
      icon: TrendingUp,
    },
    {
      id: 2,
      title: "Signal Maintenance Alert",
      time: "22:00 - 23:30",
      severity: "info",
      description: "Scheduled maintenance on 12 traffic signals downtown",
      icon: Zap,
    },
    {
      id: 3,
      title: "Weather Impact Warning",
      time: "Next 6 hours",
      severity: "critical",
      description: "Heavy rain expected - increased accident risk",
      icon: AlertTriangle,
    },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive"
      case "warning":
        return "secondary"
      default:
        return "outline"
    }
  }

  return (
    <Card className="border-glow-cyan">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Predictive Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {predictions.map((prediction) => {
          const Icon = prediction.icon

          return (
            <div
              key={prediction.id}
              className="p-3 rounded border border-border/50 hover:border-border transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{prediction.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{prediction.time}</p>
                  </div>
                </div>
                <Badge variant={getSeverityColor(prediction.severity)} className="text-xs">
                  {prediction.severity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{prediction.description}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
