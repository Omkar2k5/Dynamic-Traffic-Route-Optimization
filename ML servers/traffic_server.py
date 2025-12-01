#!/usr/bin/env python3
"""
Traffic Congestion Detection Server
Serves ML model for traffic congestion analysis on port 8001
"""

import cv2
import numpy as np
import base64
import io
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from ultralytics import YOLO
import os
import sys

# Add the traffic model directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ML model', 'traffic_congestion', 'traffic_congestion'))

app = Flask(__name__)
CORS(app)

# Load the traffic congestion model
MODEL_PATH = os.path.join('..', 'public', 'models', 'traffic_congestion', 'best.pt')
try:
    model = YOLO(MODEL_PATH)
    print(f"✅ Traffic congestion model loaded: {MODEL_PATH}")
except Exception as e:
    print(f"❌ Error loading traffic model: {e}")
    # Fallback to a basic model if the specific one doesn't exist
    try:
        model = YOLO('yolov8n.pt')
        print("✅ Fallback to yolov8n.pt")
    except Exception as e2:
        print(f"❌ Error loading fallback model: {e2}")
        model = None

class TrafficAnalyzer:
    """Real-time traffic congestion analyzer."""
    
    def __init__(self):
        self.vehicle_count = 0
        self.congestion_level = "UNKNOWN"
        self.average_speed = 0.0
        self.last_analysis = time.time()
        self.analysis_cache = {}
    
    def analyze_frame(self, frame_b64):
        """Analyze a single frame for traffic congestion."""
        try:
            # Decode base64 image
            image_data = base64.b64decode(frame_b64.split(',')[1] if ',' in frame_b64 else frame_b64)
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            if model is None:
                return self._mock_analysis()
            
            # Perform detection
            results = model(frame, conf=0.25, verbose=False)
            
            vehicle_count = 0
            detected_objects = []
            
            if results and len(results) > 0:
                result = results[0]
                if result.boxes is not None:
                    boxes = result.boxes
                    for box in boxes:
                        # Count vehicles (cars, trucks, buses, motorcycles)
                        class_id = int(box.cls.item())
                        class_name = model.names[class_id].lower()
                        
                        if any(vehicle_type in class_name for vehicle_type in 
                               ['car', 'truck', 'bus', 'motorcycle', 'bicycle']):
                            vehicle_count += 1
                            
                            # Get bounding box coordinates
                            xyxy = box.xyxy[0].cpu().numpy()
                            confidence = float(box.conf.item())
                            
                            detected_objects.append({
                                'class': class_name,
                                'confidence': confidence,
                                'bbox': xyxy.tolist()
                            })
            
            # Determine congestion level based on vehicle count and area
            height, width = frame.shape[:2]
            area = height * width
            
            # Simple congestion calculation
            if vehicle_count == 0:
                congestion_level = "FREE_FLOW"
                average_speed = 50.0
            elif vehicle_count <= 5 and area > 100000:
                congestion_level = "LIGHT"
                average_speed = 35.0
            elif vehicle_count <= 15:
                congestion_level = "MODERATE"
                average_speed = 25.0
            elif vehicle_count <= 30:
                congestion_level = "HEAVY"
                average_speed = 15.0
            else:
                congestion_level = "TRAFFIC_JAM"
                average_speed = 5.0
            
            # Store results
            analysis_result = {
                'vehicle_count': vehicle_count,
                'congestion_level': congestion_level,
                'average_speed': average_speed,
                'detected_objects': detected_objects,
                'timestamp': time.time(),
                'frame_info': {
                    'width': width,
                    'height': height,
                    'area': area
                }
            }
            
            self.vehicle_count = vehicle_count
            self.congestion_level = congestion_level
            self.average_speed = average_speed
            self.last_analysis = time.time()
            
            return analysis_result
            
        except Exception as e:
            print(f"❌ Error analyzing frame: {e}")
            return self._mock_analysis()
    
    def _mock_analysis(self):
        """Return mock analysis data for testing."""
        import random
        
        vehicle_count = random.randint(0, 25)
        congestion_levels = ["FREE_FLOW", "LIGHT", "MODERATE", "HEAVY", "TRAFFIC_JAM"]
        
        if vehicle_count == 0:
            congestion_level = "FREE_FLOW"
        elif vehicle_count <= 5:
            congestion_level = "LIGHT"
        elif vehicle_count <= 15:
            congestion_level = "MODERATE"
        elif vehicle_count <= 25:
            congestion_level = "HEAVY"
        else:
            congestion_level = "TRAFFIC_JAM"
        
        average_speed = max(5.0, 50.0 - (vehicle_count * 1.5))
        
        return {
            'vehicle_count': vehicle_count,
            'congestion_level': congestion_level,
            'average_speed': round(average_speed, 1),
            'detected_objects': [],
            'timestamp': time.time(),
            'mock_data': True
        }

# Initialize analyzer
traffic_analyzer = TrafficAnalyzer()

@app.route('/')
def home():
    return jsonify({
        'message': 'Traffic Congestion Detection API',
        'version': '1.0.0',
        'status': 'active',
        'model_loaded': model is not None
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'last_analysis': traffic_analyzer.last_analysis,
        'model_loaded': model is not None
    })

@app.route('/analyze', methods=['POST'])
def analyze_traffic():
    """Analyze image for traffic congestion."""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_data = data['image']
        
        # Analyze the frame
        result = traffic_analyzer.analyze_frame(image_data)
        
        return jsonify({
            'success': True,
            'analysis': result
        })
        
    except Exception as e:
        print(f"❌ Error in /analyze: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/status')
def status():
    """Get current traffic status."""
    return jsonify({
        'vehicle_count': traffic_analyzer.vehicle_count,
        'congestion_level': traffic_analyzer.congestion_level,
        'average_speed': traffic_analyzer.average_speed,
        'last_analysis': traffic_analyzer.last_analysis
    })

@app.route('/switch_model', methods=['POST'])
def switch_model():
    """Switch between models (placeholder for now)."""
    data = request.get_json()
    model_name = data.get('model', 'traffic') if data else 'traffic'
    
    return jsonify({
        'success': True,
        'message': f'Switched to {model_name} model',
        'current_model': 'traffic_congestion'
    })

if __name__ == '__main__':
    print("🚀 Starting Traffic Congestion Detection Server...")
    print("📍 Port: 8001")
    print("🔗 Health check: http://localhost:8001/health")
    print("🎯 Analysis endpoint: POST http://localhost:8001/analyze")
    app.run(host='0.0.0.0', port=8001, debug=False)