"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { mockMetrics } from "@/lib/mock-data"

export function TrafficTrendsChart() {
  const chartData = mockMetrics.map((m) => ({
    time: m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    congestion: m.averageCongestion,
    incidents: m.totalIncidents * 5, // Scale for visibility
  }))

  return (
    <Card className="border-glow-cyan">
      <CardHeader>
        <CardTitle className="text-sm">Traffic Trends (24h)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="oklch(0.65 0 0)" />
            <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.65 0 0)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.2 0 0)",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "oklch(0.95 0 0)" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="congestion"
              stroke="oklch(0.65 0.25 25)"
              dot={false}
              strokeWidth={2}
              name="Congestion %"
            />
            <Line
              type="monotone"
              dataKey="incidents"
              stroke="oklch(0.75 0.2 140)"
              dot={false}
              strokeWidth={2}
              name="Incidents (scaled)"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
