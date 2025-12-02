import { NextRequest, NextResponse } from 'next/server';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'Traffic';
const COLLECTION_NAME = 'cctv';
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

interface TrafficCamera {
  _id: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  traffic_status: string;
  vehicle_count: number;
  congestion_score: number;
  updated_at: string;
}

interface DelayedRoute {
  id: string;
  name: string;
  startPoint: { lat: number; lng: number };
  endPoint: { lat: number; lng: number };
  originalRoute: {
    distance: number;
    estimatedTime: number;
    delay: number;
  };
  alternativeRoutes: AlternativeRoute[];
  congestedArea: {
    location: string;
    trafficLevel: string;
    vehicleCount: number;
  };
}

interface AlternativeRoute {
  id: string;
  name: string;
  distance: number;
  estimatedTime: number;
  delay: number;
  savings: number;
  description: string;
}

// Utility function to calculate distance between two coordinates in kilometers
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Common destination points in major cities for route generation
const COMMON_DESTINATIONS = [
  { lat: 18.5204, lng: 73.8567, name: "Pune Junction" },
  { lat: 18.5644, lng: 73.7729, name: "Shirur" },
  { lat: 18.4131, lng: 73.8782, name: "Pimpri" },
  { lat: 18.6139, lng: 73.7297, name: "Hinjewadi" },
  { lat: 18.4584, lng: 73.8685, name: "Chinchwad" },
];

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters for coordinate-based filtering
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseFloat(searchParams.get('radius') || '10'); // Default 10km radius for maps visualization
    const minSeverity = searchParams.get('severity') || 'moderate'; // 'low', 'moderate', 'high'
    const limit = parseInt(searchParams.get('limit') || '10'); // Increased default for map visualization
    const includeBypass = searchParams.get('bypass') !== 'false'; // Include bypass routes by default

    // Fetch live traffic data from MongoDB
    let MongoClientClass: any = null;
    try {
      const mongodb = require('mongodb');
      MongoClientClass = mongodb.MongoClient;
    } catch (error) {
      console.log('📊 MongoDB package not available, returning mock delayed routes');
      return getMockDelayedRoutes();
    }

    const client = new MongoClientClass(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Fetch all CCTV traffic data
    const trafficData = await collection.find({}).toArray();
    await client.close();

    // Identify high and moderate traffic areas with coordinate filtering
    let congestedAreas = trafficData
      .filter((camera: TrafficCamera) => {
        const status = camera.traffic_status?.toUpperCase();
        const congestionScore = camera.congestion_score || 0;
        const vehicleCount = camera.vehicle_count || 0;
        
        // Base traffic level filtering
        const hasModerateTraffic = status === 'MODERATE_CONGESTION';
        const hasHighTraffic = status === 'HEAVY_CONGESTION' || status === 'TRAFFIC_JAM';
        const hasLightTrafficWithVehicles = status === 'LIGHT_CONGESTION' && vehicleCount > 10;
        const hasHighCongestionScore = congestionScore > 0.4;
        
        const meetsTrafficCriteria = hasModerateTraffic || hasHighTraffic || hasLightTrafficWithVehicles || hasHighCongestionScore;
        
        // Coordinate-based filtering (if coordinates provided)
        if (lat !== 0 && lng !== 0) {
          const distance = calculateDistance(
            lat, lng,
            camera.coordinates.latitude, camera.coordinates.longitude
          );
          return meetsTrafficCriteria && distance <= radius;
        }
        
        return meetsTrafficCriteria;
      })
      .sort((a: TrafficCamera, b: TrafficCamera) => {
        // Sort by severity: Traffic Jam > Heavy > Moderate > Light
        const severityOrder = { 'TRAFFIC_JAM': 4, 'HEAVY_CONGESTION': 3, 'MODERATE_CONGESTION': 2, 'LIGHT_CONGESTION': 1 };
        const aSeverity = severityOrder[a.traffic_status?.toUpperCase() as keyof typeof severityOrder] || 0;
        const bSeverity = severityOrder[b.traffic_status?.toUpperCase() as keyof typeof severityOrder] || 0;
        return bSeverity - aSeverity;
      })
      .slice(0, limit);

    console.log(`🚦 Found ${congestedAreas.length} congested areas within ${radius}km of (${lat}, ${lng})`);

    // Generate delayed routes for congested areas
    const delayedRoutes = await Promise.all(
      congestedAreas.map(async (area: TrafficCamera, index: number) => {
        return await generateDelayedRoute(area, index);
      })
    );

    return NextResponse.json({
      success: true,
      delayedRoutes,
      totalCongestedAreas: congestedAreas.length,
      timestamp: new Date().toISOString(),
      filters: {
        coordinates: lat !== 0 && lng !== 0 ? { lat, lng, radius } : null,
        minSeverity,
        limit,
        includeBypass
      },
      mapBounds: {
        center: lat !== 0 && lng !== 0 ? { lat, lng } : null,
        radius,
        affectedRoutes: delayedRoutes.length
      }
    });

  } catch (error) {
    console.error('Error fetching delayed routes:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch delayed routes',
      delayedRoutes: getMockDelayedRoutes()
    }, { status: 200 });
  }
}

async function generateDelayedRoute(camera: TrafficCamera, index: number): Promise<DelayedRoute> {
  const congestedArea = {
    location: `Coordinates: ${camera.coordinates.latitude}, ${camera.coordinates.longitude}`,
    trafficLevel: camera.traffic_status?.replace('_CONGESTION', '') || 'MODERATE',
    vehicleCount: camera.vehicle_count || 0
  };

  // Generate start and end points around the congested area for map visualization
  const centerPoint = camera.coordinates;
  const offsetDistance = 0.015; // ~1.5km offset for better route visualization
  
  // Create comprehensive bypass routes around the congested area for 10km map view
  const alternativeRoutes = await Promise.all([
    generateAlternativeRoute(centerPoint, 'North Bypass', offsetDistance, 0, 3),
    generateAlternativeRoute(centerPoint, 'South Bypass', -offsetDistance, 0, 3),
    generateAlternativeRoute(centerPoint, 'East Bypass', 0, offsetDistance, 3),
    generateAlternativeRoute(centerPoint, 'West Bypass', 0, -offsetDistance, 3),
    generateAlternativeRoute(centerPoint, 'Northeast Bypass', offsetDistance, offsetDistance, 2),
    generateAlternativeRoute(centerPoint, 'Northwest Bypass', offsetDistance, -offsetDistance, 2),
    generateAlternativeRoute(centerPoint, 'Southeast Bypass', -offsetDistance, offsetDistance, 2),
    generateAlternativeRoute(centerPoint, 'Southwest Bypass', -offsetDistance, -offsetDistance, 2),
  ]);

  // Calculate original route through congested area
  const startPoint = {
    lat: centerPoint.latitude - offsetDistance,
    lng: centerPoint.longitude - offsetDistance
  };
  const endPoint = {
    lat: centerPoint.latitude + offsetDistance,
    lng: centerPoint.longitude + offsetDistance
  };

  const originalDistance = 2.0; // Approximate 2km through congested area
  const baseTime = 5; // 5 minutes base time
  const congestionMultiplier = getCongestionMultiplier(camera.traffic_status);
  const delay = Math.round(baseTime * congestionMultiplier);

  return {
    id: `delayed-${camera._id}`,
    name: `Route via ${congestedArea.trafficLevel} Zone`,
    startPoint,
    endPoint,
    originalRoute: {
      distance: originalDistance,
      estimatedTime: baseTime,
      delay
    },
    alternativeRoutes: alternativeRoutes.filter((route): route is AlternativeRoute => route !== null),
    congestedArea
  };
}

