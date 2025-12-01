// Firebase Types for ML Analysis Records
// Defines the structure for ML analysis data stored in Firebase

export interface MLAnalysisRecord {
  id: string;
  type: 'traffic' | 'accident' | 'dual';
  cameraId: string;
  result: any; // ML analysis result (traffic, accident, or dual analysis)
  timestamp: number;
  processingTime: number;
  confidence: number;
  imageHash: string;
  metadata?: {
    originalFilename?: string;
    processedFilename?: string;
    fileSize?: number;
    modelVersion?: string;
    analysisOptions?: any;
  };
}

export interface BatchUpdateResult {
  success: boolean;
  recordsProcessed: number;
  errors?: string[];
  timestamp: number;
}

export interface CameraStatus {
  id: string;
  isProcessing: boolean;
  lastUpdate: number;
  models?: {
    trafficModel?: 'idle' | 'loading' | 'ready' | 'error';
    accidentModel?: 'idle' | 'loading' | 'ready' | 'error';
  };
  error?: string;
}

export interface FirebaseConfig {
  projectId: string;
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}