#!/usr/bin/env python3
"""
Model Switcher Server
Unified API to switch between traffic and accident detection models
"""

import requests
import json
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from threading import Thread
import subprocess
import os

app = Flask(__name__)
CORS(app)

# ML Server configurations
ML_SERVERS = {
    'traffic': {
        'name': 'Traffic Congestion Detection',
        'url': 'http://localhost:8001',
        'port': 8001,
        'script': 'traffic_server.py',
        'active': False
    },
    'accident': {
        'name': 'Accident Detection',
        'url': 'http://localhost:8002',
        'port': 8002,
        'script': 'accident_server.py',
        'active': False
    }
}

# Current active model
current_model = 'traffic'
switch_history = []

def check_server_health(server_name):
    """Check if a server is running and healthy."""
    server = ML_SERVERS[server_name]
    try:
        response = requests.get(f"{server['url']}/health", timeout=2)
        return response.status_code == 200
    except:
        return False

def start_server(server_name):
    """Start a specific ML server."""
    server = ML_SERVERS[server_name]
    try:
        script_path = os.path.join(os.path.dirname(__file__), server['script'])
        if os.path.exists(script_path):
            # Start server in background
            process = subprocess.Popen(
                ['python', script_path],
                cwd=os.path.dirname(script_path),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            
            # Wait a moment for server to start
            time.sleep(2)
            
            # Check if server is now healthy
            if check_server_health(server_name):
                server['active'] = True
                print(f"✅ Started {server['name']} on port {server['port']}")
                return True
            else:
                print(f"❌ Failed to start {server['name']}")
                return False
        else:
            print(f"❌ Script not found: {script_path}")
            return False
    except Exception as e:
        print(f"❌ Error starting {server['name']}: {e}")
        return False

def stop_server(server_name):
    """Stop a specific ML server."""
    server = ML_SERVERS[server_name]
    try:
        # Send termination request to server
        response = requests.post(f"{server['url']}/shutdown", timeout=1)
    except:
        pass  # Server might not respond, continue with cleanup
    
    # Kill any remaining processes on the port
    try:
        os.system(f"taskkill /F /IM python.exe >nul 2>&1")
    except:
        pass
    
    server['active'] = False
    print(f"🛑 Stopped {server['name']}")

def switch_model(new_model):
    """Switch to a different model."""
    global current_model
    
    if new_model not in ML_SERVERS:
        return False, f"Unknown model: {new_model}"
    
    if new_model == current_model:
        return True, f"Already using {new_model} model"
    
    old_model = current_model
    
    # Start new model server if not already running
    if not ML_SERVERS[new_model]['active']:
        if not start_server(new_model):
            return False, f"Failed to start {new_model} model"
    
    # Switch to new model
    current_model = new_model
    
    # Record switch in history
    switch_history.append({
        'timestamp': time.time(),
        'from': old_model,
        'to': new_model
    })
    
    return True, f"Switched from {old_model} to {new_model}"

@app.route('/')
def home():
    """Server information."""
    return jsonify({
        'message': 'ML Model Switcher API',
        'version': '1.0.0',
        'available_models': list(ML_SERVERS.keys()),
        'current_model': current_model,
        'server_status': {name: server['active'] for name, server in ML_SERVERS.items()}
    })

@app.route('/status')
def status():
    """Get current system status."""
    status_info = {}
    for name, server in ML_SERVERS.items():
        status_info[name] = {
            'name': server['name'],
            'url': server['url'],
            'port': server['port'],
            'active': check_server_health(name),
            'configured_active': server['active']
        }
    
    return jsonify({
        'current_model': current_model,
        'servers': status_info,
        'switch_history': switch_history[-10:]  # Last 10 switches
    })

@app.route('/switch', methods=['POST'])
def switch():
    """Switch to a different model."""
    try:
        data = request.get_json()
        if not data or 'model' not in data:
            return jsonify({'error': 'No model specified'}), 400
        
        new_model = data['model']
        success, message = switch_model(new_model)
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'current_model': current_model
            })
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/analyze', methods=['POST'])
def analyze():
    """Route analysis request to the current active model."""
    try:
        # Check if current model server is healthy
        if not check_server_health(current_model):
            return jsonify({
                'success': False,
                'error': f'{current_model} model server is not available'
            }), 503
        
        # Forward request to the appropriate server
        server = ML_SERVERS[current_model]
        response = requests.post(
            f"{server['url']}/analyze",
            json=request.get_json(),
            timeout=10
        )
        
        return jsonify(response.json())
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': f'Failed to connect to {current_model} model server: {str(e)}'
        }), 503
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/start_servers', methods=['POST'])
def start_servers():
    """Start all ML servers."""
    try:
        data = request.get_json() or {}
        models_to_start = data.get('models', list(ML_SERVERS.keys()))
        
        results = {}
        for model in models_to_start:
            if model in ML_SERVERS:
                if check_server_health(model):
                    results[model] = {'success': True, 'message': 'Already running'}
                else:
                    success = start_server(model)
                    results[model] = {
                        'success': success,
                        'message': 'Started successfully' if success else 'Failed to start'
                    }
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stop_servers', methods=['POST'])
def stop_servers():
    """Stop all ML servers."""
    try:
        data = request.get_json() or {}
        models_to_stop = data.get('models', list(ML_SERVERS.keys()))
        
        results = {}
        for model in models_to_stop:
            if model in ML_SERVERS:
                stop_server(model)
                results[model] = {'success': True, 'message': 'Stopped successfully'}
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'current_model': current_model,
        'available_models': list(ML_SERVERS.keys()),
        'server_count': len([s for s in ML_SERVERS.values() if s['active']])
    })

# Initialize - start default model server
print("🚀 Starting ML Model Switcher...")
print(f"📍 Port: 8000")
print(f"🎯 Switch endpoint: POST http://localhost:8000/switch")
print(f"📊 Status endpoint: GET http://localhost:8000/status")

# Start default model (traffic) on startup
if __name__ == '__main__':
    print("\n🔄 Initializing default model (traffic)...")
    switch_model('traffic')
    
    app.run(host='0.0.0.0', port=8000, debug=False)