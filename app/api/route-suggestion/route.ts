import { type NextRequest, NextResponse } from "next/server"
import { suggestRoutes, calculateDistance } from "@/lib/route-utils"
import { getTimePreference, getCurrentTimeStatus, calculateRouteScore } from "@/lib/time-utils"
import { mockCCTVCameras, mockMLDetections, mockCCTVAnalytics } from "@/lib/mock-data"
import type { SuggestedRoute } from "@/lib/route-utils"

export async function POST(request: NextRequest) {
  try {
    const { startPoint, endPoint } = await request.json()

    if (!startPoint || !endPoint) {
      return NextResponse.json({ error: "Missing start or end point" }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn("Google Maps API key not configured, using mock routes")
      // Fallback to mock routes if API key not available
      const timePreference = getTimePreference()
      const routes = suggestRoutes(startPoint, endPoint, mockCCTVCameras, mockMLDetections, mockCCTVAnalytics)
      
      // Add scores and time preference info to mock routes
      const scoredRoutes = routes.map((route, index) => {
        const hasHighway = route.isAlternate || index === 0 // Simple heuristic
        const score = calculateRouteScore({
          distance: route.distance,
          estimatedTime: route.estimatedTime,
          hasHighway,
          trafficIssuesCount: route.trafficIssues.length,
        }, timePreference)
        
        return {
          ...route,
          score,
          hasHighway,
        }
      }).sort((a, b) => (b.score || 0) - (a.score || 0))
      
      return NextResponse.json({
        routes: scoredRoutes,
        timePreference: {
          ...timePreference,
          currentTime: getCurrentTimeStatus()
        }
      })
    }

    try {
      // Call Google Maps Directions API to get multiple routes
      const directionsUrl = new URL("https://maps.googleapis.com/maps/api/directions/json")
      directionsUrl.searchParams.append("origin", `${startPoint.lat},${startPoint.lng}`)
      directionsUrl.searchParams.append("destination", `${endPoint.lat},${endPoint.lng}`)
      directionsUrl.searchParams.append("alternatives", "true")
      directionsUrl.searchParams.append("key", apiKey)

      const directionsResponse = await fetch(directionsUrl.toString())
      const directionsData = await directionsResponse.json()

      if (directionsData.status !== "OK" || !directionsData.routes) {
        console.warn("Google Directions API error:", directionsData.status)
        // Fallback to mock routes
        const routes = suggestRoutes(startPoint, endPoint, mockCCTVCameras, mockMLDetections, mockCCTVAnalytics)
        return NextResponse.json(routes)
      }

      // Get current time preference for intelligent routing
      const timePreference = getTimePreference()
      
      // Convert Google Directions routes to our format
      const suggestedRoutes: SuggestedRoute[] = directionsData.routes.map((route: any, index: number) => {
        const leg = route.legs[0]
        const distance = leg.distance.value / 1000 // Convert to km
        const estimatedTime = Math.round(leg.duration.value / 60) // Convert to minutes

        // Extract route points from polyline
        const routePoints = decodePolyline(route.overview_polyline.points)

        // Find traffic issues on this route
        const trafficIssues = mockCCTVCameras
          .map((camera) => {
            // Check if camera is near this route
            const nearRoute = routePoints.some((point) => {
              const dist = calculateDistance(point.lat, point.lng, camera.location.lat, camera.location.lng)
              return dist < 0.5 // Within 500m
            })

            if (!nearRoute) return null

            const cameraDetections = mockMLDetections.filter((d) => d.cameraId === camera.id)
            const cameraAnalytics = mockCCTVAnalytics.find((a) => a.cameraId === camera.id)

            if (cameraDetections.length > 0 || (cameraAnalytics && cameraAnalytics.congestionLevel === "high")) {
              return {
                cameraId: camera.id,
                cameraName: camera.name,
                detectionType: cameraDetections[0]?.detectionType || "congestion",
                severity: cameraDetections[0]?.severity || "high",
                confidence: cameraDetections[0]?.confidence || cameraAnalytics?.trafficDensity || 0.8,
                distance: calculateDistance(startPoint.lat, startPoint.lng, camera.location.lat, camera.location.lng),
              }
            }
            return null
          })
          .filter(Boolean)

        const isAlternate = index > 0
        const timeSavings = isAlternate ? directionsData.routes[0].legs[0].duration.value / 60 - estimatedTime : undefined

        // Check if route uses highways (simplified heuristic)
        const hasHighway = route.summary && (
          route.summary.toLowerCase().includes('highway') || 
          route.summary.toLowerCase().includes('expressway') ||
          route.summary.toLowerCase().includes('interstate') ||
          index === 0 // First route often uses highways
        )

        // Calculate time-based score
        const routeScore = calculateRouteScore({
          distance,
          estimatedTime,
          hasHighway,
          trafficIssuesCount: trafficIssues.length,
        }, timePreference)

        return {
          id: `route-${index}`,
          name: index === 0 ? "Recommended Route" : `Alternative Route ${index}`,
          distance,
          estimatedTime,
          route: routePoints,
          trafficIssues,
          isAlternate,
          timeSavings: timeSavings && timeSavings > 0 ? timeSavings : undefined,
          score: routeScore,
          hasHighway,
        }
      })

      // Sort routes by score (best first)
      suggestedRoutes.sort((a, b) => (b.score || 0) - (a.score || 0))

      // Return routes with time preference info
      return NextResponse.json({
        routes: suggestedRoutes,
        timePreference: {
          ...timePreference,
          currentTime: getCurrentTimeStatus()
        }
      })
    } catch (apiError) {
      console.error("Google Directions API error:", apiError)
      // Fallback to mock routes if API fails
      const timePreference = getTimePreference()
      const routes = suggestRoutes(startPoint, endPoint, mockCCTVCameras, mockMLDetections, mockCCTVAnalytics)
      
      // Add scores and time preference info to mock routes
      const scoredRoutes = routes.map((route, index) => {
        const hasHighway = route.isAlternate || index === 0 // Simple heuristic
        const score = calculateRouteScore({
          distance: route.distance,
          estimatedTime: route.estimatedTime,
          hasHighway,
          trafficIssuesCount: route.trafficIssues.length,
        }, timePreference)
        
        return {
          ...route,
          score,
          hasHighway,
        }
      }).sort((a, b) => (b.score || 0) - (a.score || 0))
      
      return NextResponse.json({
        routes: scoredRoutes,
        timePreference: {
          ...timePreference,
          currentTime: getCurrentTimeStatus()
        }
      })
    }
  } catch (error) {
    console.error("Route suggestion error:", error)
    return NextResponse.json({ error: "Failed to suggest routes" }, { status: 500 })
  }
}

// Decode polyline from Google Maps API
function decodePolyline(encoded: string) {
  const points = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let result = 0
    let shift = 0
    let b

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlat = result & 1 ? ~(result >> 1) : result >> 1
    lat += dlat

    result = 0
    shift = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlng = result & 1 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    })
  }

  return points
}
