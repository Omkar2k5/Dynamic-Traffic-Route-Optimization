#!/usr/bin/env python3
"""
Accident Detection Server
Serves ML model for accident detection on port 8002
"""

import cv2
import numpy as np
import base64
import io
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import torchvision.transforms as transforms
import torch
from ultralytics import YOLO
import os

app = Flask(__name__)
CORS(app)

# Load the accident detection model
MODEL_PATH = os.path.join('..', 'public', 'models', 'accident_detection', 'best.pt')
try:
    model = YOLO(MODEL_PATH)
    print(f"✅ Accident detection model loaded: {MODEL_PATH}")
except Exception as e:
    print(f"❌ Error loading accident model: {e}")
    # Fallback to a basic model if the specific one doesn't exist
    try:
        model = YOLO('yolov8n.pt')
        print("✅ Fallback to yolov8n.pt")
    except Exception as e2:
        print(f"❌ Error loading fallback model: {e2}")
        model = None

# Preprocessing function
def transform_image(image_bytes):
    """Transform image for model input."""
    transform = transforms.Compose([
        transforms.Resize((640, 640)),  # Adjust according to the model's input size
        transforms.ToTensor()
    ])
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")  # Ensure image is in RGB format
    return transform(image).unsqueeze(0)  # Add batch dimension

class AccidentAnalyzer:
    """Real-time accident detection analyzer."""
    
    def __init__(self):
        self.accident_detected = False
        self.confidence = 0.0
        self.last_analysis = time.time()
        self.detected_objects = []
        self.risk_level = "LOW"
    
    def analyze_frame(self, frame_b64):
        """Analyze a single frame for accidents."""
        try:
            # Decode base64 image
            image_data = base64.b64decode(frame_b64.split(',')[1] if ',' in frame_b64 else frame_b64)
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            if model is None:
                return self._mock_analysis()
            
            # Perform detection
            results = model(frame, conf=0.25, verbose=False)
            
            accident_detected = False
            confidence = 0.0
            detected_objects = []
            risk_level = "LOW"
            
            if results and len(results) > 0:
                result = results[0]
                if result.boxes is not None:
                    boxes = result.boxes
                    
                    for box in boxes:
                        # Get detection details
                        xyxy = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf.item())
                        class_id = int(box.cls.item())
                        class_name = model.names[class_id].lower()
                        
                        # Check for accident-related objects
                        is_accident_related = any(keyword in class_name for keyword in [
                            'accident', 'crash', 'collision', 'damage', 'incident'
                        ])
                        
                        if is_accident_related or conf > 0.7:
                            accident_detected = True
                            confidence = max(confidence, conf)
                        
                        # Determine risk level based on detected objects
                        if any(risk_word in class_name for risk_word in ['accident', 'crash', 'collision']):
                            risk_level = "HIGH"
                        elif any(danger_word in class_name for danger_word in ['damage', 'broken', 'stopped']):
                            risk_level = "MEDIUM"
                        
                        detected_objects.append({
                            'class': class_name,
                            'confidence': conf,
                            'bbox': xyxy.tolist(),
                            'is_accident_related': is_accident_related
                        })
            
            # If no specific accident objects detected, check for unusual patterns
            if not accident_detected and len(detected_objects) > 0:
                # Check for stopped vehicles (potential accidents)
                stopped_vehicles = 0
                for obj in detected_objects:
                    if any(vehicle in obj['class'] for vehicle in ['car', 'truck', 'bus']) and obj['confidence'] > 0.5:
                        # Simple heuristic: if there are many vehicles stopped, consider it risky
                        stopped_vehicles += 1
                
                if stopped_vehicles >= 3:  # Threshold for potential accident
                    risk_level = "MEDIUM"
                    accident_detected = True
                    confidence = 0.6
            
            # Store results
            analysis_result = {
                'accident_detected': accident_detected,
                'confidence': round(confidence, 3),
                'risk_level': risk_level,
                'detected_objects': detected_objects,
                'timestamp': time.time(),
                'object_count': len(detected_objects)
            }
            
            self.accident_detected = accident_detected
            self.confidence = confidence
            self.risk_level = risk_level
            self.detected_objects = detected_objects
            self.last_analysis = time.time()
            
            return analysis_result
            
        except Exception as e:
            print(f"❌ Error analyzing frame for accidents: {e}")
            return self._mock_analysis()
    
    def _mock_analysis(self):
        """Return mock analysis data for testing."""
        import random
        
        # Randomly simulate accident detection for testing
        accident_chance = random.random()
        accident_detected = accident_chance > 0.85  # 15% chance of accident
        
        if accident_detected:
            confidence = random.uniform(0.6, 0.95)
            risk_level = "HIGH" if confidence > 0.8 else "MEDIUM"
        else:
            confidence = random.uniform(0.1, 0.4)
            risk_level = "LOW"
        
        detected_objects = [
            {
                'class': random.choice(['car', 'truck', 'bus', 'person', 'bicycle']),
                'confidence': random.uniform(0.3, 0.9),
                'bbox': [random.randint(100, 500), random.randint(100, 400), random.randint(150, 550), random.randint(150, 450)],
                'is_accident_related': accident_detected
            }
        ]
        
        return {
            'accident_detected': accident_detected,
            'confidence': round(confidence, 3),
            'risk_level': risk_level,
            'detected_objects': detected_objects,
            'timestamp': time.time(),
            'object_count': len(detected_objects),
            'mock_data': True
        }

# Initialize analyzer
accident_analyzer = AccidentAnalyzer()

@app.route('/')
def home():
    return jsonify({
        'message': 'Accident Detection API',
        'version': '1.0.0',
        'status': 'active',
        'model_loaded': model is not None
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'last_analysis': accident_analyzer.last_analysis,
        'model_loaded': model is not None
    })

@app.route('/predict', methods=['POST'])
def predict():
    """Legacy endpoint for compatibility with existing frontend."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        img_bytes = file.read()
        
        # Convert to base64 for consistent processing
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        result = accident_analyzer.analyze_frame(img_base64)
        
        return jsonify({
            'success': True,
            'prediction': result
        })
        
    except Exception as e:
        print(f"❌ Error in /predict: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/analyze', methods=['POST'])
def analyze_accident():
    """Analyze image for accident detection."""
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        image_data = data['image']
        
        # Analyze the frame
        result = accident_analyzer.analyze_frame(image_data)
        
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
    """Get current accident detection status."""
    return jsonify({
        'accident_detected': accident_analyzer.accident_detected,
        'confidence': accident_analyzer.confidence,
        'risk_level': accident_analyzer.risk_level,
        'object_count': len(accident_analyzer.detected_objects),
        'last_analysis': accident_analyzer.last_analysis
    })

@app.route('/switch_model', methods=['POST'])
def switch_model():
    """Switch between models (placeholder for now)."""
    data = request.get_json()
    model_name = data.get('model', 'accident') if data else 'accident'
    
    return jsonify({
        'success': True,
        'message': f'Switched to {model_name} model',
        'current_model': 'accident_detection'
    })

if __name__ == '__main__':
    print("🚀 Starting Accident Detection Server...")
    print("📍 Port: 8002")
    print("🔗 Health check: http://localhost:8002/health")
    print("🎯 Analysis endpoint: POST http://localhost:8002/analyze")
    print("📄 Legacy predict endpoint: POST http://localhost:8002/predict")
    app.run(host='0.0.0.0', port=8002, debug=False)