import type {
  Incident,
  TrafficFlow,
  Route,
  TrafficSignal,
  Officer,
  TrafficMetrics,
  CCTVCamera,
  MLDetection,
  CCTVAnalytics,
} from "./types"

export const mockIncidents: Incident[] = [
  {
    id: "1",
    title: "Multi-vehicle collision",
    description: "Three vehicles involved in collision, blocking 2 lanes",
    location: {
      lat: 37.7749,
      lng: -122.4194,
      address: "Highway 101 & Oak St",
    },
    severity: "critical",
    status: "active",
    createdAt: new Date(Date.now() - 5 * 60000),
    updatedAt: new Date(),
    assignedOfficer: "officer-1",
  },
  {
    id: "2",
    title: "Traffic congestion",
    description: "Heavy traffic in downtown core during rush hour",
    location: {
      lat: 37.7849,
      lng: -122.4094,
      address: "Downtown Core",
    },
    severity: "warning",
    status: "active",
    createdAt: new Date(Date.now() - 12 * 60000),
    updatedAt: new Date(),
  },
  {
    id: "3",
    title: "Signal malfunction",
    description: "Traffic signal stuck on red",
    location: {
      lat: 37.7649,
      lng: -122.4294,
      address: "Main St & 5th Ave",
    },
    severity: "warning",
    status: "investigating",
    createdAt: new Date(Date.now() - 23 * 60000),
    updatedAt: new Date(),
    assignedOfficer: "officer-2",
  },
]

export const mockTrafficFlows: TrafficFlow[] = [
  {
    id: "1",
    location: "Highway 101 North",
    congestionLevel: 85,
    averageSpeed: 25,
    capacity: 100,
    timestamp: new Date(),
  },
  {
    id: "2",
    location: "Downtown Core",
    congestionLevel: 72,
    averageSpeed: 15,
    capacity: 100,
    timestamp: new Date(),
  },
  {
    id: "3",
    location: "Highway 101 South",
    congestionLevel: 45,
    averageSpeed: 55,
    capacity: 100,
    timestamp: new Date(),
  },
]

export const mockRoutes: Route[] = [
  {
    id: "1",
    name: "Downtown to Airport",
    startPoint: { lat: 37.7749, lng: -122.4194 },
    endPoint: { lat: 37.6213, lng: -122.379 },
    distance: 13.5,
    estimatedTime: 28,
    currentDelay: 12,
    incidents: ["1"],
  },
  {
    id: "2",
    name: "North Bay to Downtown",
    startPoint: { lat: 37.8044, lng: -122.2712 },
    endPoint: { lat: 37.7749, lng: -122.4194 },
    distance: 25.3,
    estimatedTime: 45,
    currentDelay: 8,
    incidents: [],
  },
]

export const mockSignals: TrafficSignal[] = Array.from({ length: 247 }, (_, i) => ({
  id: `signal-${i}`,
  location: {
    lat: 37.7749 + (Math.random() - 0.5) * 0.1,
    lng: -122.4194 + (Math.random() - 0.5) * 0.1,
  },
  status: Math.random() > 0.05 ? "active" : "maintenance",
  currentPhase: ["red", "yellow", "green"][Math.floor(Math.random() * 3)] as "red" | "yellow" | "green",
  cycleTime: 60 + Math.random() * 30,
  lastUpdated: new Date(),
}))

export const mockOfficers: Officer[] = [
  {
    id: "officer-1",
    name: "Officer Sarah Chen",
    badge: "SF-2847",
    status: "on-scene",
    location: { lat: 37.7749, lng: -122.4194 },
    assignedIncidents: ["1"],
  },
  {
    id: "officer-2",
    name: "Officer James Rodriguez",
    badge: "SF-2891",
    status: "responding",
    location: { lat: 37.7649, lng: -122.4294 },
    assignedIncidents: ["3"],
  },
  {
    id: "officer-3",
    name: "Officer Maria Garcia",
    badge: "SF-2756",
    status: "available",
    assignedIncidents: [],
  },
]

export const mockMetrics: TrafficMetrics[] = Array.from({ length: 24 }, (_, i) => ({
  timestamp: new Date(Date.now() - (23 - i) * 60 * 60000),
  totalIncidents: Math.floor(Math.random() * 20) + 5,
  averageCongestion: Math.floor(Math.random() * 40) + 40,
  systemHealth: Math.floor(Math.random() * 10) + 90,
  activeSignals: 240 + Math.floor(Math.random() * 10),
  responseTime: Math.floor(Math.random() * 10) + 8,
}))

