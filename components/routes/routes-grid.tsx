"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Navigation, AlertTriangle, Clock, Zap } from "lucide-react"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

// Types for delayed routes data
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

interface RoutesGridProps {
  selectedRoute: string | null
  onSelectRoute: (routeId: string) => void
}

export function RoutesGrid({ selectedRoute, onSelectRoute }: RoutesGridProps) {
  const [routes, setRoutes] = useState<DelayedRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDelayedRoutes()
  }, [])

  const fetchDelayedRoutes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/delayed-routes')
      const data = await response.json()
      
      if (data.success && data.delayedRoutes) {
        setRoutes(data.delayedRoutes)
      } else {
        setError(data.error || 'Failed to fetch delayed routes')
      }
    } catch (err) {
      console.error('Error fetching delayed routes:', err)
      setError('Network error while fetching delayed routes')
    } finally {
      setLoading(false)
    }
  }

  const getRouteStatus = (route: DelayedRoute) => {
    const delay = route.originalRoute.delay
    const baseTime = route.originalRoute.estimatedTime
    const delayPercentage = (delay / baseTime) * 100
    const trafficLevel = route.congestedArea.trafficLevel

    // Consider traffic level and delay percentage
    if (trafficLevel === 'HEAVY' || trafficLevel === 'TRAFFIC_JAM' || delayPercentage > 50) {
      return "critical"
    }
    if (trafficLevel === 'MODERATE' || delayPercentage > 25) {
      return "warning"
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading delayed routes...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Error loading delayed routes</p>
          <p className="text-sm text-red-500">{error}</p>
        </div>
        <Button onClick={fetchDelayedRoutes} variant="outline" size="sm">
          Retry
        </Button>
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Navigation className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No delayed routes detected</p>
          <p className="text-sm text-muted-foreground mt-1">
            Traffic conditions are currently normal
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Active Delayed Routes</h2>
        <Badge variant="outline" className="text-xs">
          {routes.length} routes affected
        </Badge>
      </div>
      
      {routes.map((route) => {
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
                      {route.originalRoute.distance.toFixed(1)} km • {route.originalRoute.estimatedTime} min
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {route.congestedArea.location}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={getStatusColor(status)}>{status}</Badge>
                  <Badge variant="outline" className="text-xs">
                    {route.congestedArea.trafficLevel}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Delay</p>
                    <p className={`font-semibold ${getDelayColor(route.originalRoute.delay, route.originalRoute.estimatedTime)}`}>
                      +{route.originalRoute.delay}m
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">ETA</p>
                    <p className="font-semibold text-foreground">{route.originalRoute.estimatedTime + route.originalRoute.delay}m</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Alternatives</p>
                    <p className="font-semibold text-orange-500">{route.alternativeRoutes.length}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicles affected</p>
                    <p className="text-sm font-semibold text-foreground">{route.congestedArea.vehicleCount}</p>
                  </div>
                  {route.alternativeRoutes.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Best alternative saves</p>
                      <p className="text-sm font-semibold text-green-500">
                        {Math.max(...route.alternativeRoutes.map(r => r.savings))} min
                      </p>
                    </div>
                  )}
                </div>
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
