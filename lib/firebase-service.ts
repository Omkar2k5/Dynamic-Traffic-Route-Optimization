import { database } from './firebase';
import { 
  ref, 
  set, 
  get, 
  update, 
  remove, 
  onValue, 
  off, 
  push,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import type { 
  CameraData, 
  CameraUpdateRequest, 
  CameraCoordinates, 
  TrafficStatus, 
  AccidentStatus 
} from './firebase-types';

// Database reference
const camerasRef = ref(database, 'cameras');

/**
 * Add a new camera to the database
 */
export async function addCamera(
  cameraNumber: string,
  coordinates: CameraCoordinates,
  name?: string,
  location?: string
): Promise<string> {
  const timestamp = Date.now();
  
  const cameraData: CameraData = {
    cameraNumber,
    coordinates,
    trafficStatus: {
      congestionLevel: "low",
      vehicleCount: 0,
      averageSpeed: 40,
      lastUpdated: timestamp
    },
    accidentStatus: {
      isAccident: false
    },
    isActive: true,
    name,
    location,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  const cameraRef = ref(database, `cameras/${cameraNumber}`);
  await set(cameraRef, cameraData);
  return cameraNumber;
}

/**
 * Get all cameras from the database
 */
export async function getAllCameras(): Promise<CameraData[]> {
  const snapshot = await get(camerasRef);
  if (!snapshot.exists()) {
    return [];
  }
  
  const data = snapshot.val();
  return Object.values(data);
}

/**
 * Get a specific camera by camera number
 */
export async function getCamera(cameraNumber: string): Promise<CameraData | null> {
  const cameraRef = ref(database, `cameras/${cameraNumber}`);
  const snapshot = await get(cameraRef);
  
  if (!snapshot.exists()) {
    return null;
  }
  
  return snapshot.val();
}

/**
 * Update camera traffic status
 */
export async function updateTrafficStatus(
  cameraNumber: string,
  trafficStatus: Partial<TrafficStatus>
): Promise<void> {
  const cameraRef = ref(database, `cameras/${cameraNumber}`);
  const updates = {
    trafficStatus: {
      ...trafficStatus,
      lastUpdated: Date.now()
    },
    updatedAt: Date.now()
  };
  
  await update(cameraRef, updates);
}

/**
 * Update camera accident status
 */
export async function updateAccidentStatus(
  cameraNumber: string,
  accidentStatus: Partial<AccidentStatus>
): Promise<void> {
  const cameraRef = ref(database, `cameras/${cameraNumber}`);
  const timestamp = Date.now();
  
  const updates: any = {
    accidentStatus,
    updatedAt: timestamp
  };
  
  // Auto-set reportedAt timestamp if accident is being reported
  if (accidentStatus.isAccident && !accidentStatus.reportedAt) {
    updates.accidentStatus.reportedAt = timestamp;
  }
  
  // Auto-set resolvedAt timestamp if accident is being resolved
  if (accidentStatus.isAccident === false) {
    updates.accidentStatus.resolvedAt = timestamp;
  }
  
  await update(cameraRef, updates);
}

/**
 * Update camera data (general update)
 */
export async function updateCamera(
  cameraNumber: string,
  updateData: CameraUpdateRequest
): Promise<void> {
  const cameraRef = ref(database, `cameras/${cameraNumber}`);
  const updates = {
    ...updateData,
    updatedAt: Date.now()
  };
  
  await update(cameraRef, updates);
}

/**
 * Delete a camera from the database
 */
export async function deleteCamera(cameraNumber: string): Promise<void> {
  const cameraRef = ref(database, `cameras/${cameraNumber}`);
  await remove(cameraRef);
}

/**
 * Get cameras with active accidents
 */
export async function getCamerasWithAccidents(): Promise<CameraData[]> {
  const cameras = await getAllCameras();
  return cameras.filter(camera => camera.accidentStatus.isAccident);
}

/**
 * Get cameras with high traffic congestion
 */
export async function getCamerasWithHighTraffic(): Promise<CameraData[]> {
  const cameras = await getAllCameras();
  return cameras.filter(camera => camera.trafficStatus.congestionLevel === 'high');
}

/**
 * Subscribe to real-time camera updates
 */
export function subscribeToCameras(
  callback: (cameras: CameraData[]) => void
): () => void {
  const unsubscribe = onValue(camerasRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const data = snapshot.val();
    const cameras: CameraData[] = Object.values(data);
    callback(cameras);
  });
  
  return () => off(camerasRef, 'value', unsubscribe);
}

/**
 * Subscribe to a specific camera updates
 */
export function subscribeToCamera(
  cameraNumber: string,
  callback: (camera: CameraData | null) => void
): () => void {
  const cameraRef = ref(database, `cameras/${cameraNumber}`);
  
  const unsubscribe = onValue(cameraRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    
    callback(snapshot.val());
  });
  
  return () => off(cameraRef, 'value', unsubscribe);
}

/**
 * Batch update multiple cameras
 */
export async function batchUpdateCameras(
  updates: { cameraNumber: string; data: CameraUpdateRequest }[]
): Promise<void> {
  const batchUpdates: any = {};
  
  updates.forEach(({ cameraNumber, data }) => {
    batchUpdates[`cameras/${cameraNumber}`] = {
      ...data,
      updatedAt: Date.now()
    };
  });
  
  await update(ref(database), batchUpdates);
}

/**
 * Initialize sample camera data (for testing)
 */
export async function initializeSampleData(): Promise<void> {
  const sampleCameras = [
    {
      cameraNumber: "CAM001",
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
      name: "Downtown Intersection",
      location: "Market St & Powell St"
    },
    {
      cameraNumber: "CAM002", 
      coordinates: { latitude: 37.7849, longitude: -122.4094 },
      name: "Highway 101 North",
      location: "US-101 N near Van Ness"
    },
    {
      cameraNumber: "CAM003",
      coordinates: { latitude: 37.7649, longitude: -122.4294 },
      name: "Bay Bridge Approach",
      location: "I-80 E Bay Bridge"
    }
  ];
  
  const promises = sampleCameras.map(camera => 
    addCamera(
      camera.cameraNumber,
      camera.coordinates,
      camera.name,
      camera.location
    )
  );
  
  await Promise.all(promises);
}