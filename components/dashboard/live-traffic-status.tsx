"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { staticDatabase, CCTVLocation } from "@/lib/static-database"
import { Activity, MapPin, Clock, Car } from "lucide-react"

export function LiveTrafficStatus() {
  const [mlCamera, setMlCamera] = useState<CCTVLocation | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isConnected, setIsConnected] = useState<boolean>(true)

  useEffect(() => {
    // Fetch live ML model camera data from MongoDB API
    const fetchMlCamera = async () => {
      try {
        const response = await fetch('/api/traffic/realtime')
        const result = await response.json()
        
        if (result.success && result.data && result.data.length > 0) {
          // Find ML model camera from API data
          const mlCam = result.data.find((camera: any) => 
            camera.id === "cctv1" || 
            camera.name === "cctv1" ||
            camera.name.includes("CCTV") ||
            camera.name.includes("ML Model") ||
            camera.name.includes("Pune")
          )

          setMlCamera(mlCam || null)
          setIsConnected(true)
        } else {
          console.warn('No ML camera data found in API response')
          setIsConnected(false)
        }
        
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Failed to fetch live traffic data:', error)
        setIsConnected(false)
        
        // Fallback to static database if API fails
        const cameras = staticDatabase.getAllCameras()
        const mlCam = cameras.find(camera => 
          camera.id === "cctv1" || 
          camera.name === "cctv1" ||
          camera.name.includes("CCTV") ||
          camera.name.includes("ML Model") ||
          camera.name.includes("Pune")
        )
        setMlCamera(mlCam || null)
      }
    }

    // Initial load
    fetchMlCamera()

    // Update every 2 seconds to show real-time changes
    const interval = setInterval(fetchMlCamera, 2000)

    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'FREE_FLOW': return 'bg-green-500'
      case 'LIGHT': return 'bg-yellow-500'
      case 'MODERATE': return 'bg-orange-500'
      case 'HEAVY': return 'bg-red-500'
      case 'TRAFFIC_JAM': return 'bg-red-700'
      default: return 'bg-gray-500'
    }
  }

  const getStatusTextColor = (level: string) => {
    switch (level) {
      case 'FREE_FLOW': return 'text-green-400'
      case 'LIGHT': return 'text-yellow-400'
      case 'MODERATE': return 'text-orange-400'
      case 'HEAVY': return 'text-red-400'
      case 'TRAFFIC_JAM': return 'text-red-300'
      default: return 'text-gray-400'
    }
  }

  if (!mlCamera) {
    return (
      <Card className="border-glow-cyan bg-gradient-to-br from-slate-900 to-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Live ML Traffic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2 mx-auto"></div>
            </div>
            <p className="text-xs text-slate-500 mt-2">Connecting to ML model...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-glow-cyan bg-gradient-to-br from-slate-900 to-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          Live ML Traffic 🤖
          <Badge variant="outline" className="ml-auto text-xs border-blue-500 text-blue-400">
            REAL-TIME
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Camera Info */}
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-200">{mlCamera.name}</p>
            <p className="text-xs text-slate-400">{mlCamera.location}</p>
          </div>
        </div>

        {/* Traffic Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Status:</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(mlCamera.trafficData?.congestionLevel || 'MODERATE')} animate-pulse`}></div>
            <span className={`text-sm font-medium ${getStatusTextColor(mlCamera.trafficData?.congestionLevel || 'MODERATE')}`}>
              {(mlCamera.trafficData?.congestionLevel || 'MODERATE').replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Vehicle Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300">Vehicles:</span>
          <div className="flex items-center gap-1">
            <Car className="w-3 h-3 text-slate-400" />
            <span className="text-sm font-medium text-slate-200">
              {mlCamera.trafficData?.vehicleCount || 0}
            </span>
          </div>
        </div>



        {/* Last Updated */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-700">
          <span className="text-xs text-slate-400">Last Update:</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span className="text-xs text-slate-400">
              {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center justify-center pt-1">
          <Badge 
            variant="outline" 
            className={`text-xs ${
              isConnected 
                ? 'border-green-500 text-green-400' 
                : 'border-red-500 text-red-400'
            }`}
          >
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}