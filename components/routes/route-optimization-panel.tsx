"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockRoutes, mockIncidents } from "@/lib/mock-data"
import { ArrowRight, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react"

interface RouteOptimizationPanelProps {
  selectedRoute: string | null
}

export function RouteOptimizationPanel({ selectedRoute }: RouteOptimizationPanelProps) {
  const route = mockRoutes.find((r) => r.id === selectedRoute)

  if (!route) {
    return (
      <Card className="border-glow-cyan h-full flex items-center justify-center">
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Select a route to view optimization details</p>
        </CardContent>
      </Card>
    )
  }

  const routeIncidents = mockIncidents.filter((i) => route.incidents.includes(i.id))
  const potentialSavings = Math.round((route.currentDelay / route.estimatedTime) * 100)

  return (
    <div className="space-y-3">
      <Card className="border-glow-cyan">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Route Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Route Name</p>
            <p className="font-semibold text-foreground">{route.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Distance</p>
              <p className="font-semibold text-foreground">{route.distance.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Base Time</p>
              <p className="font-semibold text-foreground">{route.estimatedTime} min</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Delay</p>
              <p className="font-semibold text-red-500">+{route.currentDelay} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total ETA</p>
              <p className="font-semibold text-foreground">{route.estimatedTime + route.currentDelay} min</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {routeIncidents.length > 0 && (
        <Card className="border-glow-red">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Active Incidents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {routeIncidents.map((incident) => (
              <div key={incident.id} className="p-2 rounded border border-border/50 bg-red-500/5">
                <p className="text-xs font-medium text-foreground">{incident.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{incident.location.address}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="border-glow-green">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-green-500" />
            Optimization Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 rounded border border-green-500/30 bg-green-500/5">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Avoid Current Route</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {potentialSavings}% delay detected. Consider alternative routes.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded border border-cyan-500/30 bg-cyan-500/5">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Adjust Timing</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Wait {Math.round(route.currentDelay / 2)} minutes for incidents to clear.
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Real-time Updates</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Route status updates every 30 seconds based on traffic conditions.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Button className="w-full gap-2">
          <ArrowRight className="w-4 h-4" />
          Apply Optimization
        </Button>
        <Button variant="outline" className="w-full bg-transparent">
          View Alternatives
        </Button>
      </div>
    </div>
  )
}
