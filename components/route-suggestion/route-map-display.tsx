"use client"

import { useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import type { RoutePoint, SuggestedRoute } from "@/lib/route-utils"

interface RouteMapDisplayProps {
  startPoint: RoutePoint | null
  endPoint: RoutePoint | null
  selectedRoute: SuggestedRoute | null
}

export function RouteMapDisplay({ startPoint, endPoint, selectedRoute }: RouteMapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const directionsService = useRef<any>(null)
  const directionsRenderer = useRef<any>(null)

  useEffect(() => {
    if (!mapContainer.current || !startPoint || !endPoint) return

    const google = (window as any).google
    if (!google || !google.maps) {
      console.error("Google Maps API not loaded")
      return
    }

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

      directionsService.current = new google.maps.DirectionsService()
      directionsRenderer.current = new google.maps.DirectionsRenderer({
        map: map.current,
        polylineOptions: {
          strokeColor: "#00d4ff",
          strokeWeight: 4,
          strokeOpacity: 0.8,
        },
        markerOptions: {
          icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        },
      })
    }

    if (directionsService.current && directionsRenderer.current) {
      directionsService.current.route(
        {
          origin: { lat: startPoint.lat, lng: startPoint.lng },
          destination: { lat: endPoint.lat, lng: endPoint.lng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === google.maps.DirectionsStatus.OK && directionsRenderer.current) {
            directionsRenderer.current.setDirections(result)
          }
        },
      )
    }
  }, [startPoint, endPoint])

  return (
    <Card className="p-4 bg-card border-card-border overflow-hidden">
      <div ref={mapContainer} className="w-full h-96 rounded-lg bg-background" />
    </Card>
  )
}
