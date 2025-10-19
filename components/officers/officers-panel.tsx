"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { User, MapPin, AlertTriangle, CheckCircle } from "lucide-react"
import { mockOfficers } from "@/lib/mock-data"

interface OfficersPanelProps {
  selectedOfficer: string | null
  onSelectOfficer: (officerId: string) => void
}

export function OfficersPanel({ selectedOfficer, onSelectOfficer }: OfficersPanelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-500/10 text-green-500"
      case "responding":
        return "bg-yellow-500/10 text-yellow-500"
      case "on-scene":
        return "bg-orange-500/10 text-orange-500"
      case "off-duty":
        return "bg-gray-500/10 text-gray-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return <CheckCircle className="w-4 h-4" />
      case "responding":
        return <AlertTriangle className="w-4 h-4" />
      case "on-scene":
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  return (
    <Card className="border-glow-cyan">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Field Officers</span>
          <Badge variant="outline">{mockOfficers.length} Total</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {mockOfficers.map((officer) => {
          const isSelected = selectedOfficer === officer.id

          return (
            <div
              key={officer.id}
              className={`p-3 rounded border cursor-pointer transition-all ${
                isSelected
                  ? "border-cyan-400/70 bg-cyan-500/10 ring-2 ring-cyan-500"
                  : "border-border/50 hover:border-border"
              }`}
              onClick={() => onSelectOfficer(officer.id)}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{officer.name}</p>
                    <p className="text-xs text-muted-foreground">Badge: {officer.badge}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${getStatusColor(officer.status)}`}>
                  {getStatusIcon(officer.status)}
                  {officer.status}
                </span>
              </div>

              {officer.location && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {officer.location.lat.toFixed(4)}, {officer.location.lng.toFixed(4)}
                  </span>
                </div>
              )}

              {officer.assignedIncidents.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Assigned: </span>
                  <span className="text-cyan-400">{officer.assignedIncidents.length} incident(s)</span>
                </div>
              )}

              {isSelected && (
                <div className="mt-3 pt-3 border-t border-border/50 flex gap-2">
                  <Button size="sm" className="flex-1 bg-transparent" variant="outline">
                    Dispatch
                  </Button>
                  <Button size="sm" className="flex-1">
                    Contact
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
