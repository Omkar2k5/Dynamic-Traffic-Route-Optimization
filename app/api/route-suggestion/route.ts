import { type NextRequest, NextResponse } from "next/server"
import { suggestRoutes } from "@/lib/route-utils"
import { mockCCTVCameras, mockMLDetections, mockCCTVAnalytics } from "@/lib/mock-data"

export async function POST(request: NextRequest) {
  try {
    const { startPoint, endPoint } = await request.json()

    if (!startPoint || !endPoint) {
      return NextResponse.json({ error: "Missing start or end point" }, { status: 400 })
    }

    // Get suggested routes with traffic analysis
    const routes = suggestRoutes(startPoint, endPoint, mockCCTVCameras, mockMLDetections, mockCCTVAnalytics)

    return NextResponse.json(routes)
  } catch (error) {
    console.error("Route suggestion error:", error)
    return NextResponse.json({ error: "Failed to suggest routes" }, { status: 500 })
  }
}
