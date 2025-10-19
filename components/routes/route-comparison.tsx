"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Navigation } from "lucide-react"

interface RouteOption {
  id: string
  name: string
  distance: number
  estimatedTime: number
  delay: number
  incidents: number
  savings: number
}

interface RouteComparisonProps {
  routes: RouteOption[]
}

export function RouteComparison({ routes }: RouteComparisonProps) {
  return (
    <Card className="border-glow-cyan">
      <CardHeader>
        <CardTitle className="text-sm">Route Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {routes.map((route) => (
          <div
            key={route.id}
            className="p-3 rounded border border-border/50 hover:border-border cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-medium text-sm text-foreground">{route.name}</p>
              {route.savings > 0 && (
                <Badge variant="outline" className="text-green-500 border-green-500/50">
                  Save {route.savings}m
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Navigation className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{route.distance.toFixed(1)}km</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{route.estimatedTime + route.delay}m</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground">{route.incidents} incidents</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
