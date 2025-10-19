"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { mockMetrics } from "@/lib/mock-data"

export function SystemHealthChart() {
  const chartData = mockMetrics.map((m) => ({
    time: m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    health: m.systemHealth,
  }))

  return (
    <Card className="border-glow-green">
      <CardHeader>
        <CardTitle className="text-sm">System Health (24h)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="oklch(0.65 0 0)" />
            <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.65 0 0)" domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.2 0 0)",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "oklch(0.95 0 0)" }}
            />
            <Area
              type="monotone"
              dataKey="health"
              stroke="oklch(0.75 0.2 140)"
              fill="oklch(0.75 0.2 140)"
              fillOpacity={0.2}
              name="Health %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
