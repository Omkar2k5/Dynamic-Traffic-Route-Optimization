"""
Vehicle tracking utilities for maintaining track history and computing metrics.
Implements track management, centroid calculation, and spatial metrics.
"""

import numpy as np
from collections import defaultdict, deque
from typing import Dict, List, Tuple, Optional


class VehicleTrack:
    """Store information about a single vehicle track."""
    
    def __init__(self, track_id: int, max_history: int = 30):
        """
        Initialize a vehicle track.
        
        Args:
            track_id (int): Unique track identifier
            max_history (int): Maximum number of historical positions to store
        """
        self.track_id = track_id
        self.max_history = max_history
        
        # Position history (centroids)
        self.centroids = deque(maxlen=max_history)
        
        # Bounding box history
        self.bboxes = deque(maxlen=max_history)
        
        # Frame indices
        self.frame_indices = deque(maxlen=max_history)
        
        # Speed history (pixels/frame)
        self.speeds_px = deque(maxlen=max_history)
        
        # Speed history (real-world units if available)
        self.speeds_real = deque(maxlen=max_history)
        
        # Class information
        self.class_id = None
        self.class_name = None
        
        # Metadata
        self.first_frame = None
        self.last_frame = None
        self.total_frames = 0
        self.is_active = True
        
    def update(self, bbox: List[float], frame_idx: int, 
               class_id: int = None, class_name: str = None):
        """
        Update track with new detection.
        
        Args:
            bbox (list): Bounding box [x1, y1, x2, y2]
            frame_idx (int): Current frame index
            class_id (int): Object class ID
            class_name (str): Object class name
        """
        # Compute centroid
        centroid = self.compute_centroid(bbox)
        
        # Update histories
        self.centroids.append(centroid)
        self.bboxes.append(bbox)
        self.frame_indices.append(frame_idx)
        
        # Update class info
        if class_id is not None:
            self.class_id = class_id
        if class_name is not None:
            self.class_name = class_name
        
        # Update frame tracking
        if self.first_frame is None:
            self.first_frame = frame_idx
        self.last_frame = frame_idx
        self.total_frames += 1
        
        # Compute speed if we have previous position
        if len(self.centroids) >= 2:
            speed_px = self.compute_speed_pixels()
            self.speeds_px.append(speed_px)
    
    @staticmethod
    def compute_centroid(bbox: List[float]) -> Tuple[float, float]:
        """
        Compute centroid from bounding box.
        
        Args:
            bbox (list): [x1, y1, x2, y2]
        
        Returns:
            tuple: (cx, cy)
        """
        x1, y1, x2, y2 = bbox
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        return (cx, cy)
    
    @staticmethod
    def compute_bbox_area(bbox: List[float]) -> float:
        """
        Compute bounding box area.
        
        Args:
            bbox (list): [x1, y1, x2, y2]
        
        Returns:
            float: Area in pixels
        """
        x1, y1, x2, y2 = bbox
        return (x2 - x1) * (y2 - y1)
    
    def compute_speed_pixels(self) -> float:
        """
        Compute speed in pixels per frame from recent positions.
        
        Returns:
            float: Speed in pixels/frame
        """
        if len(self.centroids) < 2:
            return 0.0
        
        # Get last two centroids
        (x1, y1) = self.centroids[-2]
        (x2, y2) = self.centroids[-1]
        
        # Euclidean distance
        distance = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        
        return distance
    
    def get_average_speed_pixels(self, window: int = 10) -> float:
        """
        Get average speed over recent frames.
        
        Args:
            window (int): Number of recent frames to average
        
        Returns:
            float: Average speed in pixels/frame
        """
        if not self.speeds_px:
            return 0.0
        
        recent_speeds = list(self.speeds_px)[-window:]
        return np.mean(recent_speeds) if recent_speeds else 0.0
    
    def get_smoothed_speed_pixels(self, alpha: float = 0.3) -> float:
        """
        Get exponentially smoothed speed.
        
        Args:
            alpha (float): Smoothing factor (0-1)
        
        Returns:
            float: Smoothed speed
        """
        if not self.speeds_px:
            return 0.0
        
        speeds = list(self.speeds_px)
        smoothed = speeds[0]
        
        for speed in speeds[1:]:
            smoothed = alpha * speed + (1 - alpha) * smoothed
        
        return smoothed
    
    def is_stopped(self, threshold: float = 2.0, window: int = 5) -> bool:
        """
        Check if vehicle is stopped (very low speed).
        
        Args:
            threshold (float): Speed threshold in pixels/frame
            window (int): Number of frames to check
        
        Returns:
            bool: True if vehicle is stopped
        """
        avg_speed = self.get_average_speed_pixels(window=window)
        return avg_speed < threshold
    
    def get_trajectory_length(self) -> float:
        """
        Compute total trajectory length in pixels.
        
        Returns:
            float: Total distance traveled
        """
        if len(self.centroids) < 2:
            return 0.0
        
        total_distance = 0.0
        for i in range(1, len(self.centroids)):
            (x1, y1) = self.centroids[i-1]
            (x2, y2) = self.centroids[i]
            distance = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
            total_distance += distance
        
        return total_distance
    
    def get_current_bbox(self) -> Optional[List[float]]:
        """Get most recent bounding box."""
        return list(self.bboxes[-1]) if self.bboxes else None
    
    def get_current_centroid(self) -> Optional[Tuple[float, float]]:
        """Get most recent centroid."""
        return self.centroids[-1] if self.centroids else None


