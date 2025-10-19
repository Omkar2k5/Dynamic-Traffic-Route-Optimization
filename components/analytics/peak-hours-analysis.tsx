"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function PeakHoursAnalysis() {
  const peakHoursData = [
    { hour: "00:00", traffic: 15 },
    { hour: "04:00", traffic: 10 },
    { hour: "08:00", traffic: 65 },
    { hour: "12:00", traffic: 55 },
    { hour: "16:00", traffic: 75 },
    { hour: "20:00", traffic: 60 },
    { hour: "23:00", traffic: 25 },
  ]

  return (
    <Card className="border-glow-cyan">
      <CardHeader>
        <CardTitle className="text-sm">Peak Hours Pattern</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={peakHoursData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="oklch(0.65 0 0)" />
            <YAxis tick={{ fontSize: 10 }} stroke="oklch(0.65 0 0)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.12 0 0)",
                border: "1px solid oklch(0.2 0 0)",
                borderRadius: "0.5rem",
              }}
              labelStyle={{ color: "oklch(0.95 0 0)" }}
            />
            <Line
              type="monotone"
              dataKey="traffic"
              stroke="oklch(0.65 0.22 200)"
              strokeWidth={2}
              dot={{ fill: "oklch(0.65 0.22 200)", r: 4 }}
              name="Congestion %"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
