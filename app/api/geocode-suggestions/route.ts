import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] })
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.warn("Google Maps API key not configured")
      return NextResponse.json({ suggestions: [] })
    }

    // Use Google Places API for autocomplete
    const placesUrl = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json")
    placesUrl.searchParams.append("input", query)
    placesUrl.searchParams.append("key", apiKey)
    placesUrl.searchParams.append("components", "country:in") // Restrict to India
    placesUrl.searchParams.append("language", "en")

    const placesResponse = await fetch(placesUrl.toString())
    const placesData = await placesResponse.json()

    if (placesData.status !== "OK" || !placesData.predictions) {
      console.warn("Places API error:", placesData.status)
      return NextResponse.json({ suggestions: [] })
    }

    // Convert predictions to suggestions with coordinates
    const suggestions = await Promise.all(
      placesData.predictions.slice(0, 8).map(async (prediction: any) => {
        try {
          // Get place details to get coordinates
          const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json")
          detailsUrl.searchParams.append("place_id", prediction.place_id)
          detailsUrl.searchParams.append("fields", "geometry,formatted_address")
          detailsUrl.searchParams.append("key", apiKey)

          const detailsResponse = await fetch(detailsUrl.toString())
          const detailsData = await detailsResponse.json()

          if (detailsData.status === "OK" && detailsData.result?.geometry?.location) {
            return {
              name: prediction.description,
              lat: detailsData.result.geometry.location.lat,
              lng: detailsData.result.geometry.location.lng,
            }
          }
        } catch (error) {
          console.error("Error fetching place details:", error)
        }
        return null
      })
    )

    // Filter out null values
    const validSuggestions = suggestions.filter((s) => s !== null)

    return NextResponse.json({ suggestions: validSuggestions })
  } catch (error) {
    console.error("Geocoding suggestions error:", error)
    return NextResponse.json({ suggestions: [] }, { status: 500 })
  }
}
