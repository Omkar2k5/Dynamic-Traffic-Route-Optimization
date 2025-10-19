import { type NextRequest, NextResponse } from "next/server"

// Mock location database for geocoding
const LOCATION_DATABASE: Record<string, { name: string; lat: number; lng: number }> = {
  "san francisco, ca": { name: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
  "san jose, ca": { name: "San Jose, CA", lat: 37.3382, lng: -121.8863 },
  "san diego, ca": { name: "San Diego, CA", lat: 32.7157, lng: -117.1611 },
  "santa clara, ca": { name: "Santa Clara, CA", lat: 37.3541, lng: -121.9552 },
  "downtown san francisco, ca": { name: "Downtown San Francisco, CA", lat: 37.7898, lng: -122.3972 },
  "downtown oakland, ca": { name: "Downtown Oakland, CA", lat: 37.8044, lng: -122.2712 },
  "san jose airport, ca": { name: "San Jose Airport, CA", lat: 37.6213, lng: -122.379 },
  "san francisco airport, ca": { name: "San Francisco Airport, CA", lat: 37.6213, lng: -122.379 },
  "oakland, ca": { name: "Oakland, CA", lat: 37.8044, lng: -122.2712 },
  "times square, nyc": { name: "Times Square, NYC", lat: 40.758, lng: -73.9855 },
  "central park, nyc": { name: "Central Park, NYC", lat: 40.7829, lng: -73.9654 },
  "empire state building, nyc": { name: "Empire State Building, NYC", lat: 40.7484, lng: -73.9857 },
  "brooklyn bridge, nyc": { name: "Brooklyn Bridge, NYC", lat: 40.7061, lng: -73.9969 },
  "los angeles, ca": { name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 },
  "hollywood, ca": { name: "Hollywood, CA", lat: 34.0901, lng: -118.3287 },
}

export async function POST(request: NextRequest) {
  try {
    const { location } = await request.json()

    if (!location || typeof location !== "string") {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 })
    }

    const normalizedLocation = location.toLowerCase().trim()

    // Direct match
    if (LOCATION_DATABASE[normalizedLocation]) {
      return NextResponse.json({ location: LOCATION_DATABASE[normalizedLocation] })
    }

    // Partial match
    for (const [key, value] of Object.entries(LOCATION_DATABASE)) {
      if (key.includes(normalizedLocation) || normalizedLocation.includes(key)) {
        return NextResponse.json({ location: value })
      }
    }

    // If no match found, return a default location
    return NextResponse.json({ error: "Location not found in database", location: null }, { status: 404 })
  } catch (error) {
    console.error("Geocoding error:", error)
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 })
  }
}
