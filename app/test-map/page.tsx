"use client"

import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    google: any
  }
}

export default function TestMapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMap = async () => {
      try {
        // Fetch API key
        const response = await fetch('/api/maps-config')
        if (!response.ok) throw new Error('Failed to get API key')
        
        const { apiKey } = await response.json()
        console.log('API key fetched:', !!apiKey)

        // Check if script already exists
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
          console.log('Google Maps script already exists')
          initMap()
          return
        }

        // Create script
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`
        script.async = true

        // Global callback
        ;(window as any).initMap = () => {
          console.log('Google Maps callback triggered')
          initMap()
        }

        script.onerror = () => {
          setError('Failed to load Google Maps')
          setLoading(false)
        }

        document.head.appendChild(script)
      } catch (err) {
        console.error('Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    const initMap = () => {
      console.log('Initializing map...', { 
        mapRef: !!mapRef.current, 
        google: !!window.google 
      })

      if (!mapRef.current || !window.google) {
        setError('Map container or Google Maps not available')
        setLoading(false)
        return
      }

      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7749, lng: -122.4194 },
          zoom: 13,
          mapTypeId: 'roadmap'
        })

        console.log('Map created successfully:', map)
        
        // Add a test marker
        new window.google.maps.Marker({
          position: { lat: 37.7749, lng: -122.4194 },
          map: map,
          title: 'Test Marker'
        })

        setLoading(false)
      } catch (err) {
        console.error('Map creation error:', err)
        setError(err instanceof Error ? err.message : 'Failed to create map')
        setLoading(false)
      }
    }

    loadMap()
  }, [])

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Map Test - Error</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Google Maps Test</h1>
      {loading && (
        <div className="mb-4 text-blue-600">
          Loading Google Maps...
        </div>
      )}
      <div 
        ref={mapRef} 
        className="w-full h-96 border border-gray-300 bg-gray-100"
        style={{ minHeight: '400px' }}
      />
    </div>
  )
}