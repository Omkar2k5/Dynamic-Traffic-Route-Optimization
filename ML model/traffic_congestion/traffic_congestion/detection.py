#!/usr/bin/env python3
"""
detection.py - Live Camera Traffic Detection & Congestion Analysis Pipeline
Handles: live camera capture, detection, tracking, speed estimation, congestion analysis, visualization
"""

import cv2
import numpy as np
import pandas as pd
import argparse
import time
from datetime import datetime
from pathlib import Path
from collections import deque, Counter
from enum import Enum
from dataclasses import dataclass
from ultralytics import YOLO
import threading
import queue
try:
    import pymongo
    from pymongo import MongoClient
except ImportError:
    print("Warning: pymongo not installed. MongoDB integration will be disabled.")
    pymongo = None
    MongoClient = None


# ============================================================================
# MONGODB INTEGRATION
# ============================================================================

class MongoDBHandler:
    """Handle MongoDB operations for traffic data storage."""
    
    def __init__(self, host='localhost', port=27017, database_name='Traffic', collection_name='cctv'):
        self.host = host
        self.port = port
        self.database_name = database_name
        self.collection_name = collection_name
        self.client = None
        self.database = None
        self.collection = None
        self.connected = False
        
        # CCTV static data
        self.cctv_id = "cctv1"
        self.coordinates = {
            "latitude": 18.4807,
            "longitude": 73.8610
        }
        
        if pymongo is not None:
            self.connect()
    
    def connect(self):
        """Connect to MongoDB."""
        if pymongo is None:
            print("MongoDB integration disabled: pymongo not available")
            return False
            
        try:
            self.client = MongoClient(host=self.host, port=self.port, serverSelectionTimeoutMS=5000)
            # Test connection
            self.client.admin.command('ping')
            
            self.database = self.client[self.database_name]
            self.collection = self.database[self.collection_name]
            
            # Create initial document if it doesn't exist
            self._initialize_document()
            
            self.connected = True
            print(f"✓ Connected to MongoDB: {self.database_name}.{self.collection_name}")
            return True
            
        except Exception as e:
            print(f"⚠️ MongoDB connection failed: {e}")
            self.connected = False
            return False
    
    def _initialize_document(self):
        """Initialize the CCTV document with static data."""
        if self.collection is None:
            return
            
        try:
            # Check if document exists
            existing_doc = self.collection.find_one({"_id": self.cctv_id})
            
            if not existing_doc:
                # Create initial document
                initial_doc = {
                    "_id": self.cctv_id,
                    "coordinates": self.coordinates,
                    "traffic_status": "FREE_FLOW",
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "congestion_score": 0.0,
                    "vehicle_count": 0,
                    "updated_at": datetime.utcnow().isoformat() + "Z"
                }
                self.collection.insert_one(initial_doc)
                print(f"✓ Initialized CCTV document: {self.cctv_id}")
                
        except Exception as e:
            print(f"⚠️ Failed to initialize document: {e}")
    
    def update_traffic_status(self, congestion_level, congestion_score, vehicle_count, average_speed=0.0, stopped_count=0):
        """Update traffic status in MongoDB based on congestion analysis."""
        if not self.connected or self.collection is None:
            return False
            
        try:
            # Map congestion level enum to string
            traffic_status_map = {
                CongestionLevel.FREE_FLOW: "FREE_FLOW",
                CongestionLevel.LIGHT: "LIGHT_CONGESTION",
                CongestionLevel.MODERATE: "MODERATE_CONGESTION",
                CongestionLevel.HEAVY: "HEAVY_CONGESTION",
                CongestionLevel.TRAFFIC_JAM: "TRAFFIC_JAM"
            }
            
            traffic_status = traffic_status_map.get(congestion_level, "UNKNOWN")
            
            # Prepare update document
            update_doc = {
                "traffic_status": traffic_status,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "congestion_score": float(congestion_score),
                "vehicle_count": int(vehicle_count),
                "average_speed": float(average_speed),
                "stopped_count": int(stopped_count),
                "updated_at": datetime.utcnow().isoformat() + "Z"
            }
            
            # Update document in MongoDB
            result = self.collection.update_one(
                {"_id": self.cctv_id},
                {"$set": update_doc}
            )
            
            if result.modified_count > 0:
                print(f"✓ Updated traffic status: {traffic_status} (score: {congestion_score:.2f}, vehicles: {vehicle_count})")
                return True
            else:
                print("⚠️ No document was updated")
                return False
                
        except Exception as e:
            print(f"⚠️ Failed to update MongoDB: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from MongoDB."""
        if self.client:
            self.client.close()
            self.connected = False
            print("✓ Disconnected from MongoDB")


# ============================================================================
# TRACKING SYSTEM
# ============================================================================

class VehicleTrack:
    """Store information about a single vehicle track."""
    
    def __init__(self, track_id, max_history=30):
        self.track_id = track_id
        self.max_history = max_history
        self.centroids = deque(maxlen=max_history)
        self.bboxes = deque(maxlen=max_history)
        self.speeds = deque(maxlen=max_history)
        self.class_id = None
        self.class_name = None
        self.first_frame = None
        self.last_frame = None
        self.timestamp = time.time()
    
    def update(self, bbox, frame_idx, class_id=None, class_name=None):
        """Update track with new detection."""
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        
        self.centroids.append((cx, cy))
        self.bboxes.append(bbox)
        
        if class_id is not None:
            self.class_id = class_id
        if class_name is not None:
            self.class_name = class_name
        
        if self.first_frame is None:
            self.first_frame = frame_idx
        self.last_frame = frame_idx
        self.timestamp = time.time()
        
        # Calculate speed (in pixels/frame)
        if len(self.centroids) >= 2:
            prev = self.centroids[-2]
            curr = self.centroids[-1]
            speed = np.sqrt((curr[0]-prev[0])**2 + (curr[1]-prev[1])**2)
            self.speeds.append(speed)
    
    def get_avg_speed(self, window=5):
        """Get average speed over recent frames."""
        if not self.speeds:
            return 0.0
        recent = list(self.speeds)[-window:]
        return float(np.mean(recent))
    
    def is_stopped(self, threshold=2.0):
        """Check if vehicle is stopped (low pixel motion)."""
        return self.get_avg_speed(window=5) < threshold
    
    def is_expired(self, max_age_seconds=10):
        """Check if track is expired based on time."""
        return time.time() - self.timestamp > max_age_seconds


class TrackManager:
    """Manage multiple vehicle tracks."""
    
    def __init__(self, max_age=30):
        self.max_age = max_age
        self.tracks = {}
        self.track_ages = {}
    
    def update(self, detections, frame_idx):
        """Update tracks with new detections."""
        detected_ids = set()
        
        for track_id, bbox, class_id, class_name in detections:
            detected_ids.add(track_id)
            
            if track_id not in self.tracks:
                self.tracks[track_id] = VehicleTrack(track_id)
            
            self.tracks[track_id].update(bbox, frame_idx, class_id, class_name)
            self.track_ages[track_id] = 0
        
        # Age and remove old tracks
        to_remove = []
        for track_id in list(self.tracks.keys()):
            if track_id not in detected_ids:
                self.track_ages[track_id] = self.track_ages.get(track_id, 0) + 1
                if self.track_ages[track_id] > self.max_age:
                    to_remove.append(track_id)
        
        for track_id in to_remove:
            del self.tracks[track_id]
            del self.track_ages[track_id]
        
        # Remove expired tracks
        to_remove_expired = []
        for track_id, track in self.tracks.items():
            if track.is_expired():
                to_remove_expired.append(track_id)
        
        for track_id in to_remove_expired:
            if track_id in self.tracks:
                del self.tracks[track_id]
            if track_id in self.track_ages:
                del self.track_ages[track_id]
    
    def get_active_tracks(self):
        """Get list of active tracks."""
        return list(self.tracks.values())


# ============================================================================
# CONGESTION ANALYSIS
# ============================================================================

class CongestionLevel(Enum):
    """Traffic congestion levels."""
    FREE_FLOW = 0
    LIGHT = 1
    MODERATE = 2
    HEAVY = 3
    TRAFFIC_JAM = 4
    
    @property
    def color(self):
        colors = {
            CongestionLevel.FREE_FLOW: (0, 255, 0),
            CongestionLevel.LIGHT: (0, 255, 255),
            CongestionLevel.MODERATE: (0, 165, 255),
            CongestionLevel.HEAVY: (0, 69, 255),
            CongestionLevel.TRAFFIC_JAM: (0, 0, 255),
        }
        return colors[self]


@dataclass
class CongestionMetrics:
    """Container for congestion metrics."""
    frame_idx: int
    timestamp: float
    vehicle_count: int
    average_speed: float
    stopped_count: int
    occupancy_ratio: float
    congestion_score: float
    congestion_level: CongestionLevel


class CongestionDetector:
    """Detect traffic congestion from vehicle tracks."""
    
    def __init__(self, roi_width=1920, roi_height=1080):
        self.roi_area = roi_width * roi_height
        self.max_vehicles = 50
        
        # Weights for congestion score
        self.density_weight = 0.4
        self.speed_weight = 0.4
        self.stopped_weight = 0.2
        
        # Thresholds
        self.thresholds = {
            CongestionLevel.FREE_FLOW: (0.0, 0.2),
            CongestionLevel.LIGHT: (0.2, 0.4),
            CongestionLevel.MODERATE: (0.4, 0.6),
            CongestionLevel.HEAVY: (0.6, 0.8),
            CongestionLevel.TRAFFIC_JAM: (0.8, 1.0),
        }
    
    def analyze(self, tracks, frame_idx):
        """Analyze current traffic state."""
        if not tracks:
            return CongestionMetrics(
                frame_idx=frame_idx,
                timestamp=time.time(),
                vehicle_count=0,
                average_speed=0.0,
                stopped_count=0,
                occupancy_ratio=0.0,
                congestion_score=0.0,
                congestion_level=CongestionLevel.FREE_FLOW
            )
        
        # Basic metrics
        vehicle_count = len(tracks)
        speeds = [t.get_avg_speed() for t in tracks]
        avg_speed = float(np.mean(speeds)) if speeds else 0.0
        stopped_count = sum(1 for t in tracks if t.is_stopped())
        
        # Occupancy ratio (sum of last bbox areas vs ROI)
        total_bbox_area = 0.0
        for track in tracks:
            if track.bboxes:
                bbox = track.bboxes[-1]
                area = max(0.0, (bbox[2] - bbox[0])) * max(0.0, (bbox[3] - bbox[1]))
                total_bbox_area += area
        occupancy_ratio = min(total_bbox_area / self.roi_area, 1.0) if self.roi_area > 0 else 0.0
        
        # Compute scores (0-1, higher = more congestion)
        density_score = min(vehicle_count / self.max_vehicles, 1.0)
        speed_score = 1.0 - min(avg_speed / 20.0, 1.0)  # Inverse relation
        stopped_score = stopped_count / vehicle_count if vehicle_count > 0 else 0.0
        
        # Weighted congestion score
        congestion_score = (
            self.density_weight * density_score +
            self.speed_weight * speed_score +
            self.stopped_weight * stopped_score
        )
        
        # Classify into levels
        congestion_level = CongestionLevel.FREE_FLOW
        for level, (min_s, max_s) in self.thresholds.items():
            if min_s <= congestion_score < max_s:
                congestion_level = level
                break
        
        return CongestionMetrics(
            frame_idx=frame_idx,
            timestamp=time.time(),
            vehicle_count=vehicle_count,
            average_speed=avg_speed,
            stopped_count=stopped_count,
            occupancy_ratio=occupancy_ratio,
            congestion_score=congestion_score,
            congestion_level=congestion_level
        )


# ============================================================================
# VISUALIZATION
# ============================================================================

def draw_detections(frame, tracks, metrics, fps=None):
    """Draw all detections and info on frame."""
    annotated = frame.copy()
    
    # Draw tracks
    for track in tracks:
        if not track.bboxes:
            continue
        
        # Bounding box
        bbox = track.bboxes[-1]
        x1, y1, x2, y2 = map(int, bbox)
        color = metrics.congestion_level.color
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        
        # Trail (last N points)
        if len(track.centroids) > 1:
            points = list(track.centroids)
            for i in range(1, min(len(points), 10)):
                pt1 = tuple(map(int, points[i-1]))
                pt2 = tuple(map(int, points[i]))
                cv2.line(annotated, pt1, pt2, color, 2)
        
        # Label
        label = f"ID:{track.track_id} {track.get_avg_speed():.1f}px/f"
        if track.class_name:
            label = f"{track.class_name} {label}"
        cv2.putText(annotated, label, (x1, y1-10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    
    # Info overlay background
    overlay = annotated.copy()
    cv2.rectangle(overlay, (10, 10), (400, 240), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, annotated, 0.4, 0, annotated)
    
    # Text info
    current_time = time.strftime("%H:%M:%S")
    info = [
        f"Time: {current_time}",
        f"Status: {metrics.congestion_level.name}",
        f"Score: {metrics.congestion_score:.2f}",
        f"Vehicles: {metrics.vehicle_count}",
        f"Speed: {metrics.average_speed:.1f} px/f",
        f"Stopped: {metrics.stopped_count}",
        f"Occupancy: {metrics.occupancy_ratio:.1%}",
    ]
    
    if fps is not None:
        info.insert(1, f"FPS: {fps:.1f}")
    
    y = 40
    for text in info:
        cv2.putText(annotated, text, (20, y),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                   metrics.congestion_level.color, 2)
        y += 25
    
    # Frame number
    cv2.putText(annotated, f"Frame: {metrics.frame_idx}",
               (annotated.shape[1] - 180, 30),
               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    return annotated


# ============================================================================
# CAMERA HANDLER
# ============================================================================

class CameraHandler:
    """Handle camera capture with threading for smooth processing."""
    
    def __init__(self, camera_id=0, width=1920, height=1080, fps=30):
        self.camera_id = camera_id
        self.width = width
        self.height = height
        self.fps = fps
        self.cap = None
        self.frame_queue = queue.Queue(maxsize=10)
        self.running = False
        self.thread = None
    
    def start(self):
        """Start camera capture in background thread."""
        self.cap = cv2.VideoCapture(self.camera_id)
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open camera {self.camera_id}")
        
        # Set camera properties
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self.cap.set(cv2.CAP_PROP_FPS, self.fps)
        
        # Verify actual properties
        actual_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        actual_fps = self.cap.get(cv2.CAP_PROP_FPS)
        
        print(f"Camera initialized: {actual_width}x{actual_height} @ {actual_fps:.1f} FPS")
        
        self.running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
    
    def _capture_loop(self):
        """Background capture loop."""
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                print("Warning: Failed to capture frame")
                continue
            
            # Put frame in queue (non-blocking)
            try:
                if not self.frame_queue.full():
                    self.frame_queue.put_nowait(frame)
            except queue.Full:
                # Skip frame if queue is full
                pass
    
    def get_frame(self):
        """Get latest frame from camera."""
        try:
            return self.frame_queue.get_nowait()
        except queue.Empty:
            return None
    
    def stop(self):
        """Stop camera capture."""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
        if self.cap:
            self.cap.release()


# ============================================================================
# MAIN DETECTION PIPELINE
# ============================================================================

class LiveTrafficDetector:
    """Live traffic detection and analysis pipeline."""
    
    def __init__(self, model_path, device='', mongo_host='localhost', mongo_port=27017, 
                 mongo_database='Traffic', mongo_collection='cctv', enable_mongodb=True):
        print(f"Loading model: {model_path}")
        self.model = YOLO(model_path)
        self.device = device
        self.track_manager = TrackManager(max_age=30)
        self.congestion_detector = None
        self.metrics_history = []
        self.camera_handler = None
        self.frame_idx = 0
        self.last_fps_time = time.time()
        self.frame_count = 0
        self.current_fps = 0.0
        
        # Initialize MongoDB handler
        self.mongodb_enabled = enable_mongodb
        if self.mongodb_enabled:
            self.mongodb_handler = MongoDBHandler(
                host=mongo_host,
                port=mongo_port,
                database_name=mongo_database,
                collection_name=mongo_collection
            )
            if not self.mongodb_handler.connected:
                print("⚠️ MongoDB disabled due to connection failure")
                self.mongodb_enabled = False
        else:
            self.mongodb_handler = None
    
    def process_camera(self, camera_id=0, width=1920, height=1080, fps=30,
                      conf=0.25, iou=0.7, save_csv=None, preview=True):
        """Process live camera feed."""
        
        print(f"\n📹 Starting camera {camera_id}")
        
        # Initialize camera
        self.camera_handler = CameraHandler(camera_id, width, height, fps)
        self.camera_handler.start()
        
        # Setup congestion detector
        self.congestion_detector = CongestionDetector(width, height)
        
        try:
            while True:
                # Get frame from camera
                frame = self.camera_handler.get_frame()
                if frame is None:
                    time.sleep(0.01)  # Small delay if no frame available
                    continue
                
                # Calculate FPS
                self.frame_count += 1
                current_time = time.time()
                if current_time - self.last_fps_time >= 1.0:
                    self.current_fps = self.frame_count / (current_time - self.last_fps_time)
                    self.frame_count = 0
                    self.last_fps_time = current_time
                
                # Detect and track
                results = self.model.track(
                    frame,
                    persist=True,
                    tracker='bytetrack.yaml',
                    conf=conf,
                    iou=iou,
                    device=self.device if self.device else None,
                    verbose=False
                )
                
                # Extract detections
                detections = []
                if results and results[0].boxes is not None:
                    boxes = results[0].boxes
                    if boxes.id is not None:
                        for box in boxes:
                            track_id = int(box.id.item())
                            bbox = box.xyxy[0].cpu().numpy().tolist()
                            class_id = int(box.cls.item())
                            class_name = self.model.names[int(class_id)]
                            
                            # Filter out train class if it exists
                            if class_name.lower() != 'train':
                                detections.append((track_id, bbox, class_id, class_name))
                
                # Update tracks
                self.track_manager.update(detections, self.frame_idx)
                
                # Analyze congestion
                tracks = self.track_manager.get_active_tracks()
                metrics = self.congestion_detector.analyze(tracks, self.frame_idx)
                self.metrics_history.append(metrics)
                
                # Update MongoDB with traffic status
                if self.mongodb_enabled and self.mongodb_handler:
                    self.mongodb_handler.update_traffic_status(
                        congestion_level=metrics.congestion_level,
                        congestion_score=metrics.congestion_score,
                        vehicle_count=metrics.vehicle_count,
                        average_speed=metrics.average_speed,
                        stopped_count=metrics.stopped_count
                    )
                
                # Keep only recent metrics (last 1000 frames)
                if len(self.metrics_history) > 1000:
                    self.metrics_history = self.metrics_history[-1000:]
                
                # Annotate frame
                annotated = draw_detections(frame, tracks, metrics, self.current_fps)
                
                # Show preview
                if preview:
                    cv2.imshow('Live Traffic Detection', annotated)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                
                self.frame_idx += 1
                
                # Print status every 30 frames
                if self.frame_idx % 30 == 0:
                    print(f"Frame {self.frame_idx}: {metrics.vehicle_count} vehicles, "
                          f"{metrics.congestion_level.name} congestion (score: {metrics.congestion_score:.2f})")
        
        except KeyboardInterrupt:
            print("\n⏹️  Stopping detection...")
        
        finally:
            self.cleanup()
            if save_csv:
                self.export_metrics(save_csv)
            self.print_summary()
    
    def cleanup(self):
        """Cleanup resources."""
        if self.camera_handler:
            self.camera_handler.stop()
        if self.mongodb_enabled and self.mongodb_handler:
            self.mongodb_handler.disconnect()
        cv2.destroyAllWindows()
    
    def export_metrics(self, csv_path):
        """Export metrics to CSV."""
        if not self.metrics_history:
            print("No metrics to export")
            return
            
        data = []
        for m in self.metrics_history:
            data.append({
                'frame_idx': m.frame_idx,
                'timestamp': m.timestamp,
                'vehicle_count': m.vehicle_count,
                'average_speed': m.average_speed,
                'stopped_count': m.stopped_count,
                'occupancy_ratio': m.occupancy_ratio,
                'congestion_score': m.congestion_score,
                'congestion_level': m.congestion_level.name
            })
        
        df = pd.DataFrame(data)
        csv_path = Path(csv_path)
        if str(csv_path.parent) != "":
            csv_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(csv_path, index=False)
        print(f"✓ Metrics exported: {csv_path}")
    
    def print_summary(self):
        """Print processing summary."""
        if not self.metrics_history:
            print("No data collected")
            return
        
        print("\n" + "="*60)
        print("LIVE DETECTION SUMMARY")
        print("="*60)
        
        total_frames = len(self.metrics_history)
        avg_vehicles = float(np.mean([m.vehicle_count for m in self.metrics_history]))
        max_vehicles = max([m.vehicle_count for m in self.metrics_history])
        avg_score = float(np.mean([m.congestion_score for m in self.metrics_history]))
        
        print(f"Total frames processed: {total_frames}")
        print(f"Average vehicles per frame: {avg_vehicles:.1f}")
        print(f"Peak vehicles detected: {max_vehicles}")
        print(f"Average congestion score: {avg_score:.3f}")
        
        # Distribution
        levels = [m.congestion_level for m in self.metrics_history]
        counts = Counter(levels)
        
        print("\nCongestion Level Distribution:")
        for level in CongestionLevel:
            count = counts.get(level, 0)
            pct = count / len(self.metrics_history) * 100 if self.metrics_history else 0
            print(f"  {level.name:15s}: {count:4d} ({pct:5.1f}%)")
        
        print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description="Live Camera Traffic Detection & Congestion Analysis with MongoDB Integration",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with default camera and MongoDB
  python detection.py
  
  # With custom model and MongoDB connection
  python detection.py --model models/best.pt --mongo-host localhost --mongo-port 27017
  
  # Full options with CSV export and custom MongoDB
  python detection.py --model models/best.pt --csv metrics.csv --camera 0 --width 1280 --height 720 --mongo-db Traffic --mongo-collection cctv
  
  # High resolution processing without MongoDB
  python detection.py --model models/best.pt --width 1920 --height 1080 --fps 30 --no-mongodb
  
  # Custom MongoDB settings
  python detection.py --mongo-host 192.168.1.100 --mongo-port 27017 --mongo-db ProductionTraffic --mongo-collection cameras
        """
    )
    
    # Camera options
    parser.add_argument('--camera', '-c', type=int, default=0,
                       help='Camera ID (default: 0)')
    parser.add_argument('--width', type=int, default=1920,
                       help='Camera width (default: 1920)')
    parser.add_argument('--height', type=int, default=1080,
                       help='Camera height (default: 1080)')
    parser.add_argument('--fps', type=int, default=30,
                       help='Camera FPS (default: 30)')
    
    # ML model options
    parser.add_argument('--model', '-m', type=str, default='yolov8n.pt',
                       help='Model path (default: yolov8n.pt)')
    parser.add_argument('--device', type=str, default='',
                       help='Device: mps, cuda, cpu, or auto (default: auto)')
    parser.add_argument('--conf', type=float, default=0.25,
                       help='Detection confidence (default: 0.25)')
    parser.add_argument('--iou', type=float, default=0.7,
                       help='IOU threshold (default: 0.7)')
    
    # MongoDB options
    parser.add_argument('--mongo-host', type=str, default='localhost',
                       help='MongoDB host (default: localhost)')
    parser.add_argument('--mongo-port', type=int, default=27017,
                       help='MongoDB port (default: 27017)')
    parser.add_argument('--mongo-db', type=str, default='Traffic',
                       help='MongoDB database name (default: Traffic)')
    parser.add_argument('--mongo-collection', type=str, default='cctv',
                       help='MongoDB collection name (default: cctv)')
    parser.add_argument('--no-mongodb', action='store_true',
                       help='Disable MongoDB integration')
    
    # Output options
    parser.add_argument('--csv', type=str, default=None,
                       help='CSV output path for metrics')
    parser.add_argument('--no-preview', action='store_true',
                       help='Disable live preview window')
    
    args = parser.parse_args()
    
    # Initialize detector
    detector = LiveTrafficDetector(
        model_path=args.model,
        device=args.device,
        mongo_host=args.mongo_host,
        mongo_port=args.mongo_port,
        mongo_database=args.mongo_db,
        mongo_collection=args.mongo_collection,
        enable_mongodb=not args.no_mongodb
    )
    
    # Process camera
    detector.process_camera(
        camera_id=args.camera,
        width=args.width,
        height=args.height,
        fps=args.fps,
        conf=args.conf,
        iou=args.iou,
        save_csv=args.csv,
        preview=not args.no_preview
    )
    
    print("\n✅ Detection complete!")


if __name__ == "__main__":
    main()