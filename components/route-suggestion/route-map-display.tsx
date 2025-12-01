"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { loadGoogleMapsAPI, getGoogleMapsConfig, isGoogleMapsAPILoaded } from "@/lib/google-maps-loader"
import type { RoutePoint, SuggestedRoute } from "@/lib/route-utils"

interface RouteMapDisplayProps {
  startPoint: RoutePoint | null
  endPoint: RoutePoint | null
  selectedRoute: SuggestedRoute | null
  allRoutes?: SuggestedRoute[]
}

export function RouteMapDisplay({ startPoint, endPoint, selectedRoute, allRoutes = [] }: RouteMapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const polylines = useRef<any[]>([])
  const startMarker = useRef<any>(null)
  const endMarker = useRef<any>(null)
  const [googleLoaded, setGoogleLoaded] = useState(false)
  const [mapsConfig, setMapsConfig] = useState<any>(null)
  const [loadingError, setLoadingError] = useState<string | null>(null)

  // Route colors for different routes
  const routeColors = ["#00d4ff", "#ff6b6b", "#51cf66", "#ffd43b", "#a78bfa"]

  // Load Google Maps API on component mount
  useEffect(() => {
    const initializeGoogleMaps = async () => {
      try {
        // Check if already loaded
        if (isGoogleMapsAPILoaded()) {
          console.log('Google Maps API already loaded')
          setGoogleLoaded(true)
          return
        }

        console.log('Loading Google Maps API...')
        const config = await getGoogleMapsConfig()
        console.log('Maps config:', config)
        setMapsConfig(config)

        // Check if running in demo mode
        if (config.apiKey === 'demo') {
          console.log('Running in demo mode - maps will not be interactive')
          setGoogleLoaded(true)
          return
        }

        await loadGoogleMapsAPI(config)
        console.log('Google Maps API loaded successfully')
        setGoogleLoaded(true)
      } catch (error) {
        console.error('Failed to load Google Maps API:', error)
        setLoadingError(error instanceof Error ? error.message : 'Failed to load maps')
        setGoogleLoaded(true) // Set to true to show fallback
      }
    }

    initializeGoogleMaps()
  }, [])

  useEffect(() => {
    // Only run when we have all required data
    if (!mapContainer.current || !startPoint || !endPoint || !googleLoaded) {
      return
    }

    const google = (window as any).google
    if (!google || !google.maps || mapsConfig?.apiKey === 'demo') {
      console.warn("Google Maps API not available or in demo mode")
      return
    }

    // Initialize map only once
    if (!map.current) {
      map.current = new google.maps.Map(mapContainer.current, {
        zoom: 12,
        center: { lat: (startPoint.lat + endPoint.lat) / 2, lng: (startPoint.lng + endPoint.lng) / 2 },
        styles: [
          { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
          {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#bdbdbd" }],
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#757575" }],
          },
          {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#181818" }],
          },
          {
            featureType: "road",
            elementType: "geometry.fill",
            stylers: [{ color: "#2c3e50" }],
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#8a8a8a" }],
          },
          {
            featureType: "road.highway",
            elementType: "geometry.fill",
            stylers: [{ color: "#3d5a80" }],
          },
          {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3f5f" }],
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#0f1419" }],
          },
        ],
      })

      // Add start marker
      startMarker.current = new google.maps.Marker({
        position: { lat: startPoint.lat, lng: startPoint.lng },
        map: map.current,
        title: "Start",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#4285f4",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      })

      // Add end marker
      endMarker.current = new google.maps.Marker({
        position: { lat: endPoint.lat, lng: endPoint.lng },
        map: map.current,
        title: "End",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: "#ea4335",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      })
    }

    // Clear previous polylines
    polylines.current.forEach((polyline) => {
      polyline.setMap(null)
    })
    polylines.current = []

    // Display all routes using polylines (no Directions API needed)
    if (allRoutes.length > 0) {
      allRoutes.forEach((route, index) => {
        const isSelected = selectedRoute?.id === route.id
        const color = routeColors[index % routeColors.length]
        const weight = isSelected ? 5 : 3
        const opacity = isSelected ? 1 : 0.6

        // Create polyline from route points
        if (route.route && route.route.length > 0) {
          const polyline = new google.maps.Polyline({
            path: route.route,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: opacity,
            strokeWeight: weight,
            map: map.current,
          })

          polylines.current.push(polyline)
        }
      })
    }
    // Only trigger when critical dependencies change, not on every prop change
  }, [startPoint?.lat, startPoint?.lng, endPoint?.lat, endPoint?.lng, selectedRoute?.id, allRoutes.length, googleLoaded])

  // Show loading state
  if (!googleLoaded) {
    return (
      <Card className="p-4 bg-card border-card-border overflow-hidden">
        <div className="w-full h-96 rounded-lg bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading Maps...</p>
          </div>
        </div>
      </Card>
    )
  }

  // Show error state
  if (loadingError && mapsConfig?.apiKey === 'demo') {
    return (
      <Card className="p-4 bg-card border-card-border overflow-hidden">
        <div className="w-full h-96 rounded-lg bg-background flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Maps Configuration Needed</h3>
            <p className="text-muted-foreground text-sm">
              Google Maps API key is not configured. Set <code className="bg-muted px-2 py-1 rounded text-xs">GOOGLE_MAPS_API_KEY</code> and <code className="bg-muted px-2 py-1 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> environment variables for full functionality.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 bg-card border-card-border overflow-hidden">
      <div ref={mapContainer} className="w-full h-96 rounded-lg bg-background" />
    </Card>
  )
}
