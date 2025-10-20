// Firebase Camera Data Types
export interface CameraCoordinates {
  latitude: number;
  longitude: number;
}

export interface TrafficStatus {
  congestionLevel: "low" | "medium" | "high";
  vehicleCount: number;
  averageSpeed: number; // km/h
  lastUpdated: number; // timestamp
}

export interface AccidentStatus {
  isAccident: boolean;
  severity?: "minor" | "major" | "critical";
  description?: string;
  reportedAt?: number; // timestamp
  resolvedAt?: number; // timestamp
}

export interface CameraData {
  cameraNumber: string;
  coordinates: CameraCoordinates;
  trafficStatus: TrafficStatus;
  accidentStatus: AccidentStatus;
  isActive: boolean;
  name?: string;
  location?: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

// Firebase database structure
export interface FirebaseDatabase {
  cameras: {
    [cameraId: string]: CameraData;
  };
}

// API Response types
export interface CameraListResponse {
  cameras: CameraData[];
  total: number;
}

export interface CameraUpdateRequest {
  trafficStatus?: Partial<TrafficStatus>;
  accidentStatus?: Partial<AccidentStatus>;
  isActive?: boolean;
}