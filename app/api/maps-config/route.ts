export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    return Response.json({ error: "API key not configured" }, { status: 500 })
  }

  return Response.json({ apiKey })
}
