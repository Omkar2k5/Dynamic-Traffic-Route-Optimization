"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, MapPin, Clock, ChevronRight } from "lucide-react"
import { mockIncidents } from "@/lib/mock-data"
import { IncidentDetailDialog } from "./incident-detail-dialog"
import type { Incident } from "@/lib/types"

interface IncidentsTableProps {
  filters: {
    severity: string
    status: string
    search: string
  }
}

export function IncidentsTable({ filters }: IncidentsTableProps) {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)

  const filteredIncidents = mockIncidents.filter((incident) => {
    if (filters.severity !== "all" && incident.severity !== filters.severity) return false
    if (filters.status !== "all" && incident.status !== filters.status) return false
    if (filters.search && !incident.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-red-500/10 text-red-500"
      case "investigating":
        return "bg-yellow-500/10 text-yellow-500"
      case "resolved":
        return "bg-green-500/10 text-green-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  return (
    <>
      <div className="space-y-2">
        {filteredIncidents.length === 0 ? (
          <Card className="border-glow-cyan">
            <CardContent className="pt-8 pb-8 text-center">
              <p className="text-muted-foreground">No incidents found matching your filters</p>
            </CardContent>
          </Card>
        ) : (
          filteredIncidents.map((incident) => (
            <Card
              key={incident.id}
              className="border-glow-cyan cursor-pointer hover:border-cyan-400/70 transition-colors"
              onClick={() => setSelectedIncident(incident)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <h3 className="text-lg font-semibold text-foreground">{incident.title}</h3>
                      <Badge variant={getSeverityColor(incident.severity)} className="ml-auto">
                        {incident.severity}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{incident.description}</p>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{incident.location.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{incident.createdAt.toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                      {incident.assignedOfficer && (
                        <span className="text-xs text-muted-foreground">Assigned to Officer</span>
                      )}
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" className="flex-shrink-0">
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedIncident && (
        <IncidentDetailDialog incident={selectedIncident} onClose={() => setSelectedIncident(null)} />
      )}
    </>
  )
}
