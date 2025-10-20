"use client"

import { useEffect, useRef, useState } from "react"
import { MapControls } from "./map-controls"
import { MapLegend } from "./map-legend"
import { mockIncidents, mockSignals } from "@/lib/mock-data"
import { subscribeToCameras, initializeSampleData } from "@/lib/firebase-service"
import type { CameraData } from "@/lib/firebase-types"
import { loadGoogleMapsAPI, getGoogleMapsConfig, isGoogleMapsAPILoaded } from "@/lib/google-maps-loader"

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
  const [cameras, setCameras] = useState<CameraData[]>([])
  const [cameraMarkersRef] = useState<any[]>([])

  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // Check if already loaded
        if (isGoogleMapsAPILoaded()) {
          setApiKeyLoaded(true)
          if (mapRef.current) {
            initializeMap()
          }
          return
        }

        // Get configuration and load API
        const config = await getGoogleMapsConfig()
        await loadGoogleMapsAPI({
          ...config,
          libraries: ['marker', 'geometry', 'places']
        })

        // API loaded successfully
        if (mapRef.current && window.google) {
          setApiKeyLoaded(true)
          initializeMap()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load Google Maps")
        setApiKeyLoaded(false)
      }
    }

    loadGoogleMaps()
  }, [])

  // Subscribe to Firebase camera data
  useEffect(() => {
    if (!map) return

    const unsubscribe = subscribeToCameras((camerasData) => {
      setCameras(camerasData)
      if (map && camerasData.length > 0) {
        addCameraMarkers(map, camerasData)
      }
    })

    // Initialize sample data if no cameras exist
    const initData = async () => {
      try {
        await initializeSampleData()
      } catch (err) {
        console.log('Sample data already exists or failed to initialize:', err)
      }
    }
    initData()

    return () => {
      unsubscribe()
    }
  }, [map])

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up markers on unmount
      markersRef.current.forEach((marker) => {
        if (marker && marker.setMap) {
          marker.setMap(null)
        }
      })
      cameraMarkersRef.forEach((marker) => {
        if (marker && marker.setMap) {
          marker.setMap(null)
        }
      })
      markersRef.current = []
      cameraMarkersRef.length = 0
    }
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
    if (cameras.length > 0) {
      addCameraMarkers(mapInstance, cameras)
    }
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

  const addCameraMarkers = (mapInstance: any, camerasData: CameraData[]) => {
    // Clear existing camera markers
    cameraMarkersRef.forEach((marker) => marker.setMap(null))
    cameraMarkersRef.length = 0

    // Add camera markers from Firebase
    camerasData.forEach((camera) => {
      // Determine marker color based on traffic and accident status
      let color = "#22c55e" // Green for normal
      let title = `Camera: ${camera.cameraNumber}`
      
      if (camera.accidentStatus.isAccident) {
        color = "#ef4444" // Red for accidents
        title += ` - ACCIDENT (${camera.accidentStatus.severity?.toUpperCase()})`
      } else if (camera.trafficStatus.congestionLevel === "high") {
        color = "#f97316" // Orange for high traffic
        title += ` - High Traffic`
      } else if (camera.trafficStatus.congestionLevel === "medium") {
        color = "#eab308" // Yellow for medium traffic
        title += ` - Medium Traffic`
      }
      
      const marker = new window.google.maps.Marker({
        position: {
          lat: camera.coordinates.latitude,
          lng: camera.coordinates.longitude
        },
        map: mapInstance,
        title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: color,
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      })

      // Add info window for camera details
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #333; font-family: system-ui;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
              ${camera.name || camera.cameraNumber}
            </h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
              ${camera.location || 'Location not specified'}
            </p>
            <div style="font-size: 11px; color: #888;">
              <div>Traffic: ${camera.trafficStatus.congestionLevel} (${camera.trafficStatus.vehicleCount} vehicles)</div>
              <div>Speed: ${camera.trafficStatus.averageSpeed} km/h</div>
              ${camera.accidentStatus.isAccident ? 
                `<div style="color: #ef4444; font-weight: 600;">⚠️ ACCIDENT DETECTED</div>` : 
                '<div style="color: #22c55e;">✓ No incidents</div>'
              }
            </div>
          </div>
        `
      })

      marker.addListener("click", () => {
        infoWindow.open(mapInstance, marker)
        mapInstance.panTo({
          lat: camera.coordinates.latitude,
          lng: camera.coordinates.longitude
        })
        mapInstance.setZoom(16)
      })

      cameraMarkersRef.push(marker)
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
