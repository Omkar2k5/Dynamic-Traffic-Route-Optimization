// MongoDB Sync Service - Server-side component for syncing with MongoDB
// This service runs on the server to avoid CORS issues

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

export class MongoDBSyncService {
  private static instance: MongoDBSyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  static getInstance(): MongoDBSyncService {
    if (!MongoDBSyncService.instance) {
      MongoDBSyncService.instance = new MongoDBSyncService();
    }
    return MongoDBSyncService.instance;
  }

  // Start the sync service (server-side only)
  startSync(): void {
    if (typeof window !== 'undefined') {
      console.log('🚫 MongoDB sync service can only run on server-side');
      return;
    }

    if (this.isRunning) {
      console.log('⚠️ MongoDB sync service already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting MongoDB sync service...');

    // Initial sync
    this.performSync();

    // Set up interval for regular syncs
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, 30000); // 30 seconds
  }

  // Stop the sync service
  stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 MongoDB sync service stopped');
  }

  // Perform a single sync operation
  private async performSync(): Promise<void> {
    try {
      console.log('🔄 MongoDB sync starting...');

      // Dynamic import to avoid issues if MongoDB is not available
      let MongoClient: any;
      try {
        const mongodb = require('mongodb');
        MongoClient = mongodb.MongoClient;
      } catch (error) {
        console.log('📊 MongoDB package not available, skipping sync');
        return;
      }

      const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });

      await client.connect();
      const db = client.db(DATABASE_NAME);
      const collection = db.collection(COLLECTION_NAME);

      // Fetch all CCTV traffic data
      const trafficData = await collection.find({}).toArray();
      
      if (trafficData.length > 0) {
        console.log(`📡 Found ${trafficData.length} cameras in MongoDB`);
        
        // Log camera updates
        trafficData.forEach((data: TrafficData) => {
          console.log(`✅ Camera ${data._id}: ${data.traffic_status} (${data.vehicle_count} vehicles)`);
        });
      } else {
        console.log('⚠️ No cameras found in MongoDB');
      }

      await client.close();
      console.log('✅ MongoDB sync completed successfully');

    } catch (error) {
      console.error('❌ MongoDB sync failed:', error);
    }
  }

  // Get current traffic data directly from MongoDB
  async getCurrentTrafficData(): Promise<any[]> {
    try {
      let MongoClient: any;
      try {
        const mongodb = require('mongodb');
        MongoClient = mongodb.MongoClient;
      } catch (error) {
        console.log('📊 MongoDB package not available');
        return [];
      }

      const client = new MongoClient(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });

      await client.connect();
      const db = client.db(DATABASE_NAME);
      const collection = db.collection(COLLECTION_NAME);

      const trafficData = await collection.find({}).toArray();
      
      // Transform data to match frontend format
      const transformedData = trafficData.map((data: TrafficData) => ({
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
          isAccident: false,
          severity: null,
          description: "Traffic monitoring active"
        },
        isActive: true,
        createdAt: new Date(data.timestamp).getTime(),
        updatedAt: new Date(data.updated_at).getTime()
      }));

      await client.close();
      return transformedData;

    } catch (error) {
      console.error('❌ Failed to get traffic data from MongoDB:', error);
      return [];
    }
  }
}

// Export singleton instance
export const mongoDBSyncService = MongoDBSyncService.getInstance();