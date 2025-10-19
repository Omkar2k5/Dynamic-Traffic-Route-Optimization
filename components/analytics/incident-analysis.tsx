"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { mockIncidents } from "@/lib/mock-data"

export function IncidentAnalysis() {
  const severityData = [
    {
      name: "Critical",
      count: mockIncidents.filter((i) => i.severity === "critical").length,
    },
    {
      name: "Warning",
      count: mockIncidents.filter((i) => i.severity === "warning").length,
    },
    {
      name: "Info",
      count: mockIncidents.filter((i) => i.severity === "info").length,
    },
  ]

  return (
    <Card className="border-glow-red">
      <CardHeader>
        <CardTitle className="text-sm">Incident Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={severityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="oklch(0.65 0 0)" />
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
            <Bar dataKey="count" fill="oklch(0.65 0.25 25)" name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
