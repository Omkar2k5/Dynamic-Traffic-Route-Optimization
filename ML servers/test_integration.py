#!/usr/bin/env python3
"""
Integration Test Script
Tests the ML servers and model switching functionality
"""

import requests
import time
import json
import base64
from PIL import Image
import io
import numpy as np

def create_test_image():
    """Create a simple test image."""
    # Create a simple test image
    img_array = np.zeros((480, 640, 3), dtype=np.uint8)
    img_array[100:200, 100:200] = [255, 0, 0]  # Red square
    img_array[250:350, 400:500] = [0, 255, 0]  # Green square
    
    # Convert to PIL Image
    img = Image.fromarray(img_array)
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/jpeg;base64,{img_base64}"

def test_servers():
    """Test all servers and model switching."""
    print("🧪 ML SERVERS INTEGRATION TEST")
    print("=" * 50)
    
    # Test endpoints
    endpoints = {
        "Model Switcher": "http://localhost:8000",
        "Traffic Server": "http://localhost:8001", 
        "Accident Server": "http://localhost:8002"
    }
    
    # Test server health
    print("\n1. Testing Server Health...")
    for name, url in endpoints.items():
        try:
            response = requests.get(f"{url}/health", timeout=5)
            if response.status_code == 200:
                print(f"   ✅ {name}: HEALTHY")
            else:
                print(f"   ❌ {name}: HTTP {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"   ❌ {name}: CONNECTION ERROR - {e}")
    
    # Test model switcher status
    print("\n2. Testing Model Switcher Status...")
    try:
        response = requests.get("http://localhost:8000/status", timeout=5)
        if response.status_code == 200:
            status = response.json()
            print(f"   Current Model: {status.get('current_model', 'unknown')}")
            print(f"   Available Models: {status.get('available_models', [])}")
            
            servers = status.get('servers', {})
            for model_name, server_info in servers.items():
                status_text = "Active" if server_info.get('active') else "Inactive"
                print(f"   {model_name.title()} Server: {status_text}")
        else:
            print(f"   ❌ Status check failed: HTTP {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Status check failed: {e}")
    
    # Test model switching
    print("\n3. Testing Model Switching...")
    test_models = ['traffic', 'accident']
    
    for model in test_models:
        try:
            response = requests.post(
                "http://localhost:8000/switch",
                json={'model': model},
                timeout=5
            )
            if response.status_code == 200:
                result = response.json()
                print(f"   ✅ Switched to {model}: {result.get('message', '')}")
            else:
                print(f"   ❌ Failed to switch to {model}: HTTP {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"   ❌ Failed to switch to {model}: {e}")
        
        time.sleep(1)  # Wait for server to start
    
    # Test analysis with both models
    print("\n4. Testing Analysis with Test Image...")
    test_image = create_test_image()
    
    for model in test_models:
        try:
            # First switch to the model
            requests.post(
                "http://localhost:8000/switch",
                json={'model': model},
                timeout=5
            )
            
            # Wait a moment for server to initialize
            time.sleep(2)
            
            # Test analysis
            response = requests.post(
                "http://localhost:8000/analyze",
                json={'image': test_image},
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"   ✅ {model.title()} Analysis: SUCCESS")
                    if model == 'traffic':
                        analysis = result.get('analysis', {})
                        print(f"      Vehicles: {analysis.get('vehicle_count', 'N/A')}")
                        print(f"      Congestion: {analysis.get('congestion_level', 'N/A')}")
                    elif model == 'accident':
                        analysis = result.get('analysis', {})
                        print(f"      Accident Detected: {analysis.get('accident_detected', 'N/A')}")
                        print(f"      Risk Level: {analysis.get('risk_level', 'N/A')}")
                else:
                    print(f"   ❌ {model.title()} Analysis: FAILED - {result.get('error', 'Unknown error')}")
            else:
                print(f"   ❌ {model.title()} Analysis: HTTP {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ {model.title()} Analysis: CONNECTION ERROR - {e}")
        except Exception as e:
            print(f"   ❌ {model.title()} Analysis: ERROR - {e}")
    
    print("\n" + "=" * 50)
    print("🎯 TEST SUMMARY")
    print("=" * 50)
    print("✅ All server health checks completed")
    print("✅ Model switching functionality tested")
    print("✅ Analysis endpoints tested with sample data")
    print("\n💡 Next Steps:")
    print("   1. Start the Next.js application: npm run dev")
    print("   2. Open http://localhost:3000/cctv")
    print("   3. Test the camera feed")
    print("   4. Use the API to switch between models and analyze frames")
    print("=" * 50)

if __name__ == "__main__":
    print("Starting integration tests...")
    print("Make sure all ML servers are running before starting tests.\n")
    
    # Check if servers are running
    try:
        response = requests.get("http://localhost:8000/health", timeout=2)
        if response.status_code != 200:
            print("⚠️  Warning: Model switcher server may not be running properly.")
    except:
        print("❌ Error: Model switcher server is not running.")
        print("   Please start the servers first: python start_servers.py")
        exit(1)
    
    test_servers()