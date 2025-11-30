"""
Congestion detection metrics and classification.
Implements multi-factor congestion analysis and classification.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from enum import Enum
from dataclasses import dataclass


class CongestionLevel(Enum):
    """Traffic congestion levels."""
    FREE_FLOW = 0
    LIGHT = 1
    MODERATE = 2
    HEAVY = 3
    TRAFFIC_JAM = 4
    
    @property
    def color(self) -> Tuple[int, int, int]:
        """Get BGR color for visualization."""
        colors = {
            CongestionLevel.FREE_FLOW: (0, 255, 0),      # Green
            CongestionLevel.LIGHT: (0, 255, 255),        # Yellow
            CongestionLevel.MODERATE: (0, 165, 255),     # Orange
            CongestionLevel.HEAVY: (0, 69, 255),         # Red-Orange
            CongestionLevel.TRAFFIC_JAM: (0, 0, 255),    # Red
        }
        return colors[self]
    
    @property
    def description(self) -> str:
        """Get human-readable description."""
        descriptions = {
            CongestionLevel.FREE_FLOW: "Free Flow - Traffic moving freely",
            CongestionLevel.LIGHT: "Light Traffic - Minor slowdowns",
            CongestionLevel.MODERATE: "Moderate Congestion - Significant slowdowns",
            CongestionLevel.HEAVY: "Heavy Congestion - Stop-and-go traffic",
            CongestionLevel.TRAFFIC_JAM: "Traffic Jam - Standstill conditions",
        }
        return descriptions[self]


@dataclass
class CongestionMetrics:
    """Container for congestion metrics."""
    
    # Raw metrics
    vehicle_count: int
    occupancy_ratio: float
    average_speed: float
    stopped_count: int
    flow_rate: float
    queue_length: float
    
    # Normalized metrics (0-1)
    density_score: float
    speed_score: float
    flow_score: float
    
    # Final scores
    congestion_score: float
    congestion_level: CongestionLevel
    
    # Metadata
    frame_idx: int
    timestamp: float
    roi_area: float


class CongestionDetector:
    """
    Multi-factor congestion detection system.
    Combines vehicle density, speed, flow rate, and queue length.
    """
    
    def __init__(self, 
                 roi_area: float = 640 * 480,
                 max_vehicles: int = 50,
                 max_speed: float = 100.0,
                 stopped_threshold: float = 2.0,
                 density_weight: float = 0.35,
                 speed_weight: float = 0.35,
                 flow_weight: float = 0.20,
                 queue_weight: float = 0.10):
        """
        Initialize congestion detector.
        
        Args:
            roi_area (float): Region of interest area in pixels
            max_vehicles (int): Maximum expected vehicles in ROI
            max_speed (float): Maximum expected speed (km/h)
            stopped_threshold (float): Speed threshold for stopped vehicles (km/h)
            density_weight (float): Weight for density score
            speed_weight (float): Weight for speed score
            flow_weight (float): Weight for flow rate score
            queue_weight (float): Weight for queue length score
        """
        self.roi_area = roi_area
        self.max_vehicles = max_vehicles
        self.max_speed = max_speed
        self.stopped_threshold = stopped_threshold
        
        # Weights (must sum to 1.0)
        self.density_weight = density_weight
        self.speed_weight = speed_weight
        self.flow_weight = flow_weight
        self.queue_weight = queue_weight
        
        # Validate weights
        total_weight = sum([density_weight, speed_weight, flow_weight, queue_weight])
        if not np.isclose(total_weight, 1.0):
            raise ValueError(f"Weights must sum to 1.0, got {total_weight}")
        
        # Flow rate tracking
        self.vehicle_entry_count = 0
        self.flow_window_frames = 0
        self.flow_window_duration = 60  # seconds
        
        # Classification thresholds (congestion score 0-1)
        self.thresholds = {
            CongestionLevel.FREE_FLOW: (0.0, 0.2),
            CongestionLevel.LIGHT: (0.2, 0.4),
            CongestionLevel.MODERATE: (0.4, 0.6),
            CongestionLevel.HEAVY: (0.6, 0.8),
            CongestionLevel.TRAFFIC_JAM: (0.8, 1.0),
        }
    
    def compute_density_score(self, vehicle_count: int, 
                            total_bbox_area: float) -> float:
        """
        Compute density score (0-1).
        
        Args:
            vehicle_count (int): Number of vehicles
            total_bbox_area (float): Sum of all bounding box areas
        
        Returns:
            float: Density score (0=empty, 1=maximum density)
        """
        # Count-based density
        count_density = min(vehicle_count / self.max_vehicles, 1.0)
        
        # Area-based density (occupancy ratio)
        area_density = min(total_bbox_area / self.roi_area, 1.0)
        
        # Combined density (average)
        density_score = (count_density + area_density) / 2.0
        
        return density_score
    
    def compute_speed_score(self, average_speed: float) -> float:
        """
        Compute speed score (0-1).
        Lower speed = higher congestion.
        
        Args:
            average_speed (float): Average vehicle speed (km/h)
        
        Returns:
            float: Speed score (0=fast, 1=stopped)
        """
        if average_speed <= 0:
            return 1.0
        
        # Normalize speed (inverted - lower speed = higher score)
        normalized_speed = min(average_speed / self.max_speed, 1.0)
        speed_score = 1.0 - normalized_speed
        
        return speed_score
    
    def compute_flow_score(self, flow_rate: float, 
                          expected_flow: float = 30.0) -> float:
        """
        Compute flow rate score (0-1).
        Lower flow = higher congestion.
        
        Args:
            flow_rate (float): Vehicles per minute
            expected_flow (float): Expected free-flow rate
        
        Returns:
            float: Flow score (0=high flow, 1=low flow)
        """
        if flow_rate <= 0:
            return 1.0
        
        # Normalize flow (inverted)
        normalized_flow = min(flow_rate / expected_flow, 1.0)
        flow_score = 1.0 - normalized_flow
        
        return flow_score
    
    def compute_queue_score(self, stopped_count: int,
                           vehicle_count: int) -> float:
        """
        Compute queue length score (0-1).
        More stopped vehicles = higher congestion.
        
        Args:
            stopped_count (int): Number of stopped vehicles
            vehicle_count (int): Total vehicles
        
        Returns:
            float: Queue score (0=no queue, 1=all stopped)
        """
        if vehicle_count == 0:
            return 0.0
        
        # Ratio of stopped vehicles
        queue_score = stopped_count / vehicle_count
        
        return queue_score
    
    def compute_congestion_score(self, density_score: float,
                                speed_score: float,
                                flow_score: float,
                                queue_score: float) -> float:
        """
        Compute weighted congestion score (0-1).
        
        Args:
            density_score (float): Density component
            speed_score (float): Speed component
            flow_score (float): Flow rate component
            queue_score (float): Queue length component
        
        Returns:
            float: Overall congestion score
        """
        congestion_score = (
            self.density_weight * density_score +
            self.speed_weight * speed_score +
            self.flow_weight * flow_score +
            self.queue_weight * queue_score
        )
        
        return congestion_score
    
    def classify_congestion(self, congestion_score: float) -> CongestionLevel:
        """
        Classify congestion level from score.
        
        Args:
            congestion_score (float): Congestion score (0-1)
        
        Returns:
            CongestionLevel: Classification
        """
        for level, (min_score, max_score) in self.thresholds.items():
            if min_score <= congestion_score < max_score:
                return level
        
        # Default to highest level if score >= 1.0
        return CongestionLevel.TRAFFIC_JAM
    
    def analyze(self, 
                tracks: List,
                frame_idx: int,
                fps: float = 30.0,
                timestamp: Optional[float] = None) -> CongestionMetrics:
        """
        Analyze current traffic state and compute congestion metrics.
        
        Args:
            tracks (list): List of VehicleTrack objects
            frame_idx (int): Current frame index
            fps (float): Video FPS
            timestamp (float): Current timestamp
        
        Returns:
            CongestionMetrics: Complete metrics
        """
        # Basic counts
        vehicle_count = len(tracks)
        
        if vehicle_count == 0:
            # No vehicles - free flow
            return CongestionMetrics(
                vehicle_count=0,
                occupancy_ratio=0.0,
                average_speed=0.0,
                stopped_count=0,
                flow_rate=0.0,
                queue_length=0.0,
                density_score=0.0,
                speed_score=0.0,
                flow_score=0.0,
                congestion_score=0.0,
                congestion_level=CongestionLevel.FREE_FLOW,
                frame_idx=frame_idx,
                timestamp=timestamp or (frame_idx / fps),
                roi_area=self.roi_area,
            )
        
        # Compute raw metrics
        speeds = []
        stopped_count = 0
        total_bbox_area = 0.0
        
        for track in tracks:
            # Speed
            speed = track.get_average_speed_pixels(window=5)
            speeds.append(speed)
            
            # Stopped check
            if track.is_stopped(threshold=self.stopped_threshold):
                stopped_count += 1
            
            # Bounding box area
            bbox = track.get_current_bbox()
            if bbox:
                x1, y1, x2, y2 = bbox
                area = (x2 - x1) * (y2 - y1)
                total_bbox_area += area
        
        average_speed = np.mean(speeds) if speeds else 0.0
        occupancy_ratio = total_bbox_area / self.roi_area
        
        # Flow rate (vehicles per minute)
        # Simple approximation: count new tracks
        self.flow_window_frames += 1
        if self.flow_window_frames >= fps * self.flow_window_duration:
            self.flow_window_frames = 0
            self.vehicle_entry_count = 0
        
        # Estimate flow rate
        if self.flow_window_frames > 0:
            elapsed_minutes = self.flow_window_frames / (fps * 60)
            flow_rate = vehicle_count / max(elapsed_minutes, 1/60)  # vehicles/min
        else:
            flow_rate = 0.0
        
        # Queue length (ratio of stopped vehicles)
        queue_length = stopped_count / vehicle_count if vehicle_count > 0 else 0.0
        
        # Compute normalized scores
        density_score = self.compute_density_score(vehicle_count, total_bbox_area)
        speed_score = self.compute_speed_score(average_speed)
        flow_score = self.compute_flow_score(flow_rate)
        queue_score = self.compute_queue_score(stopped_count, vehicle_count)
        
        # Compute overall congestion score
        congestion_score = self.compute_congestion_score(
            density_score, speed_score, flow_score, queue_score
        )
        
        # Classify congestion level
        congestion_level = self.classify_congestion(congestion_score)
        
        return CongestionMetrics(
            vehicle_count=vehicle_count,
            occupancy_ratio=occupancy_ratio,
            average_speed=average_speed,
            stopped_count=stopped_count,
            flow_rate=flow_rate,
            queue_length=queue_length,
            density_score=density_score,
            speed_score=speed_score,
            flow_score=flow_score,
            congestion_score=congestion_score,
            congestion_level=congestion_level,
            frame_idx=frame_idx,
            timestamp=timestamp or (frame_idx / fps),
            roi_area=self.roi_area,
        )
    
    def customize_thresholds(self, thresholds: Dict[CongestionLevel, Tuple[float, float]]):
        """
        Customize congestion classification thresholds.
        
        Args:
            thresholds (dict): {CongestionLevel: (min_score, max_score)}
        
        Example:
            detector.customize_thresholds({
                CongestionLevel.FREE_FLOW: (0.0, 0.15),
                CongestionLevel.LIGHT: (0.15, 0.35),
                CongestionLevel.MODERATE: (0.35, 0.55),
                CongestionLevel.HEAVY: (0.55, 0.75),
                CongestionLevel.TRAFFIC_JAM: (0.75, 1.0),
            })
        """
        self.thresholds = thresholds
    
    def set_roi_area(self, width: int, height: int):
        """
        Set ROI area from frame dimensions.
        
        Args:
            width (int): Frame width
            height (int): Frame height
        """
        self.roi_area = width * height


def draw_congestion_overlay(frame: np.ndarray, 
                           metrics: CongestionMetrics,
                           position: Tuple[int, int] = (20, 40),
                           font_scale: float = 0.7,
                           thickness: int = 2,
                           show_detailed: bool = True) -> np.ndarray:
    """
    Draw congestion information on frame.
    
    Args:
        frame (np.ndarray): Input frame
        metrics (CongestionMetrics): Congestion metrics
        position (tuple): Starting position (x, y)
        font_scale (float): Font size
        thickness (int): Text thickness
        show_detailed (bool): Show detailed metrics
    
    Returns:
        np.ndarray: Annotated frame
    """
    import cv2
    
    annotated = frame.copy()
    x, y = position
    line_height = int(30 * font_scale)
    
    # Background rectangle
    bg_height = line_height * (8 if show_detailed else 3)
    cv2.rectangle(annotated, (x - 10, y - 25), (x + 400, y + bg_height),
                 (0, 0, 0), -1)
    cv2.rectangle(annotated, (x - 10, y - 25), (x + 400, y + bg_height),
                 metrics.congestion_level.color, 2)
    
    # Main status
    level_text = f"Status: {metrics.congestion_level.name.replace('_', ' ')}"
    cv2.putText(annotated, level_text, (x, y),
               cv2.FONT_HERSHEY_SIMPLEX, font_scale, 
               metrics.congestion_level.color, thickness)
    y += line_height
    
    score_text = f"Score: {metrics.congestion_score:.2f}"
    cv2.putText(annotated, score_text, (x, y),
               cv2.FONT_HERSHEY_SIMPLEX, font_scale,
               (255, 255, 255), thickness)
    y += line_height
    
    if show_detailed:
        # Detailed metrics
        details = [
            f"Vehicles: {metrics.vehicle_count}",
            f"Speed: {metrics.average_speed:.1f} px/f",
            f"Stopped: {metrics.stopped_count}",
            f"Occupancy: {metrics.occupancy_ratio:.2%}",
            f"Flow: {metrics.flow_rate:.1f} veh/min",
            f"Queue: {metrics.queue_length:.2%}",
        ]
        
        for detail in details:
            cv2.putText(annotated, detail, (x, y),
                       cv2.FONT_HERSHEY_SIMPLEX, font_scale * 0.6,
                       (200, 200, 200), thickness - 1)
            y += line_height
    
    return annotated


def export_metrics_csv(metrics_list: List[CongestionMetrics], 
                      output_path: str):
    """
    Export metrics to CSV file.
    
    Args:
        metrics_list (list): List of CongestionMetrics
        output_path (str): Output CSV path
    """
    import csv
    
    with open(output_path, 'w', newline='') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow([
            'frame_idx', 'timestamp', 'vehicle_count', 'occupancy_ratio',
            'average_speed', 'stopped_count', 'flow_rate', 'queue_length',
            'density_score', 'speed_score', 'flow_score',
            'congestion_score', 'congestion_level'
        ])
        
        # Data
        for m in metrics_list:
            writer.writerow([
                m.frame_idx, f"{m.timestamp:.2f}", m.vehicle_count,
                f"{m.occupancy_ratio:.4f}", f"{m.average_speed:.2f}",
                m.stopped_count, f"{m.flow_rate:.2f}", f"{m.queue_length:.4f}",
                f"{m.density_score:.4f}", f"{m.speed_score:.4f}",
                f"{m.flow_score:.4f}", f"{m.congestion_score:.4f}",
                m.congestion_level.name
            ])
    
    print(f"Metrics exported to: {output_path}")