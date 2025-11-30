"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Navigation, Search } from "lucide-react"

interface LocationInputProps {
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void
}

export function LocationInput({ onLocationSelect }: LocationInputProps) {
  const [address, setAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get user's current location using browser geolocation
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.")
      return
    }

    setIsGettingLocation(true)
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        
        try {
          // Reverse geocode to get address
          const address = await reverseGeocode(latitude, longitude)
          setAddress(address)
          onLocationSelect({ lat: latitude, lng: longitude, address })
        } catch (error) {
          console.error("Error getting address:", error)
          onLocationSelect({ 
            lat: latitude, 
            lng: longitude, 
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` 
          })
        }
        
        setIsGettingLocation(false)
      },
      (error) => {
        console.error("Error getting location:", error)
        let message = "Unable to get your location. "
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message += "Location access denied."
            break
          case error.POSITION_UNAVAILABLE:
            message += "Location information unavailable."
            break
          case error.TIMEOUT:
            message += "Location request timed out."
            break
        }
        alert(message)
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    )
  }

  // Geocode address to coordinates
  const geocodeAddress = async () => {
    if (!address.trim() || !window.google) return

    setIsLoading(true)
    
    try {
      const geocoder = new window.google.maps.Geocoder()
      
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === "OK" && results) {
            resolve(results)
          } else {
            reject(new Error(`Geocoding failed: ${status}`))
          }
        })
      })

      if (results.length > 0) {
        const location = results[0].geometry.location
        const formattedAddress = results[0].formatted_address
        
        onLocationSelect({
          lat: location.lat(),
          lng: location.lng(),
          address: formattedAddress
        })
        setAddress(formattedAddress)
      }
    } catch (error) {
      console.error("Geocoding error:", error)
      alert("Could not find the address. Please try a different search.")
    }
    
    setIsLoading(false)
  }

  // Reverse geocode coordinates to address
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    if (!window.google) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    
    try {
      const geocoder = new window.google.maps.Geocoder()
      const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results) {
            resolve(results)
          } else {
            reject(new Error(`Reverse geocoding failed: ${status}`))
          }
        })
      })

      return results[0]?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch (error) {
      console.error("Reverse geocoding error:", error)
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    geocodeAddress()
  }

  return (
    <div className="absolute top-4 left-4 right-4 z-10 bg-slate-800/90 backdrop-blur-sm rounded-lg p-4 shadow-lg">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Enter address or location..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            disabled={isLoading || isGettingLocation}
          />
        </div>
        
        <Button
          type="submit"
          disabled={isLoading || !address.trim() || isGettingLocation}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
        
        <Button
          type="button"
          onClick={getCurrentLocation}
          disabled={isGettingLocation || isLoading}
          className="bg-green-600 hover:bg-green-700 text-white"
          title="Get my current location"
        >
          {isGettingLocation ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Navigation className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  )
}