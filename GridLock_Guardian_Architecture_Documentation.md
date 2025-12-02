# GridLock Guardian - System Architecture & Tech Stack Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Tech Stack Documentation](#tech-stack-documentation)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Component Hierarchy](#component-hierarchy)
6. [ML Model Integration](#ml-model-integration)
7. [API Architecture](#api-architecture)
8. [Database Architecture](#database-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Infrastructure & Security](#infrastructure--security)

---

## System Overview

**GridLock Guardian** is a comprehensive real-time traffic management system that combines advanced machine learning models, CCTV integration, and Google Maps visualization to provide intelligent traffic monitoring and incident response capabilities.

### Core Capabilities
- **Real-time Traffic Analysis**: Dual ML models for congestion and accident detection
- **Live CCTV Monitoring**: Browser-based camera feeds with ML overlay analysis
- **Interactive Maps**: Google Maps integration with real-time traffic visualization
- **Incident Management**: Automated detection and reporting system
- **Route Optimization**: AI-powered route suggestions with traffic consideration
- **Dashboard Analytics**: Comprehensive traffic metrics and system health monitoring

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        WEB[Next.js 15 Web App]
        DASH[Dashboard Components]
        MAP[Google Maps Integration]
        CCTV_BROWSER[CCTV Browser Interface]
    end
    
    subgraph "API Gateway Layer"
        API[Next.js API Routes]
        AUTH[Authentication]
        RATE[Rate Limiting]
    end
    
    subgraph "Business Logic Layer"
        ML_SERVICE[ML Service Manager]
        TRAFFIC_CTRL[Traffic Controller]
        INCIDENT_MGR[Incident Manager]
        ROUTE_ENGINE[Route Engine]
    end
    
    subgraph "ML Inference Layer"
        MODEL_SWITCHER[Model Switcher - Port 8000]
        TRAFFIC_ML[Traffic Congestion ML - Port 8001]
        ACCIDENT_ML[Accident Detection ML - Port 8002]
    end
    
    subgraph "Data Layer"
        STATIC_DB[Static Database]
        MONGODB[MongoDB Database]
        CACHE[Application Cache]
    end
    
    subgraph "External Services"
        GOOGLE_MAPS[Google Maps API]
        CCTV_CAMS[CCTV Cameras]
        FIREBASE[Firebase Services]
    end
    
    WEB --> API
    API --> ML_SERVICE
    ML_SERVICE --> MODEL_SWITCHER
    MODEL_SWITCHER --> TRAFFIC_ML
    MODEL_SWITCHER --> ACCIDENT_ML
    API --> STATIC_DB
    STATIC_DB -.-> MONGODB
    API --> GOOGLE_MAPS
    WEB --> CCTV_BROWSER
    CCTV_BROWSER --> CCTV_CAMS
    CCTV_CAMS --> MODEL_SWITCHER
```

---

## Tech Stack Documentation

### Frontend Layer

| Technology | Version | Purpose | Justification |
|------------|---------|---------|---------------|
| **Next.js** | 15.2.4 | React framework | Latest features, SSR/SSG, API routes |
| **React** | 19.2.0 | UI library | Latest React with concurrent features |
| **TypeScript** | 5.x | Type safety | Strong typing for complex data flows |
| **Tailwind CSS** | 4.1.9 | Styling | Utility-first, responsive design |
| **Radix UI** | 1.1.x | UI components | Accessible, headless components |
| **Lucide React** | 0.454.0 | Icons | Modern, consistent iconography |
| **Recharts** | latest | Data visualization | Charts for traffic analytics |
| **React Hook Form** | 7.60.0 | Form management | Performance, validation |
| **Zod** | 3.25.76 | Schema validation | Runtime type checking |

### Backend & API Layer

| Technology | Purpose | Implementation |
|------------|---------|----------------|
| **Next.js API Routes** | RESTful endpoints | `/app/api/*` structure |
| **Node.js** | Runtime environment | Next.js 15 runtime |
| **TypeScript** | Type safety | Shared types across stack |

### Machine Learning & AI

| Technology | Version | Purpose | Model Type |
|------------|---------|---------|------------|
| **TensorFlow.js** | 4.15.0 | Client-side ML | Browser inference |
| **TensorFlow.js Node** | 4.15.0 | Server-side ML | Python model serving |
| **Ultralytics YOLOv8** | 8.0.0 | Object detection | Vehicle/accident detection |
| **Python** | 3.8+ | ML model training | Backend inference |
| **OpenCV** | 4.x | Image processing | Video frame analysis |

### Database & Storage

| Technology | Purpose | Implementation |
|------------|---------|----------------|
| **MongoDB** | Primary database | Real-time traffic data |
| **Static Database** | Fallback system | TypeScript-based mock data |
| **IndexedDB** | Client-side storage | Offline data caching |
| **File System** | Model storage | `.pt` model files |

### External Integrations

| Service | Purpose | Integration Method |
|---------|---------|-------------------|
| **Google Maps API** | Maps & geocoding | JavaScript API + REST |
| **Firebase** | Auth & real-time | Web SDK integration |
| **CCTV Cameras** | Video feeds | MediaDevices API |
| **Vercel Analytics** | Performance monitoring | Built-in integration |

---

## Data Flow Architecture

### Real-Time Traffic Data Flow

```mermaid
sequenceDiagram
    participant User as User Browser
    participant Frontend as Next.js Frontend
    participant API as API Routes
    participant MLService as ML Service
    participant TrafficML as Traffic ML Server
    participant Camera as CCTV Camera
    participant DB as Database
    
    Camera->>TrafficML: Live Video Feed
    TrafficML->>MLService: ML Analysis Results
    MLService->>API: Processed Traffic Data
    API->>DB: Store Traffic Metrics
    DB-->>API: Return Data
    API-->>Frontend: API Response
    Frontend-->>User: Updated Dashboard
    
    Note over Camera,User: Continuous real-time analysis loop
```

### ML Model Processing Flow

```mermaid
graph LR
    subgraph "Input Processing"
        VIDEO[CCTV Video Stream]
        FRAMES[Frame Extraction]
        PREPROCESS[Image Preprocessing]
    end
    
    subgraph "ML Inference"
        YOLOv8[YOLOv8 Model]
        DETECTION[Object Detection]
        CLASSIFICATION[Traffic Classification]
        ANALYTICS[Analytics Calculation]
    end
    
    subgraph "Output Processing"
        RESULTS[Detection Results]
        METRICS[Traffic Metrics]
        ALERTS[Incident Alerts]
        VISUAL[Visualization Data]
    end
    
    VIDEO --> FRAMES
    FRAMES --> PREPROCESS
    PREPROCESS --> YOLOv8
    YOLOv8 --> DETECTION
    DETECTION --> CLASSIFICATION
    CLASSIFICATION --> ANALYTICS
    ANALYTICS --> RESULTS
    RESULTS --> METRICS
    RESULTS --> ALERTS
---

## ML Model Integration

### ML Server Architecture

```mermaid
graph TB
    subgraph "ML Server Cluster"
        SWITCHER[Model Switcher<br/>Port 8000<br/>Flask API]
        TRAFFIC_SERVER[Traffic ML Server<br/>Port 8001<br/>YOLOv8 Traffic]
        ACCIDENT_SERVER[Accident ML Server<br/>Port 8002<br/>YOLOv8 Accident]
    end
    
    subgraph "Model Management"
        MODEL_LOADER[Model Loader]
        HEALTH_MONITOR[Health Monitor]
        AUTO_RESTART[Auto Restart]
    end
    
    subgraph "Model Files"
        TRAFFIC_MODEL[best.pt<br/>Traffic Detection]
        ACCIDENT_MODEL[best.pt<br/>Accident Detection]
        CONFIG[Model Config]
    end
    
    subgraph "Integration Points"
        FRONTEND_ML[Frontend ML Components]
        API_ML[API ML Endpoints]
        CCTV_FEED[CCTV Feed Processor]
    end
    
    SWITCHER --> TRAFFIC_SERVER
    SWITCHER --> ACCIDENT_SERVER
    TRAFFIC_SERVER --> MODEL_LOADER
    ACCIDENT_SERVER --> MODEL_LOADER
    MODEL_LOADER --> TRAFFIC_MODEL
    MODEL_LOADER --> ACCIDENT_MODEL
    HEALTH_MONITOR --> SWITCHER
    AUTO_RESTART --> TRAFFIC_SERVER
    AUTO_RESTART --> ACCIDENT_SERVER
    FRONTEND_ML --> SWITCHER
    API_ML --> SWITCHER
    CCTV_FEED --> SWITCHER
```

### Model Deployment Architecture

| Component | Technology | Purpose | Configuration |
|-----------|------------|---------|---------------|
| **Model Server** | Flask + Python | HTTP API for ML models | Port-based routing |
| **Model Switcher** | Flask + Python | Unified API for model switching | Round-robin or priority-based |
| **Health Monitoring** | Python | Monitor server health | Auto-restart on failure |
| **Model Loading** | PyTorch | Load YOLOv8 models | GPU/CPU detection |
| **Inference Pipeline** | OpenCV + YOLOv8 | Process video streams | Frame-by-frame analysis |

### ML Integration Points

```mermaid
sequenceDiagram
    participant Frontend as Frontend
    participant API as API Layer
    participant Switcher as Model Switcher
    participant TrafficML as Traffic ML
    participant AccidentML as Accident ML
    participant Camera as CCTV Camera
    
    Frontend->>API: Request ML Analysis
    API->>Switcher: Forward Request
    Switcher->>TrafficML: Route to Traffic ML
    Switcher->>AccidentML: Route to Accident ML
    
    par Traffic Analysis
        Camera->>TrafficML: Video Stream
        TrafficML->>TrafficML: YOLOv8 Inference
        TrafficML->>Switcher: Traffic Results
    and Accident Analysis
        Camera->>AccidentML: Video Stream
        AccidentML->>AccidentML: YOLOv8 Inference
        AccidentML->>Switcher: Accident Results
    end
    
    Switcher->>API: Combined Results
    API->>Frontend: ML Analysis Response
```

---

## API Architecture

### API Endpoint Documentation

#### Camera Management Endpoints

```typescript
// GET /api/cameras
interface CamerasResponse {
  cameras: CCTVLocation[];
  total: number;
}

// GET /api/cameras/traffic
interface TrafficResponse {
  success: boolean;
  data: TrafficData[];
  timestamp: string;
}

// GET /api/cameras/accident
interface AccidentResponse {
  success: boolean;
  data: AccidentData[];
  timestamp: string;
}

// POST /api/camera-analysis
interface CameraAnalysisRequest {
  cameraId: string;
  analysisType: 'traffic' | 'accident' | 'both';
}

interface CameraAnalysisResponse {
  cameraId: string;
  analysisType: string;
  results: MLAnalysisResult;
  timestamp: string;
}
```

#### Traffic & Analytics Endpoints

```typescript
// GET /api/traffic/realtime
interface RealtimeTrafficResponse {
  success: boolean;
  data: {
    id: string;
    location: StaticCoordinates;
    trafficData: TrafficData;
    accidentData: AccidentData;
  }[];
  timestamp: string;
  source: 'mongodb' | 'static';
}

// POST /api/batch-analysis
interface BatchAnalysisRequest {
  cameras: string[];
  analysisType: 'traffic' | 'accident' | 'both';
  options?: {
    confidence: number;
    region: string;
  };
}

interface BatchAnalysisResponse {
  requestId: string;
  results: {
    cameraId: string;
    analysis: MLAnalysisResult;
    processingTime: number;
  }[];
  totalProcessingTime: number;
}
```

#### Maps & Location Endpoints

```typescript
// GET /api/geocode
interface GeocodeRequest {
  address: string;
}

interface GeocodeResponse {
  results: {
    latitude: number;
    longitude: number;
    formattedAddress: string;
    placeId: string;
  }[];
}

// GET /api/geocode-suggestions
interface GeocodeSuggestionsResponse {
  suggestions: {
    description: string;
    placeId: string;
    matchedSubstrings: MatchedSubstring[];
  }[];
}

// GET /api/maps-config
interface MapsConfigResponse {
  apiKey: string;
  demo: boolean;
  hasServerKey: boolean;
  hasClientKey: boolean;
}
```
---

## Database Architecture

### Static Database Structure

```typescript
// Core Data Models
interface CCTVLocation {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  address: string;
  area: string;
  trafficData: TrafficData;
  accidentData: AccidentData;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

interface TrafficData {
  congestionLevel: 'FREE_FLOW' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'TRAFFIC_JAM';
  vehicleCount: number;
  averageSpeed: number;
  lastUpdated: number;
}

interface AccidentData {
  isAccident: boolean;
  severity: 'minor' | 'major' | 'critical' | null;
  description: string;
  reportedAt?: number;
  resolvedAt?: number;
}
```

### MongoDB Integration

```mermaid
graph TD
    subgraph "Database Layer"
        STATIC_DB[Static Database<br/>TypeScript Implementation]
        MONGO_DB[MongoDB<br/>Production Database]
        SYNC[Data Synchronization]
        CACHE[Application Cache]
    end
    
    subgraph "Data Operations"
        READ[Read Operations]
        WRITE[Write Operations]
        SYNC_AUTO[Auto Sync<br/>30 seconds]
        FALLBACK[Fallback Logic]
    end
    
    STATIC_DB --> SYNC
    SYNC --> MONGO_DB
    STATIC_DB --> CACHE
    CACHE --> READ
    READ --> WRITE
    WRITE --> SYNC_AUTO
    SYNC_AUTO --> FALLBACK
    
    Note over SYNC_AUTO,FALLBACK: Automatic fallback to static data if MongoDB fails
```

### Data Synchronization Strategy

```mermaid
sequenceDiagram
    participant App as Application
    participant Static as Static Database
    participant Sync as Sync Service
    participant Mongo as MongoDB
    participant Cache as Cache Layer
    
    App->>Static: Request Data
    Static->>Cache: Check Cache
    Cache-->>Static: Cache Miss
    Static->>Sync: Trigger Sync
    Sync->>Mongo: Fetch Latest Data
    Mongo-->>Sync: Return Data
    Sync->>Static: Update Data
    Static-->>App: Return Fresh Data
    Static->>Cache: Update Cache
    
    Note over Static,Cache: Auto-sync every 30 seconds
```

---

## Deployment Architecture

### Current Deployment (Development)

```mermaid
graph TB
    subgraph "Development Environment"
        LOCAL[Local Development<br/>localhost:3000]
        ML_LOCAL[ML Servers<br/>localhost:8000-8002]
        MONGODB_LOCAL[MongoDB Local<br/>localhost:27017]
    end
    
    subgraph "Frontend"
        NEXT_JS[Next.js 15<br/>React 19]
        TAILWIND[Tailwind CSS]
        TYPESCRIPT[TypeScript]
    end
    
    subgraph "Services"
        API_ROUTES[API Routes]
        ML_SERVICE[ML Service]
        STATIC_DB[Static Database]
    end
    
    LOCAL --> NEXT_JS
    NEXT_JS --> API_ROUTES
    API_ROUTES --> ML_SERVICE
    ML_SERVICE --> ML_LOCAL
    API_ROUTES --> STATIC_DB
    STATIC_DB -.-> MONGODB_LOCAL
```

### Production Deployment Architecture

```mermaid
graph TB
    subgraph "Frontend (Vercel)"
        NEXT_PROD[Next.js 15 Production]
        CDN[Vercel CDN]
        EDGE[Edge Functions]
    end
    
    subgraph "Backend Services"
        API_PROD[API Routes<br/>Serverless Functions]
        ML_PROD[ML Servers<br/>Dedicated Containers]
        DB_PROD[MongoDB Atlas]
    end
    
    subgraph "External Services"
        GOOGLE_MAPS[Google Maps API]
        FIREBASE[Firebase Services]
        CCTV[CCTV Infrastructure]
    end
    
    subgraph "Monitoring"
        ANALYTICS[Vercel Analytics]
        LOGGING[Application Logs]
        MONITORING[System Health]
    end
    
    USER[End Users] --> CDN
    CDN --> NEXT_PROD
    NEXT_PROD --> API_PROD
    API_PROD --> ML_PROD
    API_PROD --> DB_PROD
    API_PROD --> GOOGLE_MAPS
    ML_PROD --> CCTV
    FIREBASE --> API_PROD
    NEXT_PROD --> ANALYTICS
    API_PROD --> LOGGING
    ML_PROD --> MONITORING
```

### Container Architecture

```yaml
# docker-compose.yml structure
version: '3.8'
services:
  web:
    image: gridlock-guardian-web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - GOOGLE_MAPS_API_KEY=${GOOGLE_MAPS_API_KEY}
  
  ml-traffic:
    image: gridlock-traffic-ml
    ports:
      - "8001:8001"
    volumes:
      - ./models:/app/models
    environment:
      - MODEL_PATH=/app/models/traffic_congestion/best.pt
  
  ml-accident:
    image: gridlock-accident-ml
    ports:
      - "8002:8002"
    volumes:
      - ./models:/app/models
    environment:
      - MODEL_PATH=/app/models/accident_detection/best.pt
  
  ml-switcher:
    image: gridlock-ml-switcher
    ports:
      - "8000:8000"
    depends_on:
      - ml-traffic
      - ml-accident
```

### Environment Configuration

```bash
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://gridlock-guardian.vercel.app

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/traffic
MONGODB_DB_NAME=traffic_management

# Google Maps
GOOGLE_MAPS_API_KEY=your_server_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_client_api_key

# ML Services
TRAFFIC_ML_URL=http://ml-traffic:8001
ACCIDENT_ML_URL=http://ml-accident:8002
ML_SWITCHER_URL=http://ml-switcher:8000

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
FIREBASE_PROJECT_ID=your_project_id
```

---

## Infrastructure & Security

### Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        WAF[Web Application Firewall]
        SSL[SSL/TLS Termination]
        AUTH[Authentication Layer]
        RBAC[Role-Based Access Control]
    end
    
    subgraph "API Security"
        RATE_LIMIT[Rate Limiting]
        CORS[CORS Configuration]
        JWT[JWT Tokens]
        ENCRYPTION[Data Encryption]
    end
    
    subgraph "Data Security"
        INPUT_VALIDATION[Input Validation]
        OUTPUT_SANITIZATION[Output Sanitization]
        SQL_INJECTION[SQL Injection Prevention]
        XSS[XSS Protection]
    end
    
    subgraph "Monitoring & Logging"
        AUDIT_LOGS[Audit Logging]
        ANOMALY_DETECTION[Anomaly Detection]
        ALERT_SYSTEM[Alert System]
        INCIDENT_RESPONSE[Incident Response]
    end
    
    REQUEST --> WAF
    WAF --> SSL
    SSL --> AUTH
    AUTH --> RBAC
    RBAC --> RATE_LIMIT
    RATE_LIMIT --> CORS
    CORS --> JWT
    JWT --> ENCRYPTION
    ENCRYPTION --> INPUT_VALIDATION
    INPUT_VALIDATION --> OUTPUT_SANITIZATION
    OUTPUT_SANITIZATION --> SQL_INJECTION
    SQL_INJECTION --> XSS
    XSS --> AUDIT_LOGS
    AUDIT_LOGS --> ANOMALY_DETECTION
    ANOMALY_DETECTION --> ALERT_SYSTEM
    ALERT_SYSTEM --> INCIDENT_RESPONSE
```

### Performance Optimization

```mermaid
graph TD
    subgraph "Frontend Optimization"
        CODE_SPLITTING[Code Splitting]
        LAZY_LOADING[Lazy Loading]
        CACHE_STRATEGIES[Cache Strategies]
        CDN[Content Delivery Network]
    end
    
    subgraph "API Optimization"
        CACHING[Response Caching]
---

## Conclusion

The GridLock Guardian system represents a comprehensive traffic management solution with the following key architectural strengths:

### ✅ **Strengths**
- **Scalable Architecture**: Microservices design with clear separation of concerns
- **Real-time Capabilities**: Live ML analysis with sub-second response times
- **High Availability**: Multiple fallback mechanisms and monitoring
- **Modern Tech Stack**: Latest versions with strong community support
- **Comprehensive Integration**: Multiple third-party services seamlessly integrated

### 🚀 **Scalability Roadmap**
- **Phase 1**: Current deployment with static database fallback
- **Phase 2**: Full MongoDB integration and auto-scaling
- **Phase 3**: Advanced ML model optimization and GPU acceleration
- **Phase 4**: Multi-region deployment with edge computing

### 🔧 **Technical Debt & Improvements**
- **API Documentation**: Complete OpenAPI/Swagger specification
- **Testing Suite**: Comprehensive unit and integration tests
- **Performance Monitoring**: Detailed APM and tracing
- **Security Audits**: Regular penetration testing and compliance

This architecture provides a solid foundation for a production-ready traffic management system with room for significant scaling and feature enhancement.

---

**Document Version**: 1.0  
**Last Updated**: December 2, 2025  
**Architecture Review Status**: ✅ Approved  
**Next Review Date**: March 2, 2026
        COMPRESSION[Response Compression]
        CONNECTION_POOL[Connection Pooling]
        QUERY_OPTIMIZATION[Query Optimization]
    end
    
    subgraph "ML Optimization"
        MODEL_CACHING[Model Caching]
        GPU_UTILIZATION[GPU Utilization]
        BATCH_PROCESSING[Batch Processing]
        PIPELINE_OPTIMIZATION[Pipeline Optimization]
    end
    
    subgraph "Database Optimization"
        INDEXING[Database Indexing]
        REPLICATION[Database Replication]
        SHARDING[Database Sharding]
        BACKUP[Automated Backups]
    end
    
    CODE_SPLITTING --> LAZY_LOADING
    LAZY_LOADING --> CACHE_STRATEGIES
    CACHE_STRATEGIES --> CDN
    CACHING --> COMPRESSION
    COMPRESSION --> CONNECTION_POOL
    CONNECTION_POOL --> QUERY_OPTIMIZATION
    MODEL_CACHING --> GPU_UTILIZATION
    GPU_UTILIZATION --> BATCH_PROCESSING
    BATCH_PROCESSING --> PIPELINE_OPTIMIZATION
    INDEXING --> REPLICATION
    REPLICATION --> SHARDING
    SHARDING --> BACKUP
```

### Scalability Considerations

| Component | Current Implementation | Scalability Strategy |
|-----------|------------------------|---------------------|
| **Frontend** | Vercel deployment | Auto-scaling with CDN |
| **API Routes** | Serverless functions | Horizontal scaling |
| **ML Servers** | Docker containers | Container orchestration |
| **Database** | MongoDB Atlas | Auto-scaling cluster |
| **CCTV Feeds** | Direct camera access | Load balancing |
| **Real-time Updates** | Polling/websockets | Event streaming |

### Monitoring & Alerting

```mermaid
graph TB
    subgraph "Application Monitoring"
        UPTIME[Uptime Monitoring]
        PERFORMANCE[Performance Metrics]
        ERRORS[Error Tracking]
        USER_ANALYTICS[User Analytics]
    end
    
    subgraph "Infrastructure Monitoring"
        SERVER_HEALTH[Server Health]
        RESOURCE_USAGE[Resource Usage]
        NETWORK[Network Monitoring]
        STORAGE[Storage Monitoring]
    end
    
    subgraph "ML Model Monitoring"
        INFERENCE_TIME[Inference Time]
        ACCURACY[Model Accuracy]
        DRIFT_DETECTION[Model Drift]
        RETRAINING[Auto Retraining]
    end
    
    subgraph "Alert System"
        ALERT_MANAGER[Alert Manager]
        NOTIFICATION_CHANNELS[Notification Channels]
        ESCALATION[Escalation Rules]
        INCIDENT_TRACKING[Incident Tracking]
    end
    
    UPTIME --> ALERT_MANAGER
    PERFORMANCE --> ALERT_MANAGER
    ERRORS --> ALERT_MANAGER
    USER_ANALYTICS --> ALERT_MANAGER
    SERVER_HEALTH --> ALERT_MANAGER
    RESOURCE_USAGE --> ALERT_MANAGER
    NETWORK --> ALERT_MANAGER
    STORAGE --> ALERT_MANAGER
    INFERENCE_TIME --> ALERT_MANAGER
    ACCURACY --> ALERT_MANAGER
    DRIFT_DETECTION --> ALERT_MANAGER
    RETRAINING --> ALERT_MANAGER
    ALERT_MANAGER --> NOTIFICATION_CHANNELS
    NOTIFICATION_CHANNELS --> ESCALATION
    ESCALATION --> INCIDENT_TRACKING
```

#### Route Services Endpoints

```typescript
// POST /api/route-suggestion
interface RouteSuggestionRequest {
  startPoint: RoutePoint;
  endPoint: RoutePoint;
  preferences?: {
    avoidTolls: boolean;
    avoidHighways: boolean;
    timePreference: 'fastest' | 'shortest' | 'eco_friendly';
  };
}

interface RouteSuggestionResponse {
  routes: RouteOption[];
  timePreference: {
    label: string;
    description: string;
    currentTime: string;
    trafficLevel: string;
  };
}
```

### API Rate Limiting & Security

```mermaid
graph TD
    subgraph "API Security Layer"
        RATE_LIMIT[Rate Limiting]
        AUTH_CHECK[Authentication]
        CORS[CORS Policy]
        VALIDATION[Request Validation]
    end
    
    subgraph "Input Sanitization"
        SANITIZE[Data Sanitization]
        ENCODE[XSS Prevention]
        INJECTION_SQL[SQL Injection Prevention]
    end
    
    subgraph "Response Security"
        HEADERS[Security Headers]
        ENCRYPTION[HTTPS Encryption]
        LOGGING[Access Logging]
    end
    
    REQUEST --> RATE_LIMIT
    RATE_LIMIT --> AUTH_CHECK
    AUTH_CHECK --> CORS
    CORS --> VALIDATION
    VALIDATION --> SANITIZE
    SANITIZE --> ENCODE
    ENCODE --> INJECTION_SQL
    INJECTION_SQL --> HEADERS
    HEADERS --> ENCRYPTION
    ENCRYPTION --> LOGGING
    LOGGING --> RESPONSE
```
    RESULTS --> VISUAL
```

### API Data Flow

```mermaid
flowchart TD
    subgraph "Request Flow"
        CLIENT[Client Request]
        AUTH[Authentication Check]
        VALIDATE[Request Validation]
        ROUTE[Route Handler]
        PROCESS[Business Logic]
        RESPONSE[JSON Response]
    end
    
    subgraph "Data Sources"
        STATIC[(Static DB)]
        MONGO[(MongoDB)]
        ML[ML Services]
        EXTERNAL[External APIs]
    end
    
    CLIENT --> AUTH
    AUTH --> VALIDATE
    VALIDATE --> ROUTE
    ROUTE --> PROCESS
    PROCESS --> STATIC
    PROCESS --> MONGO
    PROCESS --> ML
    PROCESS --> EXTERNAL
    PROCESS --> RESPONSE
    RESPONSE --> CLIENT
```

---

## Component Hierarchy

### Frontend Component Structure

```mermaid
graph TD
    subgraph "App Shell"
        ROOT[RootLayout]
        PAGE[Page Components]
        LAYOUT[DashboardLayout]
    end
    
    subgraph "Core Components"
        DASHBOARD[Dashboard]
        MAP[Map Components]
        CCTV[CCTV Components]
        INCIDENTS[Incident Components]
        ROUTES[Route Components]
    end
    
    subgraph "UI Components"
        UI[Radix UI Components]
        CHARTS[Recharts Components]
        FORMS[React Hook Form]
        MEDIA[Media Components]
    end
    
    subgraph "Service Components"
        ML_COMPONENTS[ML Integration]
        FIREBASE_COMP[Firebase Integration]
        GOOGLE_MAPS_COMP[Maps Integration]
    end
    
    ROOT --> PAGE
    PAGE --> LAYOUT
    LAYOUT --> DASHBOARD
    LAYOUT --> MAP
    LAYOUT --> CCTV
    LAYOUT --> INCIDENTS
    LAYOUT --> ROUTES
    DASHBOARD --> UI
    DASHBOARD --> CHARTS
    CCTV --> MEDIA
    MAP --> GOOGLE_MAPS_COMP
    DASHBOARD --> ML_COMPONENTS
    UI --> FORMS
```

### API Route Structure

```mermaid
graph TD
    subgraph "API Routes"
        ROOT_API[API Root]
        
        subgraph "Camera Endpoints"
            CAMERAS[/api/cameras]
            CAMERA_TRAFFIC[/api/cameras/traffic]
            CAMERA_ACCIDENT[/api/cameras/accident]
            CAMERA_ANALYSIS[/api/camera-analysis]
        end
        
        subgraph "Traffic Endpoints"
            TRAFFIC_REALTIME[/api/traffic/realtime]
            TRAFFIC_BATCH[/api/batch-analysis]
        end
        
        subgraph "Maps & Location"
            GEOCODE[/api/geocode]
            GEOCODE_SUGGESTIONS[/api/geocode-suggestions]
            MAPS_CONFIG[/api/maps-config]
        end
        
        subgraph "Route Services"
            ROUTE_SUGGESTION[/api/route-suggestion]
        end
    end
    
    ROOT_API --> CAMERAS
    ROOT_API --> CAMERA_TRAFFIC
    ROOT_API --> CAMERA_ACCIDENT
    ROOT_API --> CAMERA_ANALYSIS
    ROOT_API --> TRAFFIC_REALTIME
    ROOT_API --> TRAFFIC_BATCH
    ROOT_API --> GEOCODE
    ROOT_API --> GEOCODE_SUGGESTIONS
    ROOT_API --> MAPS_CONFIG
    ROOT_API --> ROUTE_SUGGESTION