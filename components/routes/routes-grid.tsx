"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Navigation, AlertTriangle, Clock, Zap } from "lucide-react"
import { mockRoutes } from "@/lib/mock-data"
import type { Route } from "@/lib/types"

interface RoutesGridProps {
  selectedRoute: string | null
  onSelectRoute: (routeId: string) => void
}

export function RoutesGrid({ selectedRoute, onSelectRoute }: RoutesGridProps) {
  const getRouteStatus = (route: Route) => {
    const hasIncidents = route.incidents.length > 0
    const delayPercentage = (route.currentDelay / route.estimatedTime) * 100

    if (hasIncidents) return "critical"
    if (delayPercentage > 30) return "warning"
    return "optimal"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "destructive"
      case "warning":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getDelayColor = (delay: number, estimated: number) => {
    const percentage = (delay / estimated) * 100
    if (percentage > 30) return "text-red-500"
    if (percentage > 15) return "text-yellow-500"
    return "text-green-500"
  }

  return (
    <div className="space-y-3">
      {mockRoutes.map((route) => {
        const status = getRouteStatus(route)
        const isSelected = selectedRoute === route.id

        return (
          <Card
            key={route.id}
            className={`border-glow-cyan cursor-pointer transition-all ${
              isSelected ? "ring-2 ring-cyan-500 border-cyan-400/70" : "hover:border-cyan-400/70"
            }`}
            onClick={() => onSelectRoute(route.id)}
          >
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <Navigation className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{route.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {route.distance.toFixed(1)} km • {route.estimatedTime} min
                    </p>
                  </div>
                </div>
                <Badge variant={getStatusColor(status)}>{status}</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delay</p>
                    <p className={`font-semibold ${getDelayColor(route.currentDelay, route.estimatedTime)}`}>
                      +{route.currentDelay}m
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">ETA</p>
                    <p className="font-semibold text-foreground">{route.estimatedTime + route.currentDelay}m</p>
                  </div>
                </div>

                {route.incidents.length > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Incidents</p>
                      <p className="font-semibold text-red-500">{route.incidents.length}</p>
                    </div>
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <Button className="w-full" size="sm">
                    View Optimization
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
