"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, AlertTriangle, Zap, TrendingUp } from "lucide-react"

const stats = [
  {
    title: "Active Incidents",
    value: "12",
    icon: AlertTriangle,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    title: "Avg Flow",
    value: "78%",
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Signals Active",
    value: "247",
    icon: Zap,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    title: "System Health",
    value: "99.2%",
    icon: Activity,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
]

export function StatsOverview() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-glow-cyan">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <div className={`p-1.5 rounded ${stat.bgColor}`}>
                <stat.icon className={`w-3 h-3 ${stat.color}`} />
              </div>
              {stat.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
