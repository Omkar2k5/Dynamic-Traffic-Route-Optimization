import { type NextRequest, NextResponse } from "next/server"

// Mock location database for autocomplete suggestions
const LOCATION_DATABASE: Record<string, Array<{ name: string; lat: number; lng: number }>> = {
  san: [
    { name: "San Francisco, CA", lat: 37.7749, lng: -122.4194 },
    { name: "San Jose, CA", lat: 37.3382, lng: -121.8863 },
    { name: "San Diego, CA", lat: 32.7157, lng: -117.1611 },
    { name: "Santa Clara, CA", lat: 37.3541, lng: -121.9552 },
  ],
  downtown: [
    { name: "Downtown San Francisco, CA", lat: 37.7898, lng: -122.3972 },
    { name: "Downtown Oakland, CA", lat: 37.8044, lng: -122.2712 },
  ],
  airport: [
    { name: "San Jose Airport, CA", lat: 37.6213, lng: -122.379 },
    { name: "San Francisco Airport, CA", lat: 37.6213, lng: -122.379 },
  ],
  oakland: [{ name: "Oakland, CA", lat: 37.8044, lng: -122.2712 }],
  times: [{ name: "Times Square, NYC", lat: 40.758, lng: -73.9855 }],
  central: [{ name: "Central Park, NYC", lat: 40.7829, lng: -73.9654 }],
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const lowerQuery = query.toLowerCase()
    const suggestions: Array<{ name: string; lat: number; lng: number }> = []

    // Search through location database
    for (const [key, locations] of Object.entries(LOCATION_DATABASE)) {
      if (key.includes(lowerQuery)) {
        suggestions.push(...locations)
      }
    }

    // Also search by location name
    for (const locations of Object.values(LOCATION_DATABASE)) {
      for (const location of locations) {
        if (location.name.toLowerCase().includes(lowerQuery) && !suggestions.includes(location)) {
          suggestions.push(location)
        }
      }
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 5) })
  } catch (error) {
    console.error("Geocoding suggestions error:", error)
    return NextResponse.json({ suggestions: [] }, { status: 500 })
  }
}
