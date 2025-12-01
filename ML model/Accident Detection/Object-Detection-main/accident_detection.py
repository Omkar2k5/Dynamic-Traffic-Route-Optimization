#!/usr/bin/env python3
"""
accident_detection.py - Live Camera Accident Detection Pipeline
Handles: live camera capture, accident detection, visualization, real-time monitoring
"""

import cv2
import numpy as np
import pandas as pd
import argparse
import time
from pathlib import Path
from collections import deque, Counter
from enum import Enum
from dataclasses import dataclass
from ultralytics import YOLO
import threading
import queue
import json


# ============================================================================
# ACCIDENT DETECTION SYSTEM
# ============================================================================

class AccidentSeverity(Enum):
    """Accident severity levels."""
    LOW = 0
    MEDIUM = 1
    HIGH = 2
    CRITICAL = 3
    
    @property
    def color(self):
        colors = {
            AccidentSeverity.LOW: (0, 255, 0),      # Green
            AccidentSeverity.MEDIUM: (0, 255, 255), # Yellow
            AccidentSeverity.HIGH: (0, 165, 255),   # Orange
            AccidentSeverity.CRITICAL: (0, 0, 255), # Red
        }
        return colors[self]
    
    @property
    def alert_level(self):
        levels = {
            AccidentSeverity.LOW: "MINOR",
            AccidentSeverity.MEDIUM: "MODERATE", 
            AccidentSeverity.HIGH: "SERIOUS",
            AccidentSeverity.CRITICAL: "EMERGENCY",
        }
        return levels[self]


@dataclass
class AccidentDetection:
    """Container for accident detection results."""
    frame_idx: int
    timestamp: float
    detections: list
    accident_count: int
    severity_distribution: dict
    confidence_scores: list
    is_accident_detected: bool
    emergency_alert: bool


@dataclass
class DetectionResult:
    """Single detection result."""
    bbox: list
    confidence: float
    class_id: int
    class_name: str


class AccidentAnalyzer:
    """Analyze detections for accident patterns."""
    
    def __init__(self):
        self.detection_history = deque(maxlen=30)  # Keep last 30 frames
        self.accident_thresholds = {
            'multiple_vehicles': 2,
            'collision_proximity': 50,  # pixels
            'confidence_threshold': 0.6,
            'unusual_stopping': 3  # frames
        }
    
    def analyze_frame(self, detections, frame_idx):
        """Analyze current frame for accident indicators."""
        current_time = time.time()
        
        # Store current detections
        frame_data = {
            'frame_idx': frame_idx,
            'timestamp': current_time,
            'detections': detections,
            'vehicle_count': len(detections)
        }
        self.detection_history.append(frame_data)
        
        # Analyze accident patterns
        accident_indicators = self._check_accident_indicators(detections)
        severity = self._assess_severity(detections, accident_indicators)
        emergency_alert = self._check_emergency_condition(detections, severity)
        
        # Calculate confidence scores
        confidence_scores = [d.confidence for d in detections]
        avg_confidence = float(np.mean(confidence_scores)) if confidence_scores else 0.0
        
        # Create detection result
        return AccidentDetection(
            frame_idx=frame_idx,
            timestamp=current_time,
            detections=detections,
            accident_count=len([d for d in detections if 'accident' in d.class_name.lower()]),
            severity_distribution=self._get_severity_distribution(detections),
            confidence_scores=confidence_scores,
            is_accident_detected=severity != AccidentSeverity.LOW,
            emergency_alert=emergency_alert
        )
    
    def _check_accident_indicators(self, detections):
        """Check for accident indicators in current detections."""
        indicators = {
            'multiple_vehicles': len(detections) >= self.accident_thresholds['multiple_vehicles'],
            'high_confidence': any(d.confidence > self.accident_thresholds['confidence_threshold'] 
                                 for d in detections),
            'proximity_alert': self._check_vehicle_proximity(detections)
        }
        return indicators
    
    def _check_vehicle_proximity(self, detections):
        """Check if vehicles are too close (potential collision)."""
        if len(detections) < 2:
            return False
        
        for i in range(len(detections)):
            for j in range(i + 1, len(detections)):
                det1, det2 = detections[i], detections[j]
                
                # Calculate distance between vehicle centers
                center1 = [(det1.bbox[0] + det1.bbox[2]) / 2, 
                          (det1.bbox[1] + det1.bbox[3]) / 2]
                center2 = [(det2.bbox[0] + det2.bbox[2]) / 2, 
                          (det2.bbox[1] + det2.bbox[3]) / 2]
                
                distance = np.sqrt((center1[0] - center2[0])**2 + (center1[1] - center2[1])**2)
                
                if distance < self.accident_thresholds['collision_proximity']:
                    return True
        
        return False
    
    def _assess_severity(self, detections, indicators):
        """Assess accident severity based on indicators."""
        if not indicators['multiple_vehicles'] and not indicators['proximity_alert']:
            return AccidentSeverity.LOW
        
        high_confidence_count = sum(1 for d in detections 
                                  if d.confidence > self.accident_thresholds['confidence_threshold'])
        
        if indicators['proximity_alert'] and high_confidence_count >= 2:
            return AccidentSeverity.CRITICAL
        elif indicators['proximity_alert'] or high_confidence_count >= 2:
            return AccidentSeverity.HIGH
        elif indicators['multiple_vehicles'] or high_confidence_count >= 1:
            return AccidentSeverity.MEDIUM
        else:
            return AccidentSeverity.LOW
    
    def _check_emergency_condition(self, detections, severity):
        """Check if emergency response is needed."""
        return (severity == AccidentSeverity.CRITICAL or 
                severity == AccidentSeverity.HIGH and len(detections) >= 3)
    
    def _get_severity_distribution(self, detections):
        """Get distribution of detection severities."""
        distribution = {level.name: 0 for level in AccidentSeverity}
        
        for detection in detections:
            # Simple classification based on class name and confidence
            if 'accident' in detection.class_name.lower():
                if detection.confidence > 0.8:
                    distribution['CRITICAL'] += 1
                elif detection.confidence > 0.6:
                    distribution['HIGH'] += 1
                else:
                    distribution['MEDIUM'] += 1
            else:
                distribution['LOW'] += 1
        
        return distribution


