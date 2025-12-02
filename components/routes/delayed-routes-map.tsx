"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, AlertTriangle, Clock, Loader2 } from "lucide-react"
import { loadGoogleMapsAPI, getGoogleMapsConfig, isGoogleMapsAPILoaded } from "@/lib/google-maps-loader"

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

interface DelayedRoutesMapProps {
  centerCoordinate?: { lat: number; lng: number }
  radius?: number
  onRouteSelect?: (routeId: string) => void
  selectedRoute?: string | null
}

export function DelayedRoutesMap({ 
  centerCoordinate, 
  radius = 0.05, 
  onRouteSelect,
  selectedRoute 
}: DelayedRoutesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [routes, setRoutes] = useState<DelayedRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBypassRoutes, setShowBypassRoutes] = useState(true)
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false)
  const [mapsConfig, setMapsConfig] = useState<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const markersRef = useRef<any[]>([])
  const routesRef = useRef<any[]>([])

  // Callback ref to track when map container is mounted
  const mapContainerRef = (node: HTMLDivElement | null) => {
    if (node) {
      mapRef.current = node
      setMapReady(true)
    }
  }

  // Load Google Maps API on mount
  useEffect(() => {
    loadGoogleMaps()
  }, [])

  // Initialize map when API is loaded and container is ready
  useEffect(() => {
    console.log('Map init check:', { apiKeyLoaded, mapReady, hasGoogle: !!window.google?.maps, mapsConfig, hasMap: !!map })
    if (apiKeyLoaded && mapReady && mapRef.current && window.google?.maps && mapsConfig?.apiKey !== 'demo' && !map) {
      console.log('Initializing map...')
      initializeMap()
    }
  }, [apiKeyLoaded, mapsConfig, mapReady])

  // Add routes to map when routes change or map is ready
  useEffect(() => {
    if (map && routes.length > 0) {
      addRoutesToMap(map, routes)
    }
  }, [map, routes, showBypassRoutes])

  useEffect(() => {
    fetchDelayedRoutes()
  }, [centerCoordinate, radius])

  const loadGoogleMaps = async () => {
    try {
      // Check if already loaded
      if (isGoogleMapsAPILoaded()) {
        console.log('Google Maps API already loaded')
        setApiKeyLoaded(true)
        return
      }

      console.log('Loading Google Maps API...')
      const config = await getGoogleMapsConfig()
      console.log('Maps config:', config)
      setMapsConfig(config)

      // Check if running in demo mode
      if (config.apiKey === 'demo') {
        console.log('Running in demo mode - maps will not be interactive')
        setError('Google Maps API key not configured. Running in demo mode.')
        setApiKeyLoaded(true)
        return
      }

      await loadGoogleMapsAPI(config)
      console.log('Google Maps API loaded successfully')
      setApiKeyLoaded(true)
    } catch (error) {
      console.error('Failed to load Google Maps API:', error)
      setError(error instanceof Error ? error.message : 'Failed to load maps')
      setApiKeyLoaded(true) // Set to true to show fallback
    }
  }

  const fetchDelayedRoutes = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (centerCoordinate) {
        params.append('lat', centerCoordinate.lat.toString())
        params.append('lng', centerCoordinate.lng.toString())
      }
      params.append('radius', radius.toString())
      params.append('bypass', 'true')
      
      const response = await fetch(`/api/delayed-routes?${params.toString()}`)
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

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !window.google.maps) return

    try {
      const center = centerCoordinate || { lat: 18.5204, lng: 73.8567 } // Default to Pune
      
      const mapInstance = new window.google.maps.Map(mapRef.current, {
        zoom: 18,
        center: center,
        mapTypeId: "roadmap",
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
      })

      setMap(mapInstance)
      console.log('Map initialized successfully')
      
    } catch (error) {
      console.error('Error initializing map:', error)
      setError('Failed to initialize map')
    }
  }

  const addRoutesToMap = async (mapInstance: any, routesData: DelayedRoute[]) => {
    // Clear existing routes
    routesRef.current.forEach(route => route.setMap(null))
    markersRef.current.forEach(marker => marker.setMap(null))
    routesRef.current = []
    markersRef.current = []

    const directionsService = new window.google.maps.DirectionsService()
    const bounds = new window.google.maps.LatLngBounds()

    for (const route of routesData) {
      // Parse congested area coordinates
      const coords = route.congestedArea.location.match(/Coordinates: ([-\d.]+), ([-\d.]+)/)
      if (!coords) continue

      const congestedLat = parseFloat(coords[1])
      const congestedLng = parseFloat(coords[2])
      const congestedPoint = { lat: congestedLat, lng: congestedLng }
      
      bounds.extend(congestedPoint)

      // Add congested area marker (red circle)
      const congestionMarker = new window.google.maps.Marker({
        position: congestedPoint,
        map: mapInstance,
        title: `Congested Area: ${route.congestedArea.trafficLevel}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: getTrafficColor(route.congestedArea.trafficLevel),
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      })

      // Info window for congested area
      const congestionInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #333; font-family: system-ui; padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #ef4444;">
              🚧 Congested Area - Avoid This Route
            </h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
              ${route.congestedArea.location}
            </p>
            <div style="font-size: 11px; color: #888;">
              <div>Traffic Level: <strong>${route.congestedArea.trafficLevel}</strong></div>
              <div>Vehicles Affected: ${route.congestedArea.vehicleCount}</div>
              <div>Delay: +${route.originalRoute.delay} minutes</div>
              <div style="color: #22c55e; margin-top: 4px;">✓ ${route.alternativeRoutes.length} bypass routes available</div>
            </div>
          </div>
        `
      })

      congestionMarker.addListener("click", () => {
        congestionInfoWindow.open(mapInstance, congestionMarker)
      })

      markersRef.current.push(congestionMarker)

      // Draw bypass routes using Directions API
      if (showBypassRoutes && route.alternativeRoutes.length > 0) {
        // Create bypass routes that go around the congested area (scaled for 50m radius)
        const bypassDirections = [
          { name: 'North', latOffset: 0.0005, lngOffset: 0 },
          { name: 'South', latOffset: -0.0005, lngOffset: 0 },
          { name: 'East', latOffset: 0, lngOffset: 0.0005 },
          { name: 'West', latOffset: 0, lngOffset: -0.0005 },
        ]

        for (let i = 0; i < Math.min(bypassDirections.length, route.alternativeRoutes.length); i++) {
          const bypass = bypassDirections[i]
          const altRoute = route.alternativeRoutes[i]
          
          // Create waypoint that goes around the congested area
          const waypointLat = congestedLat + bypass.latOffset
          const waypointLng = congestedLng + bypass.lngOffset
          
          // Origin and destination are offset from congested point (scaled for 50m)
          const origin = { 
            lat: congestedLat - 0.0003, 
            lng: congestedLng - 0.0003 
          }
          const destination = { 
            lat: congestedLat + 0.0003, 
            lng: congestedLng + 0.0003 
          }
          
          bounds.extend(origin)
          bounds.extend(destination)
          bounds.extend({ lat: waypointLat, lng: waypointLng })

          try {
            const result = await new Promise<any>((resolve, reject) => {
              directionsService.route({
                origin: origin,
                destination: destination,
                waypoints: [{ location: { lat: waypointLat, lng: waypointLng }, stopover: false }],
                travelMode: window.google.maps.TravelMode.DRIVING,
                avoidHighways: false,
                avoidTolls: true,
              }, (response: any, status: any) => {
                if (status === 'OK') {
                  resolve(response)
                } else {
                  reject(status)
                }
              })
            })

            // Draw the bypass route
            const directionsRenderer = new window.google.maps.DirectionsRenderer({
              map: mapInstance,
              directions: result,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#22c55e', // Green for bypass routes
                strokeOpacity: 0.8,
                strokeWeight: 4,
              },
            })

            routesRef.current.push(directionsRenderer)

            // Add bypass route marker
            const bypassMarker = new window.google.maps.Marker({
              position: { lat: waypointLat, lng: waypointLng },
              map: mapInstance,
              title: altRoute.name,
              icon: {
                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 5,
                fillColor: '#22c55e',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                rotation: getRotation(bypass.name),
              },
            })

            const bypassInfoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="color: #333; font-family: system-ui; padding: 8px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #22c55e;">
                    ✓ ${altRoute.name}
                  </h3>
                  <div style="font-size: 11px; color: #666;">
                    <div>Distance: ${altRoute.distance} km</div>
                    <div>Time: ${altRoute.estimatedTime} min</div>
                    <div style="color: #22c55e; font-weight: 600;">Saves ${altRoute.savings} minutes</div>
                  </div>
                </div>
              `
            })

            bypassMarker.addListener("click", () => {
              bypassInfoWindow.open(mapInstance, bypassMarker)
            })

            markersRef.current.push(bypassMarker)

          } catch (error) {
            console.log(`Could not get directions for ${bypass.name} bypass:`, error)
            // Fallback: draw a simple polyline
            const bypassPath = [
              origin,
              { lat: waypointLat, lng: waypointLng },
              destination
            ]

            const bypassRoute = new window.google.maps.Polyline({
              path: bypassPath,
              geodesic: true,
              strokeColor: "#22c55e",
              strokeOpacity: 0.7,
              strokeWeight: 3,
              map: mapInstance,
            })

            routesRef.current.push(bypassRoute)
          }
        }
      }

      // Draw the congested route (red dashed line through the congested area)
      const congestedRoutePath = [
        { lat: congestedLat - 0.0003, lng: congestedLng - 0.0003 },
        congestedPoint,
        { lat: congestedLat + 0.0003, lng: congestedLng + 0.0003 }
      ]

      const congestedRoute = new window.google.maps.Polyline({
        path: congestedRoutePath,
        geodesic: true,
        strokeColor: "#ef4444",
        strokeOpacity: 0.9,
        strokeWeight: 5,
        icons: [{
          icon: {
            path: 'M 0,-1 0,1',
            strokeOpacity: 1,
            scale: 3
          },
          offset: '0',
          repeat: '15px'
        }],
        map: mapInstance,
      })

      routesRef.current.push(congestedRoute)
    }

    // Fit map bounds to show all routes
    if (routesData.length > 0) {
      mapInstance.fitBounds(bounds, { padding: 50 })
    }
  }

  const getRotation = (direction: string): number => {
    switch (direction) {
      case 'North': return 0
      case 'South': return 180
      case 'East': return 90
      case 'West': return 270
      default: return 0
    }
  }

  const getTrafficColor = (trafficLevel: string) => {
    switch (trafficLevel?.toUpperCase()) {
      case 'TRAFFIC_JAM':
        return '#dc2626' // Red
      case 'HEAVY':
        return '#ea580c' // Orange
      case 'MODERATE':
        return '#eab308' // Yellow
      case 'LIGHT':
        return '#22c55e' // Green
      default:
        return '#6b7280' // Gray
    }
  }

  if (loading) {
    return (
      <Card className="border-glow-cyan h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading delayed routes map...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !apiKeyLoaded) {
    return (
      <Card className="border-glow-cyan h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">{error}</p>
            <Button onClick={fetchDelayedRoutes} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Demo map when Google Maps is not available
  if ((error && apiKeyLoaded) || mapsConfig?.apiKey === 'demo') {
    return (
      <Card className="border-glow-cyan h-96">
        <CardHeader>
          <CardTitle className="text-sm">Delayed Routes Map - Demo Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full h-64 bg-slate-700 rounded-lg border-2 border-blue-500/30 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-purple-900/20"></div>
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-1 p-4">
              {Array.from({ length: 48 }, (_, i) => (
                <div 
                  key={i}
                  className={`rounded ${Math.random() > 0.8 ? 'bg-red-400/40' : 'bg-slate-600/50'}`}
                ></div>
              ))}
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black/50 rounded p-2">
                <div className="text-blue-400 text-sm font-mono">DEMO MAP</div>
                <div className="text-slate-400 text-xs">
                  {routes.length} delayed routes detected within {radius}km
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            {routes.slice(0, 3).map((route, index) => (
              <div key={route.id} className="p-2 rounded border border-border/50 bg-red-500/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{route.name}</span>
                  <Badge variant="destructive" className="text-xs">
                    {route.congestedArea.trafficLevel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {route.alternativeRoutes.length} bypass routes available
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-glow-cyan">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Delayed Routes Map
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {radius}km radius
            </Badge>
            <Badge variant="outline" className="text-xs">
              {routes.length} routes
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Map Container */}
          <div className="relative w-full h-[500px] rounded-lg overflow-hidden bg-slate-900">
            <div ref={mapContainerRef} className="w-full h-full" />
            
            {/* Map Legend */}
            <div className="absolute bottom-2 left-2 bg-black/70 rounded p-2 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-1 bg-red-500 rounded"></div>
                <span className="text-white">Congested Route (Avoid)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-500 rounded"></div>
                <span className="text-white">Bypass Route (Recommended)</span>
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={showBypassRoutes ? "default" : "outline"}
                size="sm"
                onClick={() => setShowBypassRoutes(!showBypassRoutes)}
              >
                {showBypassRoutes ? "Hide" : "Show"} Bypass Routes
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchDelayedRoutes}>
                Refresh
              </Button>
            </div>
          </div>

          {/* Route List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Delayed Routes</h4>
            {routes.map((route) => (
              <div
                key={route.id}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  selectedRoute === route.id 
                    ? "border-cyan-400 bg-cyan-500/10" 
                    : "border-border/50 hover:border-cyan-400/50"
                }`}
                onClick={() => onRouteSelect?.(route.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{route.name}</span>
                  <Badge 
                    variant="destructive" 
                    className="text-xs"
                  >
                    {route.congestedArea.trafficLevel}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>+{route.originalRoute.delay}m delay</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    <span>{route.alternativeRoutes.length} alternatives</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{route.congestedArea.vehicleCount} vehicles</span>
                  </div>
                </div>
                
                {route.alternativeRoutes.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/30">
                    <p className="text-xs text-green-600">
                      Best bypass saves {Math.max(...route.alternativeRoutes.map(r => r.savings))} minutes
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}