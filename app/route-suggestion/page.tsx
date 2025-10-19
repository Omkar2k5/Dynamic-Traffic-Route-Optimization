"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RouteSuggestionForm } from "@/components/route-suggestion/route-suggestion-form"
import { RouteSuggestionResults } from "@/components/route-suggestion/route-suggestion-results"
import { RouteMapDisplay } from "@/components/route-suggestion/route-map-display"
import type { RoutePoint, SuggestedRoute } from "@/lib/route-utils"

export default function RouteSuggestionPage() {
  const [suggestedRoutes, setSuggestedRoutes] = useState<SuggestedRoute[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<SuggestedRoute | null>(null)
  const [startPoint, setStartPoint] = useState<RoutePoint | null>(null)
  const [endPoint, setEndPoint] = useState<RoutePoint | null>(null)

  const handleSuggestRoutes = async (start: RoutePoint, end: RoutePoint) => {
    setStartPoint(start)
    setEndPoint(end)
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const response = await fetch("/api/route-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startPoint: start, endPoint: end }),
      })

      const routes = await response.json()
      setSuggestedRoutes(routes)
      setSelectedRoute(routes[0])
    } catch (error) {
      console.error("Error suggesting routes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Smart Route Suggestion</h1>
          <p className="text-foreground/60 mt-2">
            Find the shortest route and get real-time traffic alerts with intelligent alternate route suggestions
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <RouteSuggestionForm onSuggest={handleSuggestRoutes} isLoading={isLoading} />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <RouteMapDisplay startPoint={startPoint} endPoint={endPoint} selectedRoute={selectedRoute} />
            <RouteSuggestionResults
              routes={suggestedRoutes}
              selectedRoute={selectedRoute}
              onSelectRoute={setSelectedRoute}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
