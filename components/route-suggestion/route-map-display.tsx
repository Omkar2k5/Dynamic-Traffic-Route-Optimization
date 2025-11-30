"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
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

  // Route colors for different routes
  const routeColors = ["#00d4ff", "#ff6b6b", "#51cf66", "#ffd43b", "#a78bfa"]

  // Wait for Google Maps to be loaded
  useEffect(() => {
    const checkGoogleMaps = () => {
      const google = (window as any).google
      if (google && google.maps) {
        console.log('Google Maps API detected in route-map-display')
        setGoogleLoaded(true)
      } else {
        console.log('Waiting for Google Maps API...')
        setTimeout(checkGoogleMaps, 100)
      }
    }
    
    checkGoogleMaps()
  }, [])

  useEffect(() => {
    // Only run when we have all required data
    if (!mapContainer.current || !startPoint || !endPoint || !googleLoaded) {
      return
    }

    const google = (window as any).google
    if (!google || !google.maps) {
      console.error("Google Maps API not loaded")
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

  return (
    <Card className="p-4 bg-card border-card-border overflow-hidden">
      <div ref={mapContainer} className="w-full h-96 rounded-lg bg-background" />
    </Card>
  )
}
