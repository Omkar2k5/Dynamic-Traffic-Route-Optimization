# ML Model Servers

This directory contains the machine learning model servers for traffic analysis and accident detection, along with a model switching mechanism to manage multiple models with a single camera.

## 🏗️ Architecture

### Servers Overview
- **Model Switcher (Port 8000)**: Unified API to switch between models and route requests
- **Traffic Congestion Server (Port 8001)**: Real-time traffic analysis and congestion detection
- **Accident Detection Server (Port 8002)**: Accident detection and risk assessment

### Model Switching Mechanism
Since there's only one camera available, the system implements a switching mechanism that allows you to:
- Switch between traffic and accident detection models
- Route camera feed to the currently active model
- Monitor server health and automatically restart if needed

## 🚀 Quick Start

### Start All Servers
```bash
cd ML servers
python start_servers.py
```

This will start all three servers and provide you with the URLs for each service.

### Manual Server Start (Individual)
If you prefer to start servers individually:

```bash
# Start Model Switcher (Main API)
python model_switcher.py

# In separate terminals:
python traffic_server.py     # Port 8001
python accident_server.py    # Port 8002
```

## 📡 API Endpoints

### Model Switcher (Port 8000)
- `GET /` - Server information and status
- `GET /status` - Current system status with server health
- `POST /switch` - Switch between models
- `POST /analyze` - Send analysis request to current active model
- `POST /start_servers` - Start all ML servers
- `POST /stop_servers` - Stop all ML servers
- `GET /health` - Health check

### Traffic Server (Port 8001)
- `GET /` - Server information
- `GET /health` - Health check
- `POST /analyze` - Analyze image for traffic congestion
- `GET /status` - Get current traffic status

### Accident Server (Port 8002)
- `GET /` - Server information
- `GET /health` - Health check
- `POST /analyze` - Analyze image for accidents
- `POST /predict` - Legacy endpoint for compatibility
- `GET /status` - Get current accident status

## 🔄 Model Switching

### Switch Between Models
```bash
curl -X POST http://localhost:8000/switch \\
  -H "Content-Type: application/json" \\
  -d '{"model": "traffic"}'
```

### Send Analysis Request
```bash
curl -X POST http://localhost:8000/analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
  }'
```

## 📊 Usage Examples

### Check System Status
```bash
curl http://localhost:8000/status
```

Response:
```json
{
  "current_model": "traffic",
  "servers": {
    "traffic": {
      "name": "Traffic Congestion Detection",
      "url": "http://localhost:8001",
      "port": 8001,
      "active": true
    },
    "accident": {
      "name": "Accident Detection",
      "url": "http://localhost:8002",
      "port": 8002,
      "active": false
    }
  }
}
```

### Switch to Accident Detection
```bash
curl -X POST http://localhost:8000/switch \\
  -H "Content-Type: application/json" \\
  -d '{"model": "accident"}'
```

### Analyze Current Camera Feed
```bash
# First capture a frame from your camera or use the CCTV page
# Then send it for analysis:
curl -X POST http://localhost:8000/analyze \\
  -H "Content-Type: application/json" \\
  -d '{
    "image": "base64_encoded_image_data"
  }'
```

## 🎥 CCTV Integration

### CCTV Monitoring Page
The CCTV monitoring page (`/cctv`) now provides:
- **Camera Access**: Opens device camera with user permission
- **Live Feed**: Real-time camera display with privacy controls
- **Demo Mode**: Fallback simulation when camera access fails
- **Fullscreen Support**: Toggle fullscreen viewing
- **No AI Analysis**: Camera feed only, no automatic model processing

### Manual Model Control
To apply AI analysis to the camera feed:
1. Use the Model Switcher API to select a model
2. Capture frames from the camera feed
3. Send frames to the analysis endpoint

Example integration in JavaScript:
```javascript
// Switch to traffic analysis
await fetch('http://localhost:8000/switch', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'traffic' })
});

// Capture frame from video element
const canvas = document.createElement('canvas');
const video = document.querySelector('video');
canvas.width = video.videoWidth;
canvas.height = video.videoHeight;
const ctx = canvas.getContext('2d');
ctx.drawImage(video, 0, 0);

// Get base64 image data
const imageData = canvas.toDataURL('image/jpeg');

// Send for analysis
const analysisResult = await fetch('http://localhost:8000/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: imageData })
});
```

## 🛠️ Configuration

### Environment Variables
- No specific environment variables required
- Models are loaded from default paths:
  - Traffic: `../public/models/traffic_congestion/best.pt`
  - Accident: `../public/models/accident_detection/best.pt`

### Model Files
Ensure the following model files exist:
- `../public/models/traffic_congestion/best.pt`
- `../public/models/accident_detection/best.pt`

## 🔧 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using the port
   netstat -ano | findstr :8000
   # Kill the process
   taskkill /PID <process_id> /F
   ```

2. **Camera Access Denied**
   - Check browser permissions for camera access
   - Ensure HTTPS connection (required for camera API)
   - Try different browsers

3. **Model Loading Errors**
   - Verify model files exist in the correct paths
   - Check Python dependencies: `pip install ultralytics torch torchvision flask flask-cors`

4. **Server Not Responding**
   ```bash
   # Check server health
   curl http://localhost:8000/health
   ```

### Debug Mode
Run servers in debug mode for detailed logging:
```bash
python model_switcher.py --debug
```

## 📝 Testing

### Test Individual Servers
```bash
# Test traffic server
curl http://localhost:8001/health

# Test accident server  
curl http://localhost:8002/health

# Test model switcher
curl http://localhost:8000/status
```

### End-to-End Test
1. Start all servers: `python start_servers.py`
2. Open CCTV page: `http://localhost:3000/cctv`
3. Start camera feed
4. Test model switching via API
5. Send analysis requests to verify functionality

## 🔒 Security Notes

- Camera access requires user permission
- API endpoints are currently open (no authentication)
- Consider adding API keys for production use
- Camera feed is not recorded by default
- All analysis happens locally on your machine

## 📈 Performance

- **Traffic Server**: Optimized for real-time analysis
- **Accident Server**: Focused on high-confidence detection
- **Model Switcher**: Minimal overhead, fast routing
- **CCTV Page**: Hardware-accelerated video rendering

## 🎯 Next Steps

1. **Frontend Integration**: Add UI controls for model switching
2. **Real-time Analysis**: Implement continuous analysis loop
3. **Alert System**: Add notifications for critical events
4. **Data Logging**: Store analysis results for historical data
5. **Multi-camera Support**: Extend to handle multiple camera feeds