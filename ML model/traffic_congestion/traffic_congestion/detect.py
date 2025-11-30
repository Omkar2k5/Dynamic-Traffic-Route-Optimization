#!/usr/bin/env python3
"""
detect.py - Complete Detection & Congestion Analysis Pipeline
Handles: detection, tracking, speed estimation, congestion analysis, visualization
"""

import cv2
import numpy as np
import pandas as pd
import argparse
from pathlib import Path
from tqdm import tqdm
from collections import deque, Counter
from enum import Enum
from dataclasses import dataclass
from ultralytics import YOLO


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

def draw_detections(frame, tracks, metrics):
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
        cv2.putText(annotated, label, (x1, y1-10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    
    # Info overlay background
    overlay = annotated.copy()
    cv2.rectangle(overlay, (10, 10), (400, 200), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, annotated, 0.4, 0, annotated)
    
    # Text info
    info = [
        f"Status: {metrics.congestion_level.name}",
        f"Score: {metrics.congestion_score:.2f}",
        f"Vehicles: {metrics.vehicle_count}",
        f"Speed: {metrics.average_speed:.1f} px/f",
        f"Stopped: {metrics.stopped_count}",
        f"Occupancy: {metrics.occupancy_ratio:.1%}",
    ]
    
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
# MAIN DETECTION PIPELINE
# ============================================================================

class TrafficDetector:
    """Complete traffic detection and analysis pipeline."""
    
    def __init__(self, model_path, device=''):
        print(f"Loading model: {model_path}")
        self.model = YOLO(model_path)
        self.device = device
        self.track_manager = TrackManager(max_age=30)
        self.congestion_detector = None
        self.metrics_history = []
    
    def process_video(self, input_path, output_path, csv_path=None,
                     conf=0.25, iou=0.7, skip_frames=1, max_frames=None,
                     preview=False):
        """Process video and generate outputs."""
        
        input_path = str(input_path)
        print(f"\n📹 Processing: {input_path}")
        
        # Open video
        cap = cv2.VideoCapture(input_path)
        if not cap.isOpened():
            print(f"❌ Error: Could not open input video: {input_path}")
            return
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if max_frames:
            total_frames = min(total_frames, max_frames)
        
        print(f"   Resolution: {width}x{height}")
        print(f"   FPS: {fps:.2f}")
        print(f"   Frames to process: {total_frames}")
        
        # Setup congestion detector
        self.congestion_detector = CongestionDetector(width, height)
        
        # Resolve/normalize output path
        output_path = Path(output_path)
        if output_path.is_dir() or output_path.suffix == "":
            # Treat as directory: create and auto-name file
            output_dir = output_path
            output_dir.mkdir(parents=True, exist_ok=True)
            output_path = output_dir / f"{Path(input_path).stem}_out.mp4"
        else:
            output_dir = output_path.parent
            if str(output_dir) != "":
                output_dir.mkdir(parents=True, exist_ok=True)
        
        # Setup video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(output_path), fourcc, fps/max(skip_frames, 1), (width, height))
        
        if not out.isOpened():
            print(f"❌ Error: Could not open VideoWriter for output: {output_path}")
            cap.release()
            return
        
        frame_idx = 0
        processed = 0
        
        pbar = tqdm(total=max(1, total_frames // max(skip_frames, 1)), desc="Processing")
        
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Skip frames
                if frame_idx % skip_frames != 0:
                    frame_idx += 1
                    continue
                
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
                            detections.append((track_id, bbox, class_id, class_name))
                
                # Update tracks
                self.track_manager.update(detections, frame_idx)
                
                # Analyze congestion
                tracks = self.track_manager.get_active_tracks()
                metrics = self.congestion_detector.analyze(tracks, frame_idx)
                self.metrics_history.append(metrics)
                
                # Annotate frame
                annotated = draw_detections(frame, tracks, metrics)
                
                # Write output
                out.write(annotated)
                
                # Show preview
                if preview:
                    cv2.imshow('Traffic Detection', annotated)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                
                processed += 1
                pbar.update(1)
                
                if max_frames and processed >= max_frames // max(skip_frames, 1):
                    break
                
                frame_idx += 1
        
        finally:
            pbar.close()
            cap.release()
            out.release()
            cv2.destroyAllWindows()
        
        print(f"\n✓ Processed {processed} frames")
        print(f"✓ Output: {output_path}")
        
        # Export metrics
        if csv_path:
            self.export_metrics(csv_path)
        
        # Print summary
        self.print_summary()
    
    def export_metrics(self, csv_path):
        """Export metrics to CSV."""
        data = []
        for m in self.metrics_history:
            data.append({
                'frame_idx': m.frame_idx,
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
        print(f"✓ Metrics: {csv_path}")
    
    def print_summary(self):
        """Print processing summary."""
        if not self.metrics_history:
            return
        
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        
        avg_vehicles = float(np.mean([m.vehicle_count for m in self.metrics_history]))
        max_vehicles = max([m.vehicle_count for m in self.metrics_history])
        avg_score = float(np.mean([m.congestion_score for m in self.metrics_history]))
        
        print(f"Average vehicles: {avg_vehicles:.1f}")
        print(f"Peak vehicles: {max_vehicles}")
        print(f"Average congestion: {avg_score:.3f}")
        
        # Distribution
        levels = [m.congestion_level for m in self.metrics_history]
        counts = Counter(levels)
        
        print("\nCongestion Distribution:")
        for level in CongestionLevel:
            count = counts.get(level, 0)
            pct = count / len(self.metrics_history) * 100
            print(f"  {level.name:15s}: {count:4d} ({pct:5.1f}%)")
        
        print("="*60)


def main():
    parser = argparse.ArgumentParser(
        description="Traffic Detection & Congestion Analysis",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage (pretrained model, auto output name)
  python detect.py --input video.mp4 --output outputs
  
  # With custom model
  python detect.py --input video.mp4 --output outputs/out.mp4 --model models/best.pt
  
  # Full options
  python detect.py --input video.mp4 --output outputs/result.mp4 --csv metrics.csv --preview --max-frames 300
  
  # Fast processing (skip frames)
  python detect.py --input video.mp4 --output outputs --skip-frames 3
        """
    )
    
    # Required
    parser.add_argument('--input', '-i', type=str, required=True,
                       help='Input video path')
    parser.add_argument('--output', '-o', type=str, required=True,
                       help='Output video path or directory')
    
    # Optional
    parser.add_argument('--model', '-m', type=str, default='yolov8n.pt',
                       help='Model path (default: yolov8n.pt)')
    parser.add_argument('--csv', type=str, default=None,
                       help='CSV output path for metrics')
    parser.add_argument('--device', type=str, default='',
                       help='Device: mps, cuda, cpu, or auto (default: auto)')
    parser.add_argument('--conf', type=float, default=0.25,
                       help='Detection confidence (default: 0.25)')
    parser.add_argument('--iou', type=float, default=0.7,
                       help='IOU threshold (default: 0.7)')
    parser.add_argument('--skip-frames', type=int, default=1,
                       help='Process every Nth frame (default: 1)')
    parser.add_argument('--max-frames', type=int, default=None,
                       help='Maximum frames to process')
    parser.add_argument('--preview', action='store_true',
                       help='Show live preview (press q to stop)')
    
    args = parser.parse_args()
    
    # Validate input
    if not Path(args.input).exists():
        print(f"❌ Error: Input video not found: {args.input}")
        return
    
    # Initialize detector
    detector = TrafficDetector(
        model_path=args.model,
        device=args.device
    )
    
    # Process video
    detector.process_video(
        input_path=args.input,
        output_path=args.output,
        csv_path=args.csv,
        conf=args.conf,
        iou=args.iou,
        skip_frames=args.skip_frames,
        max_frames=args.max_frames,
        preview=args.preview
    )
    
    print("\n✅ Complete!")


if __name__ == "__main__":
    main()
