"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"

const alerts = [
  {
    id: 1,
    message: "High congestion detected",
    type: "warning",
  },
  {
    id: 2,
    message: "Weather alert: Heavy rain",
    type: "info",
  },
  {
    id: 3,
    message: "Maintenance scheduled",
    type: "info",
  },
]

export function AlertsPanel() {
  return (
    <Card className="border-glow-green">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-green-500" />
          System Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start gap-2 p-2 rounded border border-border/50">
            <Badge variant="outline" className="text-xs mt-0.5">
              {alert.type}
            </Badge>
            <p className="text-xs text-muted-foreground">{alert.message}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
