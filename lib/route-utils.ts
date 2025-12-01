import type { CCTVCamera, MLDetection, CCTVAnalytics } from "./types"

export interface RoutePoint {
  lat: number
  lng: number
}

export interface SuggestedRoute {
  id: string
  name: string
  distance: number
  estimatedTime: number
  route: RoutePoint[]
  trafficIssues: TrafficIssueOnRoute[]
  isAlternate: boolean
  timeSavings?: number
  score?: number
  hasHighway?: boolean
}

export interface TrafficIssueOnRoute {
  cameraId: string
  cameraName: string
  detectionType: string
  severity: string
  confidence: number
  distance: number
}

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Check if a point is near a route (within 0.5 km)
export function isPointNearRoute(
  point: RoutePoint,
  routeStart: RoutePoint,
  routeEnd: RoutePoint,
  threshold = 0.5,
): boolean {
  const distToStart = calculateDistance(point.lat, point.lng, routeStart.lat, routeStart.lng)
  const distToEnd = calculateDistance(point.lat, point.lng, routeEnd.lat, routeEnd.lng)
  const routeDistance = calculateDistance(routeStart.lat, routeStart.lng, routeEnd.lat, routeEnd.lng)

  // Check if point is approximately on the route
  const distViaPoint = distToStart + distToEnd
  return Math.abs(distViaPoint - routeDistance) < threshold
}

// Find traffic issues on a specific route
export function findTrafficOnRoute(
  routeStart: RoutePoint,
  routeEnd: RoutePoint,
  cameras: CCTVCamera[],
  detections: MLDetection[],
  analytics: CCTVAnalytics[],
): TrafficIssueOnRoute[] {
  const issues: TrafficIssueOnRoute[] = []

  cameras.forEach((camera) => {
    if (isPointNearRoute(camera.location, routeStart, routeEnd)) {
      // Check for recent detections at this camera
      const cameraDetections = detections.filter((d) => d.cameraId === camera.id)
      const cameraAnalytics = analytics.find((a) => a.cameraId === camera.id)

      // Add issues if there are detections or high congestion
      cameraDetections.forEach((detection) => {
        if (detection.severity !== "low") {
          issues.push({
            cameraId: camera.id,
            cameraName: camera.name,
            detectionType: detection.detectionType,
            severity: detection.severity,
            confidence: detection.confidence,
            distance: calculateDistance(routeStart.lat, routeStart.lng, camera.location.lat, camera.location.lng),
          })
        }
      })

      // Add congestion issue if high
      if (cameraAnalytics && cameraAnalytics.congestionLevel === "high") {
        const existingIssue = issues.find((i) => i.cameraId === camera.id)
        if (!existingIssue) {
          issues.push({
            cameraId: camera.id,
            cameraName: camera.name,
            detectionType: "congestion",
            severity: "high",
            confidence: cameraAnalytics.trafficDensity,
            distance: calculateDistance(routeStart.lat, routeStart.lng, camera.location.lat, camera.location.lng),
          })
        }
      }
    }
  })

  return issues.sort((a, b) => a.distance - b.distance)
}

// Generate alternate routes (simplified - in production would use real routing API)
export function generateAlternateRoutes(
  startPoint: RoutePoint,
  endPoint: RoutePoint,
  primaryRoute: SuggestedRoute,
): SuggestedRoute[] {
  const alternates: SuggestedRoute[] = []

  // Generate 2 alternate routes with slight variations
  for (let i = 0; i < 2; i++) {
    const variation = (i + 1) * 0.02 // Slight lat/lng variation
    const alternateRoute: SuggestedRoute = {
      id: `alternate-${i + 1}`,
      name: `Alternate Route ${i + 1}`,
      distance: primaryRoute.distance * (0.95 + Math.random() * 0.1), // 95-105% of primary
      estimatedTime: primaryRoute.estimatedTime * (0.95 + Math.random() * 0.1),
      route: [
        startPoint,
        {
          lat: startPoint.lat + variation,
          lng: startPoint.lng + variation,
        },
        {
          lat: endPoint.lat - variation,
          lng: endPoint.lng - variation,
        },
        endPoint,
      ],
      trafficIssues: [],
      isAlternate: true,
      timeSavings: primaryRoute.estimatedTime - primaryRoute.estimatedTime * (0.95 + Math.random() * 0.1),
    }
    alternates.push(alternateRoute)
  }

  return alternates
}

// Main function to suggest routes based on traffic
export function suggestRoutes(
  startPoint: RoutePoint,
  endPoint: RoutePoint,
  cameras: CCTVCamera[],
  detections: MLDetection[],
  analytics: CCTVAnalytics[],
): SuggestedRoute[] {
  const distance = calculateDistance(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng)
  const estimatedTime = Math.round((distance / 40) * 60) // Assume 40 km/h average

  // Create primary route
  const primaryRoute: SuggestedRoute = {
    id: "primary",
    name: "Shortest Route",
    distance,
    estimatedTime,
    route: [startPoint, endPoint],
    trafficIssues: findTrafficOnRoute(startPoint, endPoint, cameras, detections, analytics),
    isAlternate: false,
  }

  // If traffic issues found, generate and evaluate alternate routes
  if (primaryRoute.trafficIssues.length > 0) {
    const alternates = generateAlternateRoutes(startPoint, endPoint, primaryRoute)

    // Filter alternates that are shorter than primary with traffic
    const viableAlternates = alternates.filter((alt) => {
      const trafficDelay = primaryRoute.trafficIssues.reduce((acc) => acc + 5, 0) // 5 min per issue
      return alt.estimatedTime < primaryRoute.estimatedTime + trafficDelay
    })

    return [primaryRoute, ...viableAlternates]
  }

  return [primaryRoute]
}
