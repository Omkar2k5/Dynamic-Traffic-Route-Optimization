"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Activity, AlertTriangle } from "lucide-react"
import { mockMetrics } from "@/lib/mock-data"

export function AnalyticsOverview() {
  const currentMetrics = mockMetrics[mockMetrics.length - 1]
  const previousMetrics = mockMetrics[mockMetrics.length - 2]

  const congestionTrend = currentMetrics.averageCongestion - previousMetrics.averageCongestion
  const incidentTrend = currentMetrics.totalIncidents - previousMetrics.totalIncidents
  const healthTrend = currentMetrics.systemHealth - previousMetrics.systemHealth
  const responseTrend = currentMetrics.responseTime - previousMetrics.responseTime

  const stats = [
    {
      title: "Avg Congestion",
      value: `${currentMetrics.averageCongestion}%`,
      trend: congestionTrend,
      icon: Activity,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Active Incidents",
      value: currentMetrics.totalIncidents,
      trend: incidentTrend,
      icon: AlertTriangle,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "System Health",
      value: `${currentMetrics.systemHealth}%`,
      trend: healthTrend,
      icon: Activity,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Avg Response",
      value: `${currentMetrics.responseTime}m`,
      trend: -responseTrend,
      icon: TrendingUp,
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        const isTrendPositive = stat.trend >= 0

        return (
          <Card key={stat.title} className="border-glow-cyan">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${stat.bgColor}`}>
                    <Icon className={`w-3 h-3 ${stat.color}`} />
                  </div>
                  {stat.title}
                </span>
                {stat.trend !== 0 && (
                  <span
                    className={`flex items-center gap-0.5 text-xs ${isTrendPositive ? "text-red-500" : "text-green-500"}`}
                  >
                    {isTrendPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(stat.trend)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