export const mockCCTVCameras: CCTVCamera[] = [
  {
    id: "camera-1",
    name: "Highway 101 North - Mile 5",
    location: {
      lat: 37.7849,
      lng: -122.4094,
      address: "Highway 101 North",
    },
    status: "active",
    streamUrl: "/highway-traffic-stream.jpg",
    resolution: "1080p",
    lastUpdated: new Date(),
  },
  {
    id: "camera-2",
    name: "Downtown Core - Main St",
    location: {
      lat: 37.7749,
      lng: -122.4194,
      address: "Main St & 5th Ave",
    },
    status: "active",
    streamUrl: "/downtown-traffic-stream.jpg",
    resolution: "1080p",
    lastUpdated: new Date(),
  },
  {
    id: "camera-3",
    name: "Highway 101 South - Mile 2",
    location: {
      lat: 37.7649,
      lng: -122.4294,
      address: "Highway 101 South",
    },
    status: "active",
    streamUrl: "/highway-south-stream.jpg",
    resolution: "720p",
    lastUpdated: new Date(),
  },
  {
    id: "camera-4",
    name: "Bay Bridge Approach",
    location: {
      lat: 37.7949,
      lng: -122.3994,
      address: "Bay Bridge",
    },
    status: "active",
    streamUrl: "/bridge-traffic-stream.jpg",
    resolution: "1080p",
    lastUpdated: new Date(),
  },
  {
    id: "camera-5",
    name: "Airport Road - Exit 12",
    location: {
      lat: 37.6213,
      lng: -122.379,
      address: "Airport Road",
    },
    status: "maintenance",
    streamUrl: "/airport-road-stream.jpg",
    resolution: "720p",
    lastUpdated: new Date(Date.now() - 2 * 60 * 60000),
  },
]

export const mockMLDetections: MLDetection[] = [
  {
    id: "detection-1",
    cameraId: "camera-1",
    timestamp: new Date(Date.now() - 5 * 60000),
    detectionType: "congestion",
    confidence: 94,
    severity: "high",
    description: "Heavy traffic congestion detected on Highway 101 North",
    location: { lat: 37.7849, lng: -122.4094 },
  },
  {
    id: "detection-2",
    cameraId: "camera-2",
    timestamp: new Date(Date.now() - 12 * 60000),
    detectionType: "accident",
    confidence: 87,
    severity: "critical",
    description: "Multi-vehicle accident detected at Main St intersection",
    location: { lat: 37.7749, lng: -122.4194 },
  },
  {
    id: "detection-3",
    cameraId: "camera-3",
    timestamp: new Date(Date.now() - 23 * 60000),
    detectionType: "stalled-vehicle",
    confidence: 91,
    severity: "medium",
    description: "Stalled vehicle blocking right lane on Highway 101 South",
    location: { lat: 37.7649, lng: -122.4294 },
  },
  {
    id: "detection-4",
    cameraId: "camera-4",
    timestamp: new Date(Date.now() - 45 * 60000),
    detectionType: "debris",
    confidence: 78,
    severity: "medium",
    description: "Debris detected on Bay Bridge approach",
    location: { lat: 37.7949, lng: -122.3994 },
  },
]

export const mockCCTVAnalytics: CCTVAnalytics[] = [
  {
    cameraId: "camera-1",
    timestamp: new Date(),
    trafficDensity: 85,
    averageVehicleSpeed: 25,
    detectedIncidents: 2,
    congestionLevel: "high",
  },
  {
    cameraId: "camera-2",
    timestamp: new Date(),
    trafficDensity: 72,
    averageVehicleSpeed: 15,
    detectedIncidents: 3,
    congestionLevel: "high",
  },
  {
    cameraId: "camera-3",
    timestamp: new Date(),
    trafficDensity: 45,
    averageVehicleSpeed: 55,
    detectedIncidents: 1,
    congestionLevel: "low",
  },
  {
    cameraId: "camera-4",
    timestamp: new Date(),
    trafficDensity: 62,
    averageVehicleSpeed: 40,
    detectedIncidents: 1,
    congestionLevel: "medium",
  },
]
