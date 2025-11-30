#!/usr/bin/env python3
"""
Complete Traffic Congestion Detection Pipeline
Integrates detection, tracking, speed estimation, and congestion analysis.

Usage:
    python congestion_detection.py --input video.mp4 --model best.pt --output output.mp4
"""

import cv2
import numpy as np
import argparse
import os
from pathlib import Path
from tqdm import tqdm
from ultralytics import YOLO
import sys

# Add utils to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.tracking import TrackManager, VehicleTrack, draw_tracks
from utils.speed_estimation import (
    PixelSpeedEstimator, HomographySpeedEstimator, SpeedSmoother
)
from utils.metrics import (
    CongestionDetector, CongestionMetrics, CongestionLevel,
    draw_congestion_overlay, export_metrics_csv
)


class TrafficCongestionDetector:
    """Complete traffic congestion detection system."""
    
    def __init__(self,
                 model_path: str,
                 device: str = '',
                 conf_threshold: float = 0.25,
                 iou_threshold: float = 0.7,
                 track_max_age: int = 30,
                 speed_estimator_type: str = 'pixel',
                 pixels_per_meter: float = 20.0,
                 homography_points: tuple = None,
                 roi_area: float = None):
        """
        Initialize traffic congestion detector.
        
        Args:
            model_path (str): Path to YOLOv8 model weights
            device (str): Device to use ('', '0', 'cpu')
            conf_threshold (float): Detection confidence threshold
            iou_threshold (float): IOU threshold for tracking
            track_max_age (int): Max frames before removing lost tracks
            speed_estimator_type (str): 'pixel' or 'homography'
            pixels_per_meter (float): Calibration for pixel estimator
            homography_points (tuple): (image_pts, world_pts) for homography
            roi_area (float): ROI area in pixels
        """
        print("=" * 60)
        print("Initializing Traffic Congestion Detection System")
        print("=" * 60)
        
        # Load YOLO model
        print(f"Loading model: {model_path}")
        self.model = YOLO(model_path)
        self.device = device
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        
        print(f"Device: {device if device else 'auto'}")
        print(f"Confidence threshold: {conf_threshold}")
        print(f"IOU threshold: {iou_threshold}")
        
        # Initialize tracking
        self.track_manager = TrackManager(max_age=track_max_age)
        print(f"Track max age: {track_max_age} frames")
        
        # Speed estimation
        self.speed_estimator_type = speed_estimator_type
        self.speed_estimator = None
        self.pixels_per_meter = pixels_per_meter
        self.homography_points = homography_points
        
        # Speed smoothers for each track
        self.speed_smoothers = {}
        
        # Congestion detection
        self.congestion_detector = None
        self.roi_area = roi_area
        
        # Metrics storage
        self.metrics_history = []
        
        # Video properties (set during processing)
        self.fps = 30.0
        self.frame_width = 640
        self.frame_height = 480
        
        print("Initialization complete\n")
    
    def setup_from_video(self, video_path: str):
        """
        Setup parameters from video properties.
        
        Args:
            video_path (str): Path to video file
        """
        cap = cv2.VideoCapture(video_path)
        
        self.fps = cap.get(cv2.CAP_PROP_FPS)
        self.frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        cap.release()
        
        print(f"Video properties:")
        print(f"  Resolution: {self.frame_width}x{self.frame_height}")
        print(f"  FPS: {self.fps:.2f}")
        
        # Setup speed estimator
        if self.speed_estimator_type == 'pixel':
            self.speed_estimator = PixelSpeedEstimator(
                fps=self.fps,
                pixels_per_meter=self.pixels_per_meter
            )
            print(f"  Speed estimator: Pixel-based ({self.pixels_per_meter} px/m)")
        
        elif self.speed_estimator_type == 'homography':
            if self.homography_points:
                image_pts, world_pts = self.homography_points
                self.speed_estimator = HomographySpeedEstimator(
                    fps=self.fps,
                    image_points=image_pts,
                    world_points=world_pts
                )
                print(f"  Speed estimator: Homography-based")
            else:
                print("  Warning: Homography requested but no points provided")
                print("  Falling back to pixel-based estimation")
                self.speed_estimator = PixelSpeedEstimator(
                    fps=self.fps,
                    pixels_per_meter=self.pixels_per_meter
                )
        
        # Setup congestion detector
        roi_area = self.roi_area or (self.frame_width * self.frame_height)
        self.congestion_detector = CongestionDetector(roi_area=roi_area)
        self.congestion_detector.set_roi_area(self.frame_width, self.frame_height)
        
        print(f"  ROI area: {roi_area:.0f} pixels\n")
    
    def detect_and_track(self, frame: np.ndarray, frame_idx: int):
        """
        Detect vehicles and update tracks.
        
        Args:
            frame (np.ndarray): Input frame
            frame_idx (int): Current frame index
        
        Returns:
            list: Detection results from YOLO
        """
        # Run YOLO detection with tracking
        results = self.model.track(
            frame,
            persist=True,
            tracker='bytetrack.yaml',
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            device=self.device,
            verbose=False,
        )
        
        # Extract detections
        detections = []
        
        if results and results[0].boxes is not None:
            boxes = results[0].boxes
            
            # Check if tracking IDs are available
            if boxes.id is not None:
                for i, box in enumerate(boxes):
                    # Get track ID
                    track_id = int(box.id.item())
                    
                    # Get bounding box
                    bbox = box.xyxy[0].cpu().numpy().tolist()
                    
                    # Get class
                    class_id = int(box.cls.item())
                    class_name = self.model.names[class_id]
                    
                    detections.append((track_id, bbox, class_id, class_name))
        
        # Update track manager
        self.track_manager.update(detections, frame_idx)
        
        return results
    
    def compute_speeds(self):
        """Compute speeds for all active tracks."""
        for track in self.track_manager.get_active_tracks():
            # Get speed smoother for this track
            if track.track_id not in self.speed_smoothers:
                self.speed_smoothers[track.track_id] = SpeedSmoother(
                    window_size=5,
                    outlier_threshold=3.0
                )
            
            smoother = self.speed_smoothers[track.track_id]
            
            # Get pixel speed
            speed_px = track.get_average_speed_pixels(window=5)
            
            # Convert to real-world speed if estimator available
            if self.speed_estimator_type == 'pixel':
                speed_real = self.speed_estimator.pixels_to_speed(speed_px)
            elif self.speed_estimator_type == 'homography':
                # For homography, we need consecutive centroids
                if len(track.centroids) >= 2:
                    c1 = track.centroids[-2]
                    c2 = track.centroids[-1]
                    speed_real = self.speed_estimator.pixels_to_speed(c1, c2)
                else:
                    speed_real = 0.0
            else:
                speed_real = speed_px
            
            # Smooth speed
            speed_smoothed = smoother.add_speed(speed_real)
            
            # Store in track
            track.speeds_real.append(speed_smoothed)
    
    def analyze_congestion(self, frame_idx: int) -> CongestionMetrics:
        """
        Analyze current congestion level.
        
        Args:
            frame_idx (int): Current frame index
        
        Returns:
            CongestionMetrics: Congestion analysis
        """
        tracks = self.track_manager.get_active_tracks()
        metrics = self.congestion_detector.analyze(
            tracks=tracks,
            frame_idx=frame_idx,
            fps=self.fps
        )
        
        self.metrics_history.append(metrics)
        
        return metrics
    
    def annotate_frame(self, frame: np.ndarray, metrics: CongestionMetrics,
                      show_trails: bool = True,
                      show_speed: bool = True,
                      show_metrics: bool = True) -> np.ndarray:
        """
        Annotate frame with detections and metrics.
        
        Args:
            frame (np.ndarray): Input frame
            metrics (CongestionMetrics): Current metrics
            show_trails (bool): Draw tracking trails
            show_speed (bool): Show speed labels
            show_metrics (bool): Show congestion metrics
        
        Returns:
            np.ndarray: Annotated frame
        """
        annotated = frame.copy()
        
        # Draw tracks
        tracks = self.track_manager.get_active_tracks()
        annotated = draw_tracks(
            annotated,
            tracks,
            show_trail=show_trails,
            trail_length=20,
            show_id=True,
            show_speed=show_speed,
            color=metrics.congestion_level.color,
            thickness=2
        )
        
        # Draw congestion overlay
        if show_metrics:
            annotated = draw_congestion_overlay(
                annotated,
                metrics,
                position=(20, 40),
                show_detailed=True
            )
        
        # Add frame number
        cv2.putText(
            annotated,
            f"Frame: {metrics.frame_idx}",
            (annotated.shape[1] - 200, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            2
        )
        
        return annotated
    
    def process_video(self,
                     input_path: str,
                     output_path: str,
                     csv_path: str = None,
                     show_preview: bool = False,
                     skip_frames: int = 1,
                     max_frames: int = None):
        """
        Process entire video and generate output.
        
        Args:
            input_path (str): Input video path
            output_path (str): Output video path
            csv_path (str): CSV output path
            show_preview (bool): Show live preview
            skip_frames (int): Process every Nth frame
            max_frames (int): Maximum frames to process
        """
        print("=" * 60)
        print("Starting Video Processing")
        print("=" * 60)
        
        # Setup from video
        self.setup_from_video(input_path)
        
        # Open video
        cap = cv2.VideoCapture(input_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        if max_frames:
            total_frames = min(total_frames, max_frames)
        
        print(f"Total frames to process: {total_frames}")
        print(f"Skip frames: {skip_frames}")
        print(f"Output: {output_path}")
        if csv_path:
            print(f"CSV metrics: {csv_path}")
        print()
        
        # Setup video writer
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(
            output_path,
            fourcc,
            self.fps / skip_frames,
            (self.frame_width, self.frame_height)
        )
        
        # Process frames
        frame_idx = 0
        processed_count = 0
        
        pbar = tqdm(total=total_frames // skip_frames, desc="Processing")
        
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
                self.detect_and_track(frame, frame_idx)
                
                # Compute speeds
                self.compute_speeds()
                
                # Analyze congestion
                metrics = self.analyze_congestion(frame_idx)
                
                # Annotate frame
                annotated = self.annotate_frame(frame, metrics)
                
                # Write output
                out.write(annotated)
                
                # Show preview
                if show_preview:
                    cv2.imshow('Traffic Congestion Detection', annotated)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        print("\nProcessing interrupted by user")
                        break
                
                processed_count += 1
                pbar.update(1)
                
                # Check max frames
                if max_frames and processed_count >= max_frames // skip_frames:
                    break
                
                frame_idx += 1
        
        finally:
            pbar.close()
            cap.release()
            out.release()
            cv2.destroyAllWindows()
        
        print(f"\nProcessed {processed_count} frames")
        print(f"Output saved to: {output_path}")
        
        # Export metrics to CSV
        if csv_path:
            export_metrics_csv(self.metrics_history, csv_path)
        
        # Print summary statistics
        self.print_summary()
    
    def print_summary(self):
        """Print processing summary."""
        if not self.metrics_history:
            return
        
        print("\n" + "=" * 60)
        print("Processing Summary")
        print("=" * 60)
        
        # Compute statistics
        avg_vehicles = np.mean([m.vehicle_count for m in self.metrics_history])
        max_vehicles = max([m.vehicle_count for m in self.metrics_history])
        
        avg_speed = np.mean([m.average_speed for m in self.metrics_history])
        
        avg_congestion = np.mean([m.congestion_score for m in self.metrics_history])
        
        # Count congestion levels
        level_counts = {}
        for level in CongestionLevel:
            count = sum(1 for m in self.metrics_history 
                       if m.congestion_level == level)
            level_counts[level] = count
        
        print(f"Total frames analyzed: {len(self.metrics_history)}")
        print(f"Average vehicles: {avg_vehicles:.1f}")
        print(f"Peak vehicles: {max_vehicles}")
        print(f"Average speed: {avg_speed:.2f} px/frame")
        print(f"Average congestion score: {avg_congestion:.3f}")
        print()
        
        print("Congestion Level Distribution:")
        for level, count in level_counts.items():
            percentage = (count / len(self.metrics_history)) * 100
            print(f"  {level.name:15s}: {count:4d} frames ({percentage:5.1f}%)")
        
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Traffic Congestion Detection System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic usage
  python congestion_detection.py --input video.mp4 --model best.pt --output output.mp4
  
  # With CSV metrics export
  python congestion_detection.py --input video.mp4 --model best.pt --output output.mp4 --csv metrics.csv
  
  # Show live preview
  python congestion_detection.py --input video.mp4 --model best.pt --output output.mp4 --preview
  
  # Process every 2nd frame for speed
  python congestion_detection.py --input video.mp4 --model best.pt --output output.mp4 --skip-frames 2
  
  # Process first 1000 frames only
  python congestion_detection.py --input video.mp4 --model best.pt --output output.mp4 --max-frames 1000
        """
    )
    
    # Required arguments
    parser.add_argument('--input', '-i', type=str, required=True,
                        help='Input video path')
    parser.add_argument('--model', '-m', type=str, required=True,
                        help='YOLOv8 model path (.pt file)')
    parser.add_argument('--output', '-o', type=str, required=True,
                        help='Output video path')
    
    # Optional arguments
    parser.add_argument('--csv', type=str, default=None,
                        help='CSV output path for metrics')
    parser.add_argument('--device', type=str, default='',
                        help='Device to use (empty=auto, 0=GPU0, cpu=CPU)')
    parser.add_argument('--conf', type=float, default=0.25,
                        help='Detection confidence threshold')
    parser.add_argument('--iou', type=float, default=0.7,
                        help='IOU threshold for tracking')
    parser.add_argument('--track-max-age', type=int, default=30,
                        help='Max frames before removing lost tracks')
    
    # Speed estimation
    parser.add_argument('--speed-estimator', type=str, default='pixel',
                        choices=['pixel', 'homography'],
                        help='Speed estimation method')
    parser.add_argument('--pixels-per-meter', type=float, default=20.0,
                        help='Pixels per meter for pixel estimator')
    
    # Processing options
    parser.add_argument('--skip-frames', type=int, default=1,
                        help='Process every Nth frame')
    parser.add_argument('--max-frames', type=int, default=None,
                        help='Maximum frames to process')
    parser.add_argument('--preview', action='store_true',
                        help='Show live preview window')
    parser.add_argument('--no-trails', action='store_true',
                        help='Disable trajectory trails')
    parser.add_argument('--no-speed', action='store_true',
                        help='Disable speed labels')
    parser.add_argument('--no-metrics', action='store_true',
                        help='Disable metrics overlay')
    
    args = parser.parse_args()
    
    # Validate paths
    if not os.path.exists(args.input):
        print(f"Error: Input video not found: {args.input}")
        return
    
    if not os.path.exists(args.model):
        print(f"Error: Model file not found: {args.model}")
        return
    
    # Create output directory if needed
    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    # Initialize detector
    detector = TrafficCongestionDetector(
        model_path=args.model,
        device=args.device,
        conf_threshold=args.conf,
        iou_threshold=args.iou,
        track_max_age=args.track_max_age,
        speed_estimator_type=args.speed_estimator,
        pixels_per_meter=args.pixels_per_meter,
    )
    
    # Process video
    detector.process_video(
        input_path=args.input,
        output_path=args.output,
        csv_path=args.csv,
        show_preview=args.preview,
        skip_frames=args.skip_frames,
        max_frames=args.max_frames,
    )
    
    print("\nProcessing complete!")


if __name__ == "__main__":
    main()