"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, MapPin, TrendingDown } from "lucide-react"
import type { SuggestedRoute } from "@/lib/route-utils"

interface RouteSuggestionResultsProps {
  routes: SuggestedRoute[]
  selectedRoute: SuggestedRoute | null
  onSelectRoute: (route: SuggestedRoute) => void
  isLoading: boolean
}

export function RouteSuggestionResults({
  routes,
  selectedRoute,
  onSelectRoute,
  isLoading,
}: RouteSuggestionResultsProps) {
  if (isLoading) {
    return (
      <Card className="p-8 bg-card border-card-border flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-foreground/60">Analyzing routes and traffic conditions...</p>
        </div>
      </Card>
    )
  }

  if (routes.length === 0) {
    return (
      <Card className="p-8 bg-card border-card-border text-center">
        <MapPin className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
        <p className="text-foreground/60">Enter start and end points to get route suggestions</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {routes.map((route) => (
        <Card
          key={route.id}
          onClick={() => onSelectRoute(route)}
          className={`p-4 cursor-pointer transition-all border-2 ${
            selectedRoute?.id === route.id
              ? "bg-primary/10 border-primary"
              : "bg-card border-card-border hover:border-primary/50"
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                {route.name}
                {route.isAlternate && (
                  <Badge variant="outline" className="text-xs">
                    Alternate
                  </Badge>
                )}
              </h3>
              {route.timeSavings && route.timeSavings > 0 && (
                <p className="text-sm text-accent flex items-center gap-1 mt-1">
                  <TrendingDown className="w-4 h-4" />
                  Save ~{Math.round(route.timeSavings)} min
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-foreground">{route.distance.toFixed(1)} km</p>
              <p className="text-sm text-foreground/60">{route.estimatedTime} min</p>
            </div>
          </div>

          {/* Traffic Issues */}
          {route.trafficIssues.length > 0 && (
            <div className="bg-warning/10 border border-warning/30 rounded p-3 mb-3">
              <p className="text-sm font-medium text-warning flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" />
                {route.trafficIssues.length} Traffic Issue{route.trafficIssues.length !== 1 ? "s" : ""} Detected
              </p>
              <div className="space-y-1">
                {route.trafficIssues.slice(0, 2).map((issue, idx) => (
                  <p key={idx} className="text-xs text-foreground/70">
                    • {issue.cameraName}: {issue.detectionType} ({issue.severity})
                  </p>
                ))}
                {route.trafficIssues.length > 2 && (
                  <p className="text-xs text-foreground/60">
                    +{route.trafficIssues.length - 2} more issue{route.trafficIssues.length - 2 !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Route Status */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-foreground/60">
              <Clock className="w-4 h-4" />
              <span>ETA: {new Date(Date.now() + route.estimatedTime * 60000).toLocaleTimeString()}</span>
            </div>
            {route.trafficIssues.length === 0 && (
              <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                Clear
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