class TrackManager:
    """Manage multiple vehicle tracks."""
    
    def __init__(self, max_age: int = 30, max_history: int = 30):
        """
        Initialize track manager.
        
        Args:
            max_age (int): Maximum frames without detection before removing track
            max_history (int): Maximum history length per track
        """
        self.max_age = max_age
        self.max_history = max_history
        
        # Active tracks
        self.tracks: Dict[int, VehicleTrack] = {}
        
        # Track age (frames since last update)
        self.track_ages: Dict[int, int] = {}
        
        # Completed tracks
        self.completed_tracks: List[VehicleTrack] = []
        
        # Statistics
        self.total_tracks_created = 0
        self.total_tracks_completed = 0
    
    def update(self, detections: List[Tuple[int, List[float], int, str]], 
               frame_idx: int):
        """
        Update tracks with new detections.
        
        Args:
            detections (list): List of (track_id, bbox, class_id, class_name)
            frame_idx (int): Current frame index
        """
        detected_ids = set()
        
        # Update existing tracks or create new ones
        for track_id, bbox, class_id, class_name in detections:
            detected_ids.add(track_id)
            
            if track_id not in self.tracks:
                # Create new track
                self.tracks[track_id] = VehicleTrack(
                    track_id, max_history=self.max_history
                )
                self.total_tracks_created += 1
            
            # Update track
            self.tracks[track_id].update(bbox, frame_idx, class_id, class_name)
            self.track_ages[track_id] = 0
        
        # Age tracks that weren't detected
        tracks_to_remove = []
        for track_id in list(self.tracks.keys()):
            if track_id not in detected_ids:
                self.track_ages[track_id] = self.track_ages.get(track_id, 0) + 1
                
                # Remove old tracks
                if self.track_ages[track_id] > self.max_age:
                    tracks_to_remove.append(track_id)
        
        # Remove aged-out tracks
        for track_id in tracks_to_remove:
            self.remove_track(track_id)
    
    def remove_track(self, track_id: int):
        """
        Remove a track and archive it.
        
        Args:
            track_id (int): Track ID to remove
        """
        if track_id in self.tracks:
            track = self.tracks[track_id]
            track.is_active = False
            self.completed_tracks.append(track)
            
            del self.tracks[track_id]
            del self.track_ages[track_id]
            
            self.total_tracks_completed += 1
    
    def get_active_tracks(self) -> List[VehicleTrack]:
        """Get list of all active tracks."""
        return list(self.tracks.values())
    
    def get_track(self, track_id: int) -> Optional[VehicleTrack]:
        """Get specific track by ID."""
        return self.tracks.get(track_id)
    
    def get_active_count(self) -> int:
        """Get number of active tracks."""
        return len(self.tracks)
    
    def get_stopped_count(self, threshold: float = 2.0) -> int:
        """Get number of stopped vehicles."""
        return sum(1 for track in self.tracks.values() 
                   if track.is_stopped(threshold=threshold))
    
    def get_average_speed(self) -> float:
        """Get average speed of all active tracks."""
        if not self.tracks:
            return 0.0
        
        speeds = [track.get_average_speed_pixels() 
                  for track in self.tracks.values()]
        return np.mean(speeds) if speeds else 0.0
    
    def clear(self):
        """Clear all tracks."""
        # Archive all active tracks
        for track_id in list(self.tracks.keys()):
            self.remove_track(track_id)
    
    def get_statistics(self) -> Dict:
        """Get tracking statistics."""
        return {
            'active_tracks': self.get_active_count(),
            'total_created': self.total_tracks_created,
            'total_completed': self.total_tracks_completed,
            'stopped_vehicles': self.get_stopped_count(),
            'average_speed_px': self.get_average_speed(),
        }


def draw_tracks(frame: np.ndarray, tracks: List[VehicleTrack],
                show_trail: bool = True, trail_length: int = 20,
                show_id: bool = True, show_speed: bool = True,
                color: Tuple[int, int, int] = (0, 255, 0),
                thickness: int = 2):
    """
    Draw tracks on frame.
    
    Args:
        frame (np.ndarray): Input frame
        tracks (list): List of VehicleTrack objects
        show_trail (bool): Draw trajectory trail
        trail_length (int): Length of trail
        show_id (bool): Show track ID
        show_speed (bool): Show speed
        color (tuple): BGR color
        thickness (int): Line thickness
    
    Returns:
        np.ndarray: Annotated frame
    """
    import cv2
    
    annotated = frame.copy()
    
    for track in tracks:
        # Draw bounding box
        bbox = track.get_current_bbox()
        if bbox:
            x1, y1, x2, y2 = map(int, bbox)
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)
        
        # Draw trail
        if show_trail and len(track.centroids) > 1:
            points = list(track.centroids)[-trail_length:]
            for i in range(1, len(points)):
                pt1 = tuple(map(int, points[i-1]))
                pt2 = tuple(map(int, points[i]))
                cv2.line(annotated, pt1, pt2, color, thickness)
        
        # Draw centroid
        centroid = track.get_current_centroid()
        if centroid:
            cx, cy = map(int, centroid)
            cv2.circle(annotated, (cx, cy), 5, color, -1)
            
            # Add text annotations
            text_y = cy - 10
            
            if show_id:
                text = f"ID:{track.track_id}"
                cv2.putText(annotated, text, (cx + 10, text_y),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                text_y -= 20
            
            if show_speed:
                speed = track.get_average_speed_pixels(window=5)
                text = f"{speed:.1f}px/f"
                cv2.putText(annotated, text, (cx + 10, text_y),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
    
    return annotated