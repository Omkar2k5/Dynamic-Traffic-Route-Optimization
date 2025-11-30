"use client"

import { useEffect, useRef, useState } from "react"
import { MapControls } from "./map-controls"
import { MapLegend } from "./map-legend"
import { LocationInput } from "./location-input"
import { mockIncidents, mockSignals } from "@/lib/mock-data"
import { subscribeToCameras, initializeSampleData } from "@/lib/firebase-service"
import type { CameraData } from "@/lib/firebase-types"

declare global {
  interface Window {
    google: any
    __googleMapsLoading?: boolean
    __googleMapsLoaded?: boolean
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
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number, address: string} | null>(null)
  const [userLocationMarker, setUserLocationMarker] = useState<any>(null)
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null)

  // Get user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      console.log('Requesting user location...')
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
          console.log('User location obtained:', location)
          setCurrentLocation(location)
        },
        (error) => {
          console.warn('Geolocation error:', error.message)
          // Fallback to San Francisco
          setCurrentLocation({ lat: 37.7749, lng: -122.4194 })
        }
      )
    } else {
      console.warn('Geolocation not supported')
      setCurrentLocation({ lat: 37.7749, lng: -122.4194 })
    }
  }, [])

  const initializeMap = () => {
    console.log('=== INITIALIZING MAP ===')
    console.log('Map initialization state:', { 
      mapRef: !!mapRef.current, 
      google: !!window.google,
      googleMaps: !!(window.google && window.google.maps),
      mapRefDimensions: mapRef.current ? {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
        display: window.getComputedStyle(mapRef.current).display
      } : null
    })
    
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.error('Map initialization failed:', { mapRef: !!mapRef.current, google: !!window.google, maps: !!(window.google?.maps) })
      setError('Map container or Google Maps API not available')
      return
    }

    try {
      console.log('Creating Google Maps instance...')
      const center = currentLocation || { lat: 37.7749, lng: -122.4194 }
      const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: center,
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

      console.log('Map instance created successfully:', !!mapInstance)
      setMap(mapInstance)
      console.log('Map state updated, adding markers...')
      
      // Add user location marker if available
      if (currentLocation) {
        const userMarker = new window.google.maps.Marker({
          position: currentLocation,
          map: mapInstance,
          title: 'Your Current Location',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#4285f4",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        })
        
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="color: #333; font-family: system-ui;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #4285f4;">
                📍 Your Current Location
              </h3>
              <p style="margin: 0; font-size: 12px; color: #666;">
                Lat: ${currentLocation.lat.toFixed(6)}<br/>
                Lng: ${currentLocation.lng.toFixed(6)}
              </p>
            </div>
          `
        })
        
        userMarker.addListener("click", () => {
          infoWindow.open(mapInstance, userMarker)
        })
        
        setUserLocationMarker(userMarker)
      }
      
      addMarkers(mapInstance)
      if (cameras.length > 0) {
        addCameraMarkers(mapInstance, cameras)
      }
      console.log('Map initialization complete successfully!')
    } catch (error) {
      console.error('Error creating map instance:', error)
      setError('Failed to create Google Maps instance: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadGoogleMaps = async () => {
      try {
        console.log('Starting Google Maps load...')
        
        // Check if already loaded and working
        if (window.google && window.google.maps) {
          console.log('Google Maps already available')
          setApiKeyLoaded(true)
          return
        }

        // Check if already loading
        if (window.__googleMapsLoading) {
          console.log('Google Maps already loading, waiting...')
          let checkCount = 0
          const checkGoogle = () => {
            if (window.google && window.google.maps && isMounted) {
              console.log('Google Maps now available')
              setApiKeyLoaded(true)
            } else if (isMounted && checkCount < 300) {
              checkCount++
              setTimeout(checkGoogle, 100)
            } else if (isMounted) {
              setApiKeyLoaded(true)
            }
          }
          checkGoogle()
          return
        }

        // Check if script already exists in DOM
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
        if (existingScript) {
          console.log('Google Maps script already exists, checking if loaded...')
          
          // If Google Maps is already available, use it immediately
          if (window.google && window.google.maps) {
            console.log('Google Maps already fully loaded')
            setApiKeyLoaded(true)
            return
          }
          
          // Otherwise wait for it to load
          console.log('Waiting for existing Google Maps script to load...')
          let checkCount = 0
          const checkGoogle = () => {
            if (window.google && window.google.maps && isMounted) {
              console.log('Google Maps now available from existing script')
              setApiKeyLoaded(true)
            } else if (isMounted && checkCount < 300) { // Max 30 seconds
              checkCount++
              setTimeout(checkGoogle, 100)
            } else if (isMounted) {
              console.warn('Timeout waiting for Google Maps from existing script')
              setApiKeyLoaded(true) // Force load anyway
            }
          }
          checkGoogle()
          return
        }

        // Mark as loading
        window.__googleMapsLoading = true

        // Fetch API key and load script
        console.log('Fetching Google Maps config...')
        const response = await fetch('/api/maps-config')
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to get API key')
        }
        
        const { apiKey } = await response.json()
        console.log('Config received:', { apiKey: !!apiKey, keyLength: apiKey?.length })

        if (!apiKey) {
          throw new Error('API key is empty')
        }

        // Load Google Maps script
        console.log('Loading Google Maps script...')
        const script = document.createElement('script')
        
        // Use async loading without callback - simpler and more reliable
        const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=marker,geometry,places&v=weekly`
        console.log('Script URL (key hidden):', scriptUrl.replace(apiKey, '***'))
        
        script.src = scriptUrl
        script.async = true
        script.defer = false

        // Set a timeout to detect if script never loads
        let loadTimeout: ReturnType<typeof setTimeout> | null = null
        
        script.onload = () => {
          console.log('Google Maps script loaded, checking API availability...')
          if (loadTimeout) {
            clearTimeout(loadTimeout)
          }
          
          // Poll for Google Maps API availability
          const checkAPI = () => {
            if (window.google && window.google.maps && isMounted) {
              console.log('Google Maps API is ready!')
              window.__googleMapsLoading = false
              window.__googleMapsLoaded = true
              setApiKeyLoaded(true)
            } else if (isMounted) {
              setTimeout(checkAPI, 50)
            }
          }
          checkAPI()
        }

        script.onerror = (error) => {
          console.error('Failed to load Google Maps script:', error)
          if (loadTimeout) {
            clearTimeout(loadTimeout)
          }
          window.__googleMapsLoading = false
          if (isMounted) {
            setError('Failed to load Google Maps script: ' + (error instanceof Event ? error.type : String(error)))
          }
        }

        // Set timeout for script load (30 seconds)
        loadTimeout = setTimeout(() => {
          console.error('Google Maps script load timeout - API key may be invalid or restricted')
          console.error('Possible causes:')
          console.error('1. API key is invalid or expired')
          console.error('2. Maps JavaScript API is not enabled in Google Cloud Console')
          console.error('3. API key is restricted to specific domains/IPs')
          console.error('4. CORS or network issue')
          window.__googleMapsLoading = false
          if (isMounted) {
            setError('Google Maps API timeout - check your API key and ensure Maps JavaScript API is enabled in Google Cloud Console')
          }
        }, 30000)

        document.head.appendChild(script)
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error('Google Maps loading error:', errorMessage)
        console.error('Error details:', err)
        window.__googleMapsLoading = false
        if (isMounted) {
          setError(errorMessage)
          setApiKeyLoaded(false)
        }
      }
    }

    loadGoogleMaps()

    return () => {
      isMounted = false
    }
  }, [])

  // Initialize map when both Google Maps API is loaded and mapRef is ready
  useEffect(() => {
    if (apiKeyLoaded && !map && mapRef.current && currentLocation && window.google?.maps) {
      console.log('Effect: API loaded and ref ready, initializing map now')
      initializeMap()
    }
  }, [apiKeyLoaded, currentLocation]) // Removed 'map' from dependencies to prevent infinite loop

  // Subscribe to Firebase camera data
  useEffect(() => {
    if (!map) return

    console.log('Map is ready, initializing Firebase integration')
    
    let unsubscribe: (() => void) | null = null
    let initDataPromise: Promise<void> | null = null
    
    try {
      unsubscribe = subscribeToCameras((camerasData) => {
        console.log('Received camera data:', camerasData.length, 'cameras')
        setCameras(camerasData)
        if (map && camerasData.length > 0) {
          addCameraMarkers(map, camerasData)
        }
      })

      // Initialize sample data if no cameras exist (only once)
      initDataPromise = (async () => {
        try {
          await initializeSampleData()
          console.log('Sample camera data initialized')
        } catch (err) {
          console.log('Sample data already exists or failed to initialize:', err)
        }
      })()
    } catch (err) {
      console.error('Firebase integration error:', err)
    }

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
      // Note: We don't need to cancel initDataPromise as it's fire-and-forget
    }
  }, [map]) // Keep map dependency but ensure it only subscribes once per map instance

  // Handle user location selection
  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    console.log('Location selected:', location)
    setUserLocation(location)
    
    if (map) {
      // Center map on selected location
      map.setCenter({ lat: location.lat, lng: location.lng })
      map.setZoom(15)
      
      // Remove existing user location marker
      if (userLocationMarker) {
        userLocationMarker.setMap(null)
      }
      
      // Add new user location marker
      const marker = new window.google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: map,
        title: `Your Location: ${location.address}`,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#4285f4", // Google blue
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      })
      
      // Add info window for user location
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="color: #333; font-family: system-ui;">
            <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #4285f4;">
              📍 Your Location
            </h3>
            <p style="margin: 0; font-size: 12px; color: #666;">
              ${location.address}
            </p>
          </div>
        `
      })
      
      marker.addListener("click", () => {
        infoWindow.open(map, marker)
      })
      
      setUserLocationMarker(marker)
    }
  }

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
      if (userLocationMarker && userLocationMarker.setMap) {
        userLocationMarker.setMap(null)
      }
      markersRef.current = []
      cameraMarkersRef.length = 0
    }
  }, [])

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
    
    // If user location is available, center on that, otherwise use current location or default
    if (userLocation) {
      map.setCenter({ lat: userLocation.lat, lng: userLocation.lng })
      map.setZoom(15)
    } else if (currentLocation) {
      map.setCenter(currentLocation)
      map.setZoom(13)
    } else {
      map.setCenter({ lat: 37.7749, lng: -122.4194 })
      map.setZoom(13)
    }
    
    setSelectedIncident(null)
  }

  console.log('Render state:', { error, apiKeyLoaded, map: !!map })

  if (error) {
    return (
      <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">Error loading map</p>
          <p className="text-xs text-slate-500">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!apiKeyLoaded) {
    return (
      <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-2">Loading map...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-slate-900">
      <div ref={mapRef} className="w-full h-full absolute inset-0" style={{ minHeight: '400px' }} />
      
      {/* Location Input - only show when map is loaded */}
      {apiKeyLoaded && map && (
        <LocationInput onLocationSelect={handleLocationSelect} />
      )}
      
      <MapControls onZoom={handleZoom} onReset={handleReset} />
      <MapLegend />
    </div>
  )
}