# ============================================================================
# VISUALIZATION
# ============================================================================

def draw_accident_detections(frame, detections, analysis, fps=None):
    """Draw all accident detections and analysis on frame."""
    annotated = frame.copy()
    
    # Draw detections
    for detection in detections:
        bbox = detection.bbox
        x1, y1, x2, y2 = map(int, bbox)
        
        # Determine color based on confidence and class
        if 'accident' in detection.class_name.lower():
            if detection.confidence > 0.8:
                color = AccidentSeverity.CRITICAL.color
            elif detection.confidence > 0.6:
                color = AccidentSeverity.HIGH.color
            else:
                color = AccidentSeverity.MEDIUM.color
        else:
            color = (0, 255, 0)  # Green for normal vehicles
        
        # Draw bounding box
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
        
        # Draw label
        label = f"{detection.class_name} {detection.confidence:.2f}"
        cv2.putText(annotated, label, (x1, y1-10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    
    # Emergency alert overlay
    if analysis.emergency_alert:
        overlay = annotated.copy()
        cv2.rectangle(overlay, (0, 0), (annotated.shape[1], annotated.shape[0]), (0, 0, 255), -1)
        cv2.addWeighted(overlay, 0.3, annotated, 0.7, 0, annotated)
        
        # Emergency text
        cv2.putText(annotated, "EMERGENCY ALERT!", (annotated.shape[1]//2 - 200, 50),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (255, 255, 255), 3)
    
    # Info overlay background
    overlay = annotated.copy()
    cv2.rectangle(overlay, (10, 10), (450, 280), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, annotated, 0.4, 0, annotated)
    
    # Text info
    current_time = time.strftime("%H:%M:%S")
    status_text = "ACCIDENT DETECTED" if analysis.is_accident_detected else "NORMAL"
    severity_text = analysis.severity_distribution
    
    info = [
        f"Time: {current_time}",
        f"FPS: {fps:.1f}" if fps else None,
        f"Status: {status_text}",
        f"Severity: {analysis.severity_distribution}",
        f"Detections: {len(detections)}",
        f"Avg Confidence: {np.mean(analysis.confidence_scores):.2f}" if analysis.confidence_scores else "N/A",
        f"Emergency: {'YES' if analysis.emergency_alert else 'NO'}",
        f"Frame: {analysis.frame_idx}",
    ]
    
    y = 40
    for text in info:
        if text:
            # Color code based on status
            if "ACCIDENT" in text:
                text_color = (0, 0, 255)  # Red
            elif "EMERGENCY" in text and "YES" in text:
                text_color = (0, 0, 255)  # Red
            else:
                text_color = (255, 255, 255)  # White
            
            cv2.putText(annotated, text, (20, y),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, text_color, 2)
            y += 25
    
    return annotated


# ============================================================================
# CAMERA HANDLER (Same as traffic detection)
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
# MAIN ACCIDENT DETECTION PIPELINE
# ============================================================================

class LiveAccidentDetector:
    """Live accident detection and analysis pipeline."""
    
    def __init__(self, model_path, device=''):
        print(f"Loading accident detection model: {model_path}")
        self.model = YOLO(model_path)
        self.device = device
        self.accident_analyzer = AccidentAnalyzer()
        self.detection_history = []
        self.camera_handler = None
        self.frame_idx = 0
        self.last_fps_time = time.time()
        self.frame_count = 0
        self.current_fps = 0.0
        self.emergency_log = []
    
    def process_camera(self, camera_id=0, width=1920, height=1080, fps=30,
                      conf=0.25, iou=0.7, save_json=None, preview=True):
        """Process live camera feed for accident detection."""
        
        print(f"\n📹 Starting accident detection on camera {camera_id}")
        
        # Initialize camera
        self.camera_handler = CameraHandler(camera_id, width, height, fps)
        self.camera_handler.start()
        
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
                
                # Run inference
                results = self.model(
                    frame,
                    conf=conf,
                    iou=iou,
                    device=self.device if self.device else None,
                    verbose=False
                )
                
                # Extract detections
                detections = []
                if results and results[0].boxes is not None:
                    boxes = results[0].boxes
                    for box in boxes:
                        bbox = box.xyxy[0].cpu().numpy().tolist()
                        confidence = float(box.conf.item())
                        class_id = int(box.cls.item())
                        class_name = self.model.names[int(class_id)]
                        
                        detection = DetectionResult(
                            bbox=bbox,
                            confidence=confidence,
                            class_id=class_id,
                            class_name=class_name
                        )
                        detections.append(detection)
                
                # Analyze for accidents
                analysis = self.accident_analyzer.analyze_frame(detections, self.frame_idx)
                self.detection_history.append(analysis)
                
                # Log emergency events
                if analysis.emergency_alert:
                    self.emergency_log.append({
                        'timestamp': analysis.timestamp,
                        'frame_idx': analysis.frame_idx,
                        'severity': analysis.severity_distribution,
                        'detections': len(analysis.detections)
                    })
                
                # Keep only recent history (last 1000 frames)
                if len(self.detection_history) > 1000:
                    self.detection_history = self.detection_history[-1000:]
                
                # Annotate frame
                annotated = draw_accident_detections(frame, detections, analysis, self.current_fps)
                
                # Show preview
                if preview:
                    window_name = 'Emergency Alert - Accident Detection' if analysis.emergency_alert else 'Accident Detection'
                    cv2.imshow(window_name, annotated)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                
                self.frame_idx += 1
                
                # Print status every 30 frames
                if self.frame_idx % 30 == 0:
                    status = "ACCIDENT DETECTED" if analysis.is_accident_detected else "NORMAL"
                    print(f"Frame {self.frame_idx}: {status} - {len(detections)} detections, "
                          f"avg confidence: {np.mean(analysis.confidence_scores):.2f}" if analysis.confidence_scores 
                          else f"Frame {self.frame_idx}: {status} - {len(detections)} detections")
        
        except KeyboardInterrupt:
            print("\n⏹️  Stopping accident detection...")
        
        finally:
            self.cleanup()
            if save_json:
                self.export_results(save_json)
            self.print_summary()
    
    def cleanup(self):
        """Cleanup resources."""
        if self.camera_handler:
            self.camera_handler.stop()
        cv2.destroyAllWindows()
    
    def export_results(self, json_path):
        """Export detection results to JSON."""
        if not self.detection_history:
            print("No detection results to export")
            return
        
        data = {
            'summary': {
                'total_frames': len(self.detection_history),
                'accident_frames': sum(1 for d in self.detection_history if d.is_accident_detected),
                'emergency_alerts': len(self.emergency_log),
                'avg_detections_per_frame': float(np.mean([len(d.detections) for d in self.detection_history]))
            },
            'emergency_events': self.emergency_log,
            'frame_analysis': [
                {
                    'frame_idx': d.frame_idx,
                    'timestamp': d.timestamp,
                    'detection_count': len(d.detections),
                    'is_accident': d.is_accident_detected,
                    'emergency_alert': d.emergency_alert,
                    'severity_distribution': d.severity_distribution,
                    'avg_confidence': float(np.mean(d.confidence_scores)) if d.confidence_scores else 0.0
                }
                for d in self.detection_history[-100:]  # Last 100 frames
            ]
        }
        
        json_path = Path(json_path)
        if str(json_path.parent) != "":
            json_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        print(f"✓ Detection results exported: {json_path}")
    
    def print_summary(self):
        """Print detection summary."""
        if not self.detection_history:
            print("No data collected")
            return
        
        print("\n" + "="*60)
        print("ACCIDENT DETECTION SUMMARY")
        print("="*60)
        
        total_frames = len(self.detection_history)
        accident_frames = sum(1 for d in self.detection_history if d.is_accident_detected)
        emergency_events = len(self.emergency_log)
        avg_detections = float(np.mean([len(d.detections) for d in self.detection_history]))
        
        print(f"Total frames processed: {total_frames}")
        print(f"Accident detection frames: {accident_frames} ({accident_frames/total_frames*100:.1f}%)")
        print(f"Emergency alerts triggered: {emergency_events}")
        print(f"Average detections per frame: {avg_detections:.1f}")
        
        # Severity distribution
        severity_counts = Counter()
        for d in self.detection_history:
            for severity, count in d.severity_distribution.items():
                severity_counts[severity] += count
        
        print("\nDetection Severity Distribution:")
        for severity in AccidentSeverity:
            count = severity_counts[severity.name]
            pct = count / sum(severity_counts.values()) * 100 if severity_counts.total() > 0 else 0
            print(f"  {severity.name:10s}: {count:4d} ({pct:5.1f}%)")
        
        print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description="Live Camera Accident Detection System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage with default camera and model
  python accident_detection.py
  
  # With custom model and camera
  python accident_detection.py --model models/accident_detection.pt --camera 1
  
  # Full options with JSON export
  python accident_detection.py --model models/accident_detection.pt --json results.json --camera 0
  
  # High resolution processing
  python accident_detection.py --model models/accident_detection.pt --width 1920 --height 1080 --fps 30
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
    parser.add_argument('--model', '-m', type=str, default='best.pt',
                       help='Model path (default: best.pt)')
    parser.add_argument('--device', type=str, default='',
                       help='Device: mps, cuda, cpu, or auto (default: auto)')
    parser.add_argument('--conf', type=float, default=0.25,
                       help='Detection confidence (default: 0.25)')
    parser.add_argument('--iou', type=float, default=0.7,
                       help='IOU threshold (default: 0.7)')
    
    # Output options
    parser.add_argument('--json', type=str, default=None,
                       help='JSON output path for detection results')
    parser.add_argument('--no-preview', action='store_true',
                       help='Disable live preview window')
    
    args = parser.parse_args()
    
    # Initialize detector
    detector = LiveAccidentDetector(
        model_path=args.model,
        device=args.device
    )
    
    # Process camera
    detector.process_camera(
        camera_id=args.camera,
        width=args.width,
        height=args.height,
        fps=args.fps,
        conf=args.conf,
        iou=args.iou,
        save_json=args.json,
        preview=not args.no_preview
    )
    
    print("\n✅ Accident detection complete!")


if __name__ == "__main__":
    main()