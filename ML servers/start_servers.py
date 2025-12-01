#!/usr/bin/env python3
"""
ML Servers Startup Script
Starts all ML model servers and the model switcher
"""

import subprocess
import time
import sys
import os
import threading
import signal

class ServerManager:
    def __init__(self):
        self.processes = []
        self.running = True

    def start_server(self, name, script, port, working_dir=None):
        """Start a server process."""
        try:
            print(f"🚀 Starting {name} on port {port}...")
            
            # Change to the script directory
            script_dir = os.path.dirname(os.path.abspath(__file__))
            if working_dir:
                script_dir = os.path.join(script_dir, working_dir)
            
            process = subprocess.Popen(
                [sys.executable, script],
                cwd=script_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            
            self.processes.append((name, port, process))
            
            # Wait a moment for server to initialize
            time.sleep(2)
            
            print(f"✅ {name} started successfully (PID: {process.pid})")
            return True
            
        except Exception as e:
            print(f"❌ Failed to start {name}: {e}")
            return False

    def stop_all(self):
        """Stop all running servers."""
        print("\n🛑 Stopping all servers...")
        self.running = False
        
        for name, port, process in self.processes:
            try:
                print(f"   Stopping {name} (PID: {process.pid})...")
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                print(f"   Force killing {name}...")
                process.kill()
            except Exception as e:
                print(f"   Error stopping {name}: {e}")

    def monitor_processes(self):
        """Monitor all processes and restart if needed."""
        while self.running:
            time.sleep(5)
            
            for name, port, process in self.processes:
                if process.poll() is not None:
                    print(f"⚠️  {name} (PID: {process.pid}) has stopped unexpectedly")
                    print(f"   Attempting to restart {name}...")
                    
                    # Restart the server
                    self.start_server(name, self.get_script_name(name), port)

    def get_script_name(self, name):
        """Get the script name for a server."""
        scripts = {
            'Model Switcher': 'model_switcher.py',
            'Traffic Congestion': 'traffic_server.py',
            'Accident Detection': 'accident_server.py'
        }
        return scripts.get(name, 'unknown.py')

    def start_all(self):
        """Start all ML servers."""
        print("=" * 60)
        print("🎯 ML MODEL SERVERS STARTUP")
        print("=" * 60)
        
        # Define servers to start
        servers = [
            ('Model Switcher', 'model_switcher.py', 8000),
            ('Traffic Congestion', 'traffic_server.py', 8001),
            ('Accident Detection', 'accident_server.py', 8002)
        ]
        
        # Start servers
        for name, script, port in servers:
            self.start_server(name, script, port)
            time.sleep(1)  # Small delay between starts
        
        print("\n" + "=" * 60)
        print("🌐 SERVER INFORMATION")
        print("=" * 60)
        print("📍 Model Switcher:  http://localhost:8000")
        print("📍 Traffic Server:  http://localhost:8001")
        print("📍 Accident Server: http://localhost:8002")
        print("\n📊 Status Check:    GET http://localhost:8000/status")
        print("🔄 Switch Model:    POST http://localhost:8000/switch")
        print("🎯 Analyze:         POST http://localhost:8000/analyze")
        print("=" * 60)
        
        # Start monitoring in a separate thread
        monitor_thread = threading.Thread(target=self.monitor_processes, daemon=True)
        monitor_thread.start()
        
        try:
            print("\n🔄 Servers are running... Press Ctrl+C to stop all servers")
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Shutdown signal received...")
        finally:
            self.stop_all()
            print("\n✅ All servers stopped successfully")

def main():
    """Main startup function."""
    # Change to the ML servers directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    manager = ServerManager()
    manager.start_all()

if __name__ == '__main__':
    main()