async function generateAlternativeRoute(
  centerPoint: { latitude: number; longitude: number }, 
  routeName: string, 
  latOffset: number = 0, 
  lngOffset: number = 0,
  bypassDistance: number = 2 // Distance to bypass around the congested area
): Promise<AlternativeRoute | null> {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      // Return enhanced mock alternative route with better bypass calculation
      const distance = 2.5 + Math.random(); // Vary the distance
      const baseTime = 6 + Math.random() * 2;
      const delay = Math.max(0, baseTime - 4);
      const savings = Math.max(0, 8 - baseTime); // Compare to 8 min baseline through congested area

      return {
        id: `alt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${routeName} Bypass Route`,
        distance: Math.round(distance * 100) / 100,
        estimatedTime: Math.round(baseTime),
        delay: Math.round(delay),
        savings: Math.round(savings),
        description: `Bypass congested area via ${routeName.toLowerCase()} - avoids coordinates: ${centerPoint.latitude.toFixed(4)}, ${centerPoint.longitude.toFixed(4)}`
      };
    }

    // Create bypass points that go around the congested area
    const baseDistance = 0.008; // ~1km base offset
    const bypassOffset = baseDistance + (bypassDistance * 0.001); // Scale with bypass distance
    
    // Generate start and end points that bypass the congested area
    const altStartPoint = `${centerPoint.latitude + latOffset + bypassOffset},${centerPoint.longitude + lngOffset}`;
    const altEndPoint = `${centerPoint.latitude - latOffset - bypassOffset},${centerPoint.longitude - lngOffset}`;

    const directionsUrl = new URL("https://maps.googleapis.com/maps/api/directions/json");
    directionsUrl.searchParams.append("origin", altStartPoint);
    directionsUrl.searchParams.append("destination", altEndPoint);
    directionsUrl.searchParams.append("mode", "driving");
    directionsUrl.searchParams.append("avoid", "tolls"); // Avoid tolls for alternative routes
    directionsUrl.searchParams.append("key", GOOGLE_MAPS_API_KEY);

    const response = await fetch(directionsUrl.toString());
    const data = await response.json();

    if (data.status === "OK" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];
      const distance = leg.distance.value / 1000; // Convert to km
      const time = Math.round(leg.duration.value / 60); // Convert to minutes
      
      // Calculate savings compared to going through congested area
      const congestedTime = 8; // 8 minutes through congested area
      const savings = Math.max(0, congestedTime - time);
      const delay = Math.max(0, time - 5); // 5 minutes baseline for clear route

      return {
        id: `alt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${routeName} Bypass`,
        distance: Math.round(distance * 100) / 100,
        estimatedTime: time,
        delay: delay,
        savings: savings,
        description: `Bypass congested coordinates (${centerPoint.latitude.toFixed(4)}, ${centerPoint.longitude.toFixed(4)}) via ${routeName.toLowerCase()} - saves ${savings} minutes`
      };
    }

    return null;
  } catch (error) {
    console.error(`Error generating ${routeName}:`, error);
    return null;
  }
}

function getCongestionMultiplier(trafficStatus: string): number {
  switch (trafficStatus?.toUpperCase()) {
    case 'LIGHT_CONGESTION':
      return 1.3;
    case 'MODERATE_CONGESTION':
      return 1.6;
    case 'HEAVY_CONGESTION':
      return 2.2;
    case 'TRAFFIC_JAM':
      return 3.0;
    default:
      return 1.5;
  }
}

function getMockDelayedRoutes(): { delayedRoutes: DelayedRoute[] } {
  return {
    delayedRoutes: [
      {
        id: "delayed-mock-1",
        name: "Route via MODERATE Zone",
        startPoint: { lat: 18.4757, lng: 73.8560 },
        endPoint: { lat: 18.4857, lng: 73.8660 },
        originalRoute: {
          distance: 2.0,
          estimatedTime: 5,
          delay: 3
        },
        alternativeRoutes: [
          {
            id: "alt-mock-1-1",
            name: "North Route Alternative",
            distance: 2.5,
            estimatedTime: 6,
            delay: 1,
            savings: 2,
            description: "Avoid congested area via north route"
          },
          {
            id: "alt-mock-1-2",
            name: "East Route Alternative",
            distance: 2.8,
            estimatedTime: 7,
            delay: 2,
            savings: 1,
            description: "Alternative route via east bypassing traffic"
          }
        ],
        congestedArea: {
          location: "Coordinates: 18.4807, 73.8610",
          trafficLevel: "MODERATE",
          vehicleCount: 15
        }
      }
    ]
  };
}