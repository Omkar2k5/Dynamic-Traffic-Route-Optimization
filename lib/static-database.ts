// Static Database with Location-based Traffic and Accident Detection
// Replaces Firebase configuration with static coordinates and ML analysis data

export interface StaticCoordinates {
  latitude: number;
  longitude: number;
  address: string;
  area: string;
}

export interface TrafficData {
  congestionLevel: 'FREE_FLOW' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'TRAFFIC_JAM';
  vehicleCount: number;
  averageSpeed: number;
  lastUpdated: number;
}

export interface AccidentData {
  isAccident: boolean;
  severity: 'minor' | 'major' | 'critical' | null;
  description: string;
  reportedAt?: number;
  resolvedAt?: number;
}

export interface CCTVLocation extends StaticCoordinates {
  id: string;
  name: string;
  location: string;
  trafficData: TrafficData;
  accidentData: AccidentData;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

// Pre-configured static camera locations with fixed coordinates
export const STATIC_CAMERA_LOCATIONS: CCTVLocation[] = [
  {
    id: "CAM001",
    name: "Downtown Main Intersection",
    location: "Market St & 5th Ave",
    latitude: 37.7749,
    longitude: -122.4194,
    address: "Market Street & 5th Avenue, San Francisco, CA",
    area: "Downtown Financial District",
    trafficData: {
      congestionLevel: "MODERATE",
      vehicleCount: 24,
      averageSpeed: 32,
      lastUpdated: Date.now()
    },
    accidentData: {
      isAccident: false,
      severity: null,
      description: "No incidents reported"
    },
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "CAM002",
    name: "Highway 101 North",
    location: "US-101 N near Van Ness",
    latitude: 37.7849,
    longitude: -122.4094,
    address: "US-101 Northbound near Van Ness Avenue, San Francisco, CA",
    area: "Highway Corridor",
    trafficData: {
      congestionLevel: "HEAVY",
      vehicleCount: 47,
      averageSpeed: 18,
      lastUpdated: Date.now()
    },
    accidentData: {
      isAccident: true,
      severity: "minor",
      description: "Minor fender bender, vehicles moved to shoulder",
      reportedAt: Date.now() - 300000 // 5 minutes ago
    },
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "CAM003",
    name: "Bay Bridge Approach",
    location: "I-80 E Bay Bridge",
    latitude: 37.7649,
    longitude: -122.4294,
    address: "I-80 East Bay Bridge Approach, San Francisco, CA",
    area: "Bridge Access",
    trafficData: {
      congestionLevel: "TRAFFIC_JAM",
      vehicleCount: 89,
      averageSpeed: 8,
      lastUpdated: Date.now()
    },
    accidentData: {
      isAccident: true,
      severity: "critical",
      description: "Multi-vehicle collision blocking lanes",
      reportedAt: Date.now() - 180000 // 3 minutes ago
    },
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "CAM004",
    name: "Civic Center Plaza",
    location: "Civic Center & Polk St",
    latitude: 37.7794,
    longitude: -122.4144,
    address: "Civic Center Plaza & Polk Street, San Francisco, CA",
    area: "Civic Center District",
    trafficData: {
      congestionLevel: "LIGHT",
      vehicleCount: 12,
      averageSpeed: 45,
      lastUpdated: Date.now()
    },
    accidentData: {
      isAccident: false,
      severity: null,
      description: "Normal traffic conditions"
    },
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "CAM005",
    name: "Mission District",
    location: "24th St & Mission St",
    latitude: 37.7524,
    longitude: -122.4184,
    address: "24th Street & Mission Street, San Francisco, CA",
    area: "Mission District",
    trafficData: {
      congestionLevel: "FREE_FLOW",
      vehicleCount: 6,
      averageSpeed: 50,
      lastUpdated: Date.now()
    },
    accidentData: {
      isAccident: false,
      severity: null,
      description: "Clear roads, no incidents"
    },
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: "CAM006",
    name: "Fisherman's Wharf",
    location: "Jefferson St & Fisherman's Wharf",
    latitude: 37.8080,
    longitude: -122.4177,
    address: "Jefferson Street, Fisherman's Wharf, San Francisco, CA",
    area: "Tourist District",
    trafficData: {
      congestionLevel: "MODERATE",
      vehicleCount: 18,
      averageSpeed: 28,
      lastUpdated: Date.now()
    },
    accidentData: {
      isAccident: true,
      severity: "major",
      description: "Vehicle breakdown causing lane obstruction",
      reportedAt: Date.now() - 420000 // 7 minutes ago
    },
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

class StaticDatabase {
  private cameras: CCTVLocation[] = [...STATIC_CAMERA_LOCATIONS];

  // Get all cameras
  getAllCameras(): CCTVLocation[] {
    return this.cameras;
  }

  // Get camera by ID
  getCamera(id: string): CCTVLocation | null {
    return this.cameras.find(camera => camera.id === id) || null;
  }

  // Update traffic data for a camera
  updateTrafficData(id: string, trafficData: Partial<TrafficData>): void {
    const camera = this.getCamera(id);
    if (camera) {
      camera.trafficData = { ...camera.trafficData, ...trafficData };
      camera.updatedAt = Date.now();
    }
  }

  // Update accident data for a camera
  updateAccidentData(id: string, accidentData: Partial<AccidentData>): void {
    const camera = this.getCamera(id);
    if (camera) {
      const updatedData = { ...camera.accidentData, ...accidentData };
      
      // Auto-set timestamps
      if (accidentData.isAccident === true && !accidentData.reportedAt) {
        updatedData.reportedAt = Date.now();
      }
      if (accidentData.isAccident === false) {
        updatedData.resolvedAt = Date.now();
      }
      
      camera.accidentData = updatedData;
      camera.updatedAt = Date.now();
    }
  }

  // Get cameras with active accidents
  getCamerasWithAccidents(): CCTVLocation[] {
    return this.cameras.filter(camera => camera.accidentData.isAccident);
  }

  // Get cameras with high traffic congestion
  getCamerasWithHighTraffic(): CCTVLocation[] {
    return this.cameras.filter(camera => 
      camera.trafficData.congestionLevel === 'HEAVY' || 
      camera.trafficData.congestionLevel === 'TRAFFIC_JAM'
    );
  }

  // Get cameras by area
  getCamerasByArea(area: string): CCTVLocation[] {
    return this.cameras.filter(camera => camera.area === area);
  }

  // Get cameras within a radius of coordinates
  getCamerasNearCoordinates(latitude: number, longitude: number, radiusKm: number = 5): CCTVLocation[] {
    return this.cameras.filter(camera => {
      const distance = this.calculateDistance(
        latitude, longitude,
        camera.latitude, camera.longitude
      );
      return distance <= radiusKm;
    });
  }

  // Simulate real-time updates
  simulateRealTimeUpdate(): void {
    this.cameras.forEach(camera => {
      // Randomly update traffic data
      const vehicleChange = Math.floor(Math.random() * 10) - 5; // -5 to +5
      camera.trafficData.vehicleCount = Math.max(0, camera.trafficData.vehicleCount + vehicleChange);
      
      // Update speed based on vehicle count
      const baseSpeed = 50;
      const congestionMultiplier = this.getCongestionMultiplier(camera.trafficData.congestionLevel);
      camera.trafficData.averageSpeed = Math.round(baseSpeed * congestionMultiplier);
      
      camera.trafficData.lastUpdated = Date.now();
      camera.updatedAt = Date.now();
    });
  }

  private getCongestionMultiplier(congestionLevel: string): number {
    const multipliers = {
      'FREE_FLOW': 1.0,
      'LIGHT': 0.9,
      'MODERATE': 0.7,
      'HEAVY': 0.4,
      'TRAFFIC_JAM': 0.2
    };
    return multipliers[congestionLevel as keyof typeof multipliers] || 0.5;
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Get summary statistics
  getStatistics(): {
    totalCameras: number;
    activeCameras: number;
    totalVehicles: number;
    averageCongestion: number;
    accidentCount: number;
    criticalAccidents: number;
  } {
    const activeCameras = this.cameras.filter(c => c.isActive).length;
    const totalVehicles = this.cameras.reduce((sum, c) => sum + c.trafficData.vehicleCount, 0);
    const avgCongestion = this.cameras.reduce((sum, c) => {
      const congestionValue = this.getCongestionValue(c.trafficData.congestionLevel);
      return sum + congestionValue;
    }, 0) / this.cameras.length;
    const accidentCount = this.cameras.filter(c => c.accidentData.isAccident).length;
    const criticalAccidents = this.cameras.filter(c => 
      c.accidentData.isAccident && c.accidentData.severity === 'critical'
    ).length;

    return {
      totalCameras: this.cameras.length,
      activeCameras,
      totalVehicles,
      averageCongestion: Math.round(avgCongestion),
      accidentCount,
      criticalAccidents
    };
  }

  private getCongestionValue(level: string): number {
    const values = {
      'FREE_FLOW': 1,
      'LIGHT': 2,
      'MODERATE': 3,
      'HEAVY': 4,
      'TRAFFIC_JAM': 5
    };
    return values[level as keyof typeof values] || 3;
  }
}

// Export singleton instance
export const staticDatabase = new StaticDatabase();

// Auto-update every 30 seconds to simulate real-time data
setInterval(() => {
  staticDatabase.simulateRealTimeUpdate();
}, 30000);