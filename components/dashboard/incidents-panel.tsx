"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, MapPin, Clock } from "lucide-react"

const incidents = [
  {
    id: 1,
    title: "Multi-vehicle collision",
    location: "Highway 101 & Oak St",
    severity: "critical",
    time: "5 min ago",
  },
  {
    id: 2,
    title: "Traffic congestion",
    location: "Downtown Core",
    severity: "warning",
    time: "12 min ago",
  },
  {
    id: 3,
    title: "Signal malfunction",
    location: "Main St & 5th Ave",
    severity: "warning",
    time: "23 min ago",
  },
]

export function IncidentsPanel() {
  return (
    <Card className="border-glow-red flex-1">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          Recent Incidents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            className="p-2 rounded border border-border/50 hover:border-border cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-xs font-medium text-foreground">{incident.title}</p>
              <Badge variant={incident.severity === "critical" ? "destructive" : "secondary"} className="text-xs">
                {incident.severity}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span>{incident.location}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Clock className="w-3 h-3" />
              <span>{incident.time}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
