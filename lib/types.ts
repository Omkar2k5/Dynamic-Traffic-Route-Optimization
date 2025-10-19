// User and authentication types
export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "officer" | "analyst"
  avatar?: string
}

// Traffic and incident types
export interface Incident {
  id: string
  title: string
  description: string
  location: {
    lat: number
    lng: number
    address: string
  }
  severity: "critical" | "warning" | "info"
  status: "active" | "resolved" | "investigating"
  createdAt: Date
  updatedAt: Date
  assignedOfficer?: string
}

export interface TrafficFlow {
  id: string
  location: string
  congestionLevel: number // 0-100
  averageSpeed: number
  capacity: number
  timestamp: Date
}

export interface Route {
  id: string
  name: string
  startPoint: { lat: number; lng: number }
  endPoint: { lat: number; lng: number }
  distance: number
  estimatedTime: number
  currentDelay: number
  incidents: string[]
}

export interface TrafficSignal {
  id: string
  location: { lat: number; lng: number }
  status: "active" | "inactive" | "maintenance"
  currentPhase: "red" | "yellow" | "green"
  cycleTime: number
  lastUpdated: Date
}

export interface Officer {
  id: string
  name: string
  badge: string
  status: "available" | "responding" | "on-scene" | "off-duty"
  location?: { lat: number; lng: number }
  assignedIncidents: string[]
}

export interface CCTVCamera {
  id: string
  name: string
  location: {
    lat: number
    lng: number
    address: string
  }
  status: "active" | "inactive" | "maintenance"
  streamUrl: string
  resolution: "720p" | "1080p" | "4k"
  lastUpdated: Date
}

export interface MLDetection {
  id: string
  cameraId: string
  timestamp: Date
  detectionType: "congestion" | "accident" | "stalled-vehicle" | "debris" | "pedestrian-crossing"
  confidence: number // 0-100
  severity: "low" | "medium" | "high" | "critical"
  description: string
  location?: {
    lat: number
    lng: number
  }
  imageUrl?: string
}

export interface CCTVAnalytics {
  cameraId: string
  timestamp: Date
  trafficDensity: number // 0-100
  averageVehicleSpeed: number
  detectedIncidents: number
  congestionLevel: "low" | "medium" | "high" | "critical"
}

// Analytics types
export interface TrafficMetrics {
  timestamp: Date
  totalIncidents: number
  averageCongestion: number
  systemHealth: number
  activeSignals: number
  responseTime: number
}
