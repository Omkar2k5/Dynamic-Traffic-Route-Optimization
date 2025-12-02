"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, TrendingDown, AlertTriangle, CheckCircle, Navigation, MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

// Types for delayed routes data (same as in routes-grid)
interface DelayedRoute {
  id: string
  name: string
  startPoint: { lat: number; lng: number }
  endPoint: { lat: number; lng: number }
  originalRoute: {
    distance: number
    estimatedTime: number
    delay: number
  }
  alternativeRoutes: AlternativeRoute[]
  congestedArea: {
    location: string
    trafficLevel: string
    vehicleCount: number
  }
}

interface AlternativeRoute {
  id: string
  name: string
  distance: number
  estimatedTime: number
  delay: number
  savings: number
  description: string
}

interface RouteOptimizationPanelProps {
  selectedRoute: string | null
}

export function RouteOptimizationPanel({ selectedRoute }: RouteOptimizationPanelProps) {
  const [route, setRoute] = useState<DelayedRoute | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedRoute) {
      fetchRouteDetails(selectedRoute)
    } else {
      setRoute(null)
    }
  }, [selectedRoute])

  const fetchRouteDetails = async (routeId: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/delayed-routes')
      const data = await response.json()
      
      if (data.success && data.delayedRoutes) {
        const foundRoute = data.delayedRoutes.find((r: DelayedRoute) => r.id === routeId)
        setRoute(foundRoute || null)
      }
    } catch (error) {
      console.error('Error fetching route details:', error)
      setRoute(null)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedRoute) {
    return (
      <Card className="border-glow-cyan h-full flex items-center justify-center">
        <CardContent className="text-center py-8">
          <Navigation className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a route to view optimization details</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-glow-cyan h-full flex items-center justify-center">
        <CardContent className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading route details...</p>
        </CardContent>
      </Card>
    )
  }

  if (!route) {
    return (
      <Card className="border-glow-cyan h-full flex items-center justify-center">
        <CardContent className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">Route not found</p>
          <Button onClick={() => fetchRouteDetails(selectedRoute)} variant="outline" size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const delayPercentage = Math.round((route.originalRoute.delay / route.originalRoute.estimatedTime) * 100)
  const bestAlternative = route.alternativeRoutes.length > 0 
    ? route.alternativeRoutes.reduce((best, current) => 
        current.savings > best.savings ? current : best
      )
    : null

  const potentialSavings = bestAlternative ? bestAlternative.savings : 0

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
              <p className="font-semibold text-foreground">{route.originalRoute.distance.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Base Time</p>
              <p className="font-semibold text-foreground">{route.originalRoute.estimatedTime} min</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Current Delay</p>
              <p className="font-semibold text-red-500">+{route.originalRoute.delay} min</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total ETA</p>
              <p className="font-semibold text-foreground">{route.originalRoute.estimatedTime + route.originalRoute.delay} min</p>
            </div>
          </div>

          <div className="pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Congested Area</p>
            </div>
            <p className="text-sm text-foreground">{route.congestedArea.location}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {route.congestedArea.trafficLevel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {route.congestedArea.vehicleCount} vehicles
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {delayPercentage > 25 && (
        <Card className="border-glow-red">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Traffic Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="p-2 rounded border border-red-500/30 bg-red-500/5">
              <p className="text-xs font-medium text-foreground">
                {delayPercentage}% delay detected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Current traffic conditions are significantly impacting travel time
              </p>
            </div>
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
          {bestAlternative && potentialSavings > 0 && (
            <div className="p-3 rounded border border-green-500/30 bg-green-500/5">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Take Alternative Route</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bestAlternative.description} - Save {potentialSavings} minutes
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bestAlternative.distance.toFixed(1)} km • {bestAlternative.estimatedTime} min
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 rounded border border-cyan-500/30 bg-cyan-500/5">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">Adjust Timing</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Wait {Math.round(route.originalRoute.delay / 2)} minutes for traffic to clear.
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

      {route.alternativeRoutes.length > 0 && (
        <Card className="border-glow-cyan">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Available Alternatives</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {route.alternativeRoutes.slice(0, 3).map((altRoute) => (
              <div key={altRoute.id} className="p-2 rounded border border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">{altRoute.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {altRoute.distance.toFixed(1)} km • {altRoute.estimatedTime} min
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-green-500">-{altRoute.savings}m</p>
                    <p className="text-xs text-muted-foreground">saved</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <Button className="w-full gap-2">
          <ArrowRight className="w-4 h-4" />
          Apply Optimization
        </Button>
        <Button variant="outline" className="w-full bg-transparent">
          View on Map
        </Button>
      </div>
    </div>
  )
}
