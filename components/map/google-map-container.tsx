"use client"

import { useEffect, useRef, useState } from "react"
import { MapControls } from "./map-controls"
import { MapLegend } from "./map-legend"
import { mockIncidents, mockSignals } from "@/lib/mock-data"

declare global {
  interface Window {
    google: any
  }
}

export function GoogleMapContainer() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null)
  const markersRef = useRef<any[]>([])
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        const response = await fetch("/api/maps-config")
        if (!response.ok) {
          throw new Error("Failed to fetch Google Maps configuration")
        }

        const { apiKey } = await response.json()

        const script = document.createElement("script")
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,clustering`
        script.async = true
        script.defer = true

        script.onload = () => {
          if (mapRef.current && window.google) {
            setApiKeyLoaded(true)
            initializeMap()
          }
        }

        script.onerror = () => {
          setError("Failed to load Google Maps API. Check your API key and domain restrictions.")
          setApiKeyLoaded(false)
        }

        document.head.appendChild(script)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Google Maps")
        setApiKeyLoaded(false)
      }
    }

    loadGoogleMaps()
  }, [])

  const initializeMap = () => {
    if (!mapRef.current || !window.google) return

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: 37.7749, lng: -122.4194 },
      mapTypeId: "roadmap",
      styles: [
        {
          elementType: "geometry",
          stylers: [{ color: "#1a1a2e" }],
        },
        {
          elementType: "labels.text.stroke",
          stylers: [{ color: "#1a1a2e" }],
        },
        {
          elementType: "labels.text.fill",
          stylers: [{ color: "#bdbdbd" }],
        },
        {
          featureType: "administrative.country",
          elementType: "geometry.stroke",
          stylers: [{ color: "#212121" }],
        },
        {
          featureType: "administrative.land_parcel",
          elementType: "labels.text.fill",
          stylers: [{ color: "#757575" }],
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
          stylers: [{ color: "#2c2c2c" }],
        },
        {
          featureType: "road",
          elementType: "labels.text.fill",
          stylers: [{ color: "#8a8a8a" }],
        },
        {
          featureType: "road.arterial",
          elementType: "geometry",
          stylers: [{ color: "#373737" }],
        },
        {
          featureType: "road.highway",
          elementType: "geometry",
          stylers: [{ color: "#3c3c3c" }],
        },
        {
          featureType: "transit",
          elementType: "geometry",
          stylers: [{ color: "#2f333c" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#0c1a2e" }],
        },
        {
          featureType: "water",
          elementType: "labels.text.fill",
          stylers: [{ color: "#515c6d" }],
        },
      ],
    })

    setMap(mapInstance)
    addMarkers(mapInstance)
  }

  const addMarkers = (mapInstance: any) => {
    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    // Add incident markers
    mockIncidents.forEach((incident) => {
      const color = incident.severity === "critical" ? "#ef4444" : "#eab308"
      const marker = new window.google.maps.Marker({
        position: incident.location,
        map: mapInstance,
        title: incident.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      })

      marker.addListener("click", () => {
        setSelectedIncident(incident.id)
        mapInstance.panTo(incident.location)
        mapInstance.setZoom(15)
      })

      markersRef.current.push(marker)
    })

    // Add signal markers (sample)
    mockSignals.slice(0, 50).forEach((signal) => {
      const color =
        signal.currentPhase === "green" ? "#22c55e" : signal.currentPhase === "yellow" ? "#eab308" : "#ef4444"
      const marker = new window.google.maps.Marker({
        position: signal.location,
        map: mapInstance,
        title: `Signal: ${signal.currentPhase}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: color,
          fillOpacity: 0.8,
          strokeColor: "#ffffff",
          strokeWeight: 1,
        },
      })

      markersRef.current.push(marker)
    })
  }

  const handleZoom = (direction: "in" | "out") => {
    if (!map) return
    const currentZoom = map.getZoom()
    map.setZoom(direction === "in" ? currentZoom + 1 : currentZoom - 1)
  }

  const handleReset = () => {
    if (!map) return
    map.setCenter({ lat: 37.7749, lng: -122.4194 })
    map.setZoom(13)
    setSelectedIncident(null)
  }

  if (error) {
    return (
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading map</p>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      </div>
    )
  }

  if (!apiKeyLoaded) {
    return (
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-2">Loading map...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900">
      <div ref={mapRef} className="w-full h-full" />
      <MapControls onZoom={handleZoom} onReset={handleReset} />
      <MapLegend />
    </div>
  )
}
