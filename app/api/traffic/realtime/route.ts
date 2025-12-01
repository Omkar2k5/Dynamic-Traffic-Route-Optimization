import { NextRequest, NextResponse } from 'next/server';

// MongoDB integration with fallback for development
let MongoClient: any = null;
try {
  // Dynamic import to avoid build errors
  const mongodb = require('mongodb');
  MongoClient = mongodb.MongoClient;
} catch (error) {
  console.warn('MongoDB package not available, using fallback data');
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = 'Traffic';
const COLLECTION_NAME = 'cctv';

interface TrafficData {
  _id: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  traffic_status: string;
  timestamp: string;
  congestion_score: number;
  vehicle_count: number;
  average_speed: number;
  stopped_count: number;
  updated_at: string;
}

// GET - Fetch real-time traffic data from MongoDB
export async function GET(request: NextRequest) {
  // If MongoDB client is not available, return fallback data immediately
  if (!MongoClient) {
    console.log('📊 Returning fallback traffic data (MongoDB package not installed)');
    return NextResponse.json({
      success: true,
      data: [{
        id: "cctv1",
        name: "Pune Traffic Monitor (ML Model) 🤖",
        location: "Pune, Maharashtra, India",
        latitude: 18.4807,
        longitude: 73.8610,
        address: "Pune, Maharashtra, India",
        area: "Real-time ML Traffic Detection",
        trafficData: {
          congestionLevel: "MODERATE",
          vehicleCount: 12,
          averageSpeed: 28,
          lastUpdated: Date.now()
        },
        accidentData: {
          isAccident: false,
          severity: null,
          description: "Live ML traffic analysis active"
        },
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }],
      timestamp: new Date().toISOString(),
      count: 1,
      note: "Fallback data - Install MongoDB package for live data"
    });
  }

  try {
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Fetch all CCTV traffic data
    const trafficData = await collection.find({}).toArray();
    
    // Transform data to match frontend format
    const transformedData = trafficData.map((data: any) => ({
      id: data._id,
      name: `CCTV ${data._id}`,
      location: `Coordinates: ${data.coordinates.latitude}, ${data.coordinates.longitude}`,
      latitude: data.coordinates.latitude,
      longitude: data.coordinates.longitude,
      address: `Location at ${data.coordinates.latitude.toFixed(4)}, ${data.coordinates.longitude.toFixed(4)}`,
      area: "Pune Traffic Monitoring",
      trafficData: {
        congestionLevel: data.traffic_status === 'FREE_FLOW' ? 'FREE_FLOW' :
                        data.traffic_status === 'LIGHT_CONGESTION' ? 'LIGHT' :
                        data.traffic_status === 'MODERATE_CONGESTION' ? 'MODERATE' :
                        data.traffic_status === 'HEAVY_CONGESTION' ? 'HEAVY' :
                        data.traffic_status === 'TRAFFIC_JAM' ? 'TRAFFIC_JAM' : 'MODERATE',
        vehicleCount: data.vehicle_count || 0,
        averageSpeed: data.average_speed || 0,
        lastUpdated: new Date(data.updated_at).getTime()
      },
      accidentData: {
        isAccident: false, // ML model doesn't detect accidents, only traffic
        severity: null,
        description: "Traffic monitoring active"
      },
      isActive: true,
      createdAt: new Date(data.timestamp).getTime(),
      updatedAt: new Date(data.updated_at).getTime()
    }));

    await client.close();

    return NextResponse.json({
      success: true,
      data: transformedData,
      timestamp: new Date().toISOString(),
      count: transformedData.length
    });

  } catch (error) {
    console.error('Error fetching traffic data from MongoDB:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch traffic data',
        details: error instanceof Error ? error.message : 'Unknown error',
        // Return fallback data so frontend doesn't break
        data: [{
          id: "cctv1",
          name: "Pune Traffic Camera",
          location: "Pune, Maharashtra, India",
          latitude: 18.4807,
          longitude: 73.8610,
          address: "Pune, Maharashtra, India",
          area: "Pune Traffic Monitoring",
          trafficData: {
            congestionLevel: "MODERATE",
            vehicleCount: 15,
            averageSpeed: 25,
            lastUpdated: Date.now()
          },
          accidentData: {
            isAccident: false,
            severity: null,
            description: "MongoDB connection failed - showing fallback data"
          },
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }],
        count: 1
      },
      { status: 200 } // Return 200 with fallback data instead of 500
    );
  }
}

// POST - Update traffic data (for manual updates)
export async function POST(request: NextRequest) {
  // If MongoDB client is not available, return error
  if (!MongoClient) {
    return NextResponse.json(
      { error: 'MongoDB package not installed - cannot update traffic data' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { cameraId, trafficData } = body;

    if (!cameraId || !trafficData) {
      return NextResponse.json(
        { error: 'Camera ID and traffic data are required' },
        { status: 400 }
      );
    }

    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Update the document
    const updateDoc = {
      $set: {
        traffic_status: trafficData.congestionLevel,
        congestion_score: trafficData.congestionScore,
        vehicle_count: trafficData.vehicleCount,
        average_speed: trafficData.averageSpeed,
        stopped_count: trafficData.stoppedCount,
        updated_at: new Date().toISOString() + "Z"
      }
    };

    const result = await collection.updateOne(
      { _id: cameraId },
      updateDoc
    );

    await client.close();

    if (result.modifiedCount > 0) {
      return NextResponse.json({ success: true, modified: result.modifiedCount });
    } else {
      return NextResponse.json(
        { success: false, error: 'No document was updated' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error updating traffic data:', error);
    return NextResponse.json(
      { error: 'Failed to update traffic data' },
      { status: 500 }
    );
  }
}