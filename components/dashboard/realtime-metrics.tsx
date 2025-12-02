"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface MetricData {
  time: string
  congestion: number
  health: number
  vehicles: number
}

export function RealtimeMetrics() {
  const [chartData, setChartData] = useState<MetricData[]>([])

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/traffic/realtime')
        const result = await response.json()
        
        if (result.success && result.data) {
          const now = new Date()
          const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          
          // Calculate live metrics from API data
          const cameras = result.data
          const totalVehicles = cameras.reduce((sum: number, cam: any) => sum + cam.trafficData.vehicleCount, 0)
          const avgCongestion = cameras.length > 0 ? 
            Math.round(cameras.reduce((sum: number, cam: any) => {
              // Convert congestion level to percentage
              const level = cam.trafficData.congestionLevel
              const percentage = level === 'FREE_FLOW' ? 10 : 
                               level === 'LIGHT' ? 30 : 
                               level === 'MODERATE' ? 60 : 
                               level === 'HEAVY' ? 80 : 95
              return sum + percentage
            }, 0) / cameras.length) : 0
          
          const systemHealth = Math.max(85, Math.min(100, 100 - avgCongestion * 0.1))
          
          const newDataPoint = {
            time: timeString,
            congestion: avgCongestion,
            health: Math.round(systemHealth),
            vehicles: totalVehicles
          }
          
          setChartData(prev => {
            const updated = [...prev, newDataPoint].slice(-10) // Keep last 10 data points
            return updated
          })
        }
      } catch (error) {
        console.error('Failed to fetch live metrics:', error)
      }
    }

    // Initial load
    fetchMetrics()

    // Update every 3 seconds for smooth chart updates
    const interval = setInterval(fetchMetrics, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="border-glow-cyan">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Live Traffic Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={chartData}>
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
              dataKey="health"
              stroke="oklch(0.75 0.2 140)"
              dot={false}
              strokeWidth={2}
              name="System Health %"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
