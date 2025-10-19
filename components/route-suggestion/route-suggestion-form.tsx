"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { MapPin, ArrowRightLeft, Loader2 } from "lucide-react"
import type { RoutePoint } from "@/lib/route-utils"

interface RouteSuggestionFormProps {
  onSuggest: (startPoint: RoutePoint, endPoint: RoutePoint) => void
  isLoading: boolean
}

interface LocationSuggestion {
  name: string
  lat: number
  lng: number
}

export function RouteSuggestionForm({ onSuggest, isLoading }: RouteSuggestionFormProps) {
  const [startLocation, setStartLocation] = useState("San Francisco, CA")
  const [endLocation, setEndLocation] = useState("San Jose, CA")
  const [startSuggestions, setStartSuggestions] = useState<LocationSuggestion[]>([])
  const [endSuggestions, setEndSuggestions] = useState<LocationSuggestion[]>([])
  const [showStartSuggestions, setShowStartSuggestions] = useState(false)
  const [showEndSuggestions, setShowEndSuggestions] = useState(false)
  const [geocodingLoading, setGeocodingLoading] = useState(false)
  const startInputRef = useRef<HTMLInputElement>(null)
  const endInputRef = useRef<HTMLInputElement>(null)

  const geocodeLocation = async (locationName: string): Promise<LocationSuggestion | null> => {
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationName }),
      })
      const data = await response.json()
      return data.location || null
    } catch (error) {
      console.error("Geocoding error:", error)
      return null
    }
  }

  const handleStartLocationChange = async (value: string) => {
    setStartLocation(value)
    if (value.length > 2) {
      setGeocodingLoading(true)
      const response = await fetch("/api/geocode-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/javascript" },
        body: JSON.stringify({ query: value }),
      })
      const data = await response.json()
      setStartSuggestions(data.suggestions || [])
      setShowStartSuggestions(true)
      setGeocodingLoading(false)
    } else {
      setStartSuggestions([])
      setShowStartSuggestions(false)
    }
  }

  const handleEndLocationChange = async (value: string) => {
    setEndLocation(value)
    if (value.length > 2) {
      setGeocodingLoading(true)
      const response = await fetch("/api/geocode-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: value }),
      })
      const data = await response.json()
      setEndSuggestions(data.suggestions || [])
      setShowEndSuggestions(true)
      setGeocodingLoading(false)
    } else {
      setEndSuggestions([])
      setShowEndSuggestions(false)
    }
  }

  const handleSelectStartLocation = (suggestion: LocationSuggestion) => {
    setStartLocation(suggestion.name)
    setShowStartSuggestions(false)
  }

  const handleSelectEndLocation = (suggestion: LocationSuggestion) => {
    setEndLocation(suggestion.name)
    setShowEndSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeocodingLoading(true)

    try {
      const startPoint = await geocodeLocation(startLocation)
      const endPoint = await geocodeLocation(endLocation)

      if (startPoint && endPoint) {
        onSuggest({ lat: startPoint.lat, lng: startPoint.lng }, { lat: endPoint.lat, lng: endPoint.lng })
      }
    } finally {
      setGeocodingLoading(false)
    }
  }

  const handleSwap = () => {
    const temp = startLocation
    setStartLocation(endLocation)
    setEndLocation(temp)
  }

  return (
    <Card className="p-6 bg-card border-card-border">
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary" />
        Route Details
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Start Location */}
        <div>
          <label className="text-sm font-medium text-foreground/80 block mb-2">Start Location</label>
          <div className="relative">
            <Input
              ref={startInputRef}
              type="text"
              placeholder="Enter start location (e.g., Times Square, NYC)"
              value={startLocation}
              onChange={(e) => handleStartLocationChange(e.target.value)}
              onFocus={() => startSuggestions.length > 0 && setShowStartSuggestions(true)}
              className="bg-input border-input-border text-foreground"
            />
            {geocodingLoading && <Loader2 className="absolute right-3 top-3 w-4 h-4 text-primary animate-spin" />}
            {showStartSuggestions && startSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-card-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {startSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectStartLocation(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-primary/10 transition-colors text-sm text-foreground border-b border-card-border last:border-b-0"
                  >
                    <div className="font-medium">{suggestion.name}</div>
                    <div className="text-xs text-foreground/60">
                      {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleSwap}
            className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
        </div>

        {/* End Location */}
        <div>
          <label className="text-sm font-medium text-foreground/80 block mb-2">End Location</label>
          <div className="relative">
            <Input
              ref={endInputRef}
              type="text"
              placeholder="Enter destination (e.g., Central Park, NYC)"
              value={endLocation}
              onChange={(e) => handleEndLocationChange(e.target.value)}
              onFocus={() => endSuggestions.length > 0 && setShowEndSuggestions(true)}
              className="bg-input border-input-border text-foreground"
            />
            {geocodingLoading && <Loader2 className="absolute right-3 top-3 w-4 h-4 text-primary animate-spin" />}
            {showEndSuggestions && endSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-card-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {endSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectEndLocation(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-primary/10 transition-colors text-sm text-foreground border-b border-card-border last:border-b-0"
                  >
                    <div className="font-medium">{suggestion.name}</div>
                    <div className="text-xs text-foreground/60">
                      {suggestion.lat.toFixed(4)}, {suggestion.lng.toFixed(4)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || geocodingLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLoading || geocodingLoading ? "Analyzing Routes..." : "Suggest Routes"}
        </Button>
      </form>

      {/* Quick Presets */}
      <div className="mt-6 pt-6 border-t border-card-border">
        <p className="text-xs font-medium text-foreground/60 mb-3">Quick Presets</p>
        <div className="space-y-2">
          <button
            onClick={() => {
              setStartLocation("Downtown San Francisco, CA")
              setEndLocation("San Jose Airport, CA")
            }}
            className="w-full text-left px-3 py-2 rounded text-sm bg-accent/10 hover:bg-accent/20 text-accent transition-colors"
          >
            Downtown SF → Airport
          </button>
          <button
            onClick={() => {
              setStartLocation("Oakland, CA")
              setEndLocation("San Francisco, CA")
            }}
            className="w-full text-left px-3 py-2 rounded text-sm bg-accent/10 hover:bg-accent/20 text-accent transition-colors"
          >
            Oakland → San Francisco
          </button>
        </div>
      </div>
    </Card>
  )
}
