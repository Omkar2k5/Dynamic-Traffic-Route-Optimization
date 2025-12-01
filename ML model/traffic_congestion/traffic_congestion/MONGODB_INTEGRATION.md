# MongoDB Integration for Traffic Congestion Detection

This document explains the MongoDB integration added to the traffic congestion detection system.

## Features Added

### 1. MongoDBHandler Class
- **Location**: `detection.py` - MongoDBHandler class
- **Purpose**: Handles all MongoDB operations for traffic data storage
- **Connection**: Connects to MongoDB at `localhost:17017`
- **Database**: Uses `Traffic` database and `cctv` collection

### 2. Document Structure
The system creates and updates documents with the following structure:

```json
{
  "_id": "cctv1",
  "coordinates": {
    "latitude": 18.4807,
    "longitude": 73.8610
  },
  "traffic_status": "FREE_FLOW",
  "timestamp": "2025-12-01T22:17:51.951Z",
  "congestion_score": 0.25,
  "vehicle_count": 5,
  "average_speed": 12.5,
  "stopped_count": 2,
  "updated_at": "2025-12-01T22:17:51.951Z"
}
```

### 3. Traffic Status Mapping
- `FREE_FLOW`: Normal traffic flow (score 0.0-0.2)
- `LIGHT_CONGESTION`: Light traffic congestion (score 0.2-0.4)
- `MODERATE_CONGESTION`: Moderate traffic congestion (score 0.4-0.6)
- `HEAVY_CONGESTION`: Heavy traffic congestion (score 0.6-0.8)
- `TRAFFIC_JAM`: Severe traffic jam (score 0.8-1.0)

## Usage

### Basic Usage
```bash
# Run with default MongoDB settings (localhost:17017, Traffic database, cctv collection)
python detection.py

# Use specific model
python detection.py --model models/best.pt
```

### Custom MongoDB Settings
```bash
# Custom MongoDB host and port
python detection.py --mongo-host 192.168.1.100 --mongo-port 27017

# Custom database and collection
python detection.py --mongo-db ProductionTraffic --mongo-collection cameras

# Disable MongoDB integration
python detection.py --no-mongodb
```

### All Options
```bash
python detection.py \
  --model models/best.pt \
  --camera 0 \
  --width 1920 \
  --height 1080 \
  --fps 30 \
  --mongo-host localhost \
  --mongo-port 17017 \
  --mongo-db Traffic \
  --mongo-collection cctv \
  --csv metrics.csv
```

## Dependencies

### Required Python Package
```bash
pip install pymongo
```

### MongoDB Setup
1. Install MongoDB if not already installed
2. Start MongoDB server on port 17017:
   ```bash
   mongod --dbpath /path/to/your/db --port 17017
   ```
3. The system will automatically create the database and collection

## Testing

Run the test script to verify MongoDB integration:

```bash
python test_mongodb_integration.py
```

The test script will:
1. Check if pymongo is installed
2. Test MongoDB connection
3. Simulate traffic status updates
4. Verify document structure
5. Test document retrieval

## Integration Points

### 1. LiveTrafficDetector Class
- Added MongoDB handler initialization in constructor
- Integrated MongoDB updates in the main processing loop
- Added cleanup for MongoDB connection

### 2. Congestion Analysis Integration
- MongoDB updates happen after each congestion analysis
- Updates include:
  - Traffic status (based on congestion level)
  - Congestion score
  - Vehicle count
  - Average speed
  - Stopped vehicle count
  - Timestamp

### 3. Real-time Updates
- Traffic status is updated in real-time as the system processes camera frames
- Each frame analysis triggers a MongoDB update
- The document is continuously updated with the latest traffic conditions

## Error Handling

The system handles various error scenarios gracefully:

1. **Missing pymongo**: If pymongo is not installed, the system continues without MongoDB integration and shows a warning
2. **Connection failures**: If MongoDB connection fails, the system continues without MongoDB updates
3. **Update failures**: Individual MongoDB update failures are logged but don't stop the detection process

## Verification

To verify data in MongoDB:

### MongoDB Compass
1. Connect to `mongodb://localhost:17017`
2. Navigate to `Traffic` database → `cctv` collection
3. View the `cctv1` document

### Command Line
```bash
# Connect to MongoDB
mongo --host localhost --port 17017

# View the database
use Traffic

# View the document
db.cctv.find().pretty()
```

### Python Script
```python
from pymongo import MongoClient

client = MongoClient('localhost', 17017)
db = client['Traffic']
collection = db['cctv']

doc = collection.find_one({"_id": "cctv1"})
print(doc)
```

## Monitoring

The system provides real-time feedback:

1. **Connection Status**: Shows when MongoDB connects/disconnects
2. **Update Confirmation**: Confirms each successful update with traffic status details
3. **Error Reporting**: Reports any MongoDB-related errors

Example output:
```
✓ Connected to MongoDB: Traffic.cctv
✓ Updated traffic status: FREE_FLOW (score: 0.15, vehicles: 3)
✓ Updated traffic status: MODERATE_CONGESTION (score: 0.52, vehicles: 8)
```

## Performance Considerations

1. **Real-time Updates**: Updates happen every frame (typically 30 FPS)
2. **Minimal Overhead**: MongoDB operations are lightweight and don't impact detection performance
3. **Graceful Degradation**: System continues functioning even if MongoDB is unavailable

## Future Enhancements

Potential improvements could include:
1. Batched updates for better performance
2. Historical data collection
3. Multiple camera support
4. Data analytics and reporting
5. Real-time notifications based on congestion thresholds