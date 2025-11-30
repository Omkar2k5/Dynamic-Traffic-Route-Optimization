"""
Speed estimation utilities for traffic analysis.
Implements both simple pixel-based and accurate homography-based methods.
"""

import numpy as np
import cv2
from typing import List, Tuple, Optional, Dict
from collections import deque


class SpeedEstimator:
    """Base class for speed estimation."""
    
    def __init__(self, fps: float = 30.0):
        """
        Initialize speed estimator.
        
        Args:
            fps (float): Video frames per second
        """
        self.fps = fps
        self.frame_time = 1.0 / fps  # Time per frame in seconds
    
    def pixels_to_speed(self, pixels_per_frame: float) -> float:
        """
        Convert pixels/frame to some speed unit.
        Must be implemented by subclass.
        
        Args:
            pixels_per_frame (float): Speed in pixels per frame
        
        Returns:
            float: Speed in desired units
        """
        raise NotImplementedError


class PixelSpeedEstimator(SpeedEstimator):
    """
    Simple pixel-based speed estimation.
    Fast but not accurate for real-world speeds.
    """
    
    def __init__(self, fps: float = 30.0, 
                 pixels_per_meter: float = 20.0):
        """
        Initialize pixel speed estimator.
        
        Args:
            fps (float): Video frames per second
            pixels_per_meter (float): Calibration factor (pixels = 1 meter)
        """
        super().__init__(fps)
        self.pixels_per_meter = pixels_per_meter
    
    def pixels_to_speed(self, pixels_per_frame: float) -> float:
        """
        Convert pixels/frame to km/h.
        
        Args:
            pixels_per_frame (float): Speed in pixels per frame
        
        Returns:
            float: Speed in km/h
        """
        # pixels/frame -> meters/frame
        meters_per_frame = pixels_per_frame / self.pixels_per_meter
        
        # meters/frame -> meters/second
        meters_per_second = meters_per_frame * self.fps
        
        # meters/second -> km/h
        km_per_hour = meters_per_second * 3.6
        
        return km_per_hour
    
    def calibrate(self, known_distance_pixels: float, 
                  known_distance_meters: float):
        """
        Calibrate the estimator using a known distance.
        
        Args:
            known_distance_pixels (float): Distance in pixels
            known_distance_meters (float): Actual distance in meters
        """
        self.pixels_per_meter = known_distance_pixels / known_distance_meters
        print(f"Calibrated: {self.pixels_per_meter:.2f} pixels = 1 meter")


class HomographySpeedEstimator(SpeedEstimator):
    """
    Accurate homography-based speed estimation.
    Maps image coordinates to real-world coordinates.
    """
    
    def __init__(self, fps: float = 30.0,
                 image_points: Optional[np.ndarray] = None,
                 world_points: Optional[np.ndarray] = None):
        """
        Initialize homography speed estimator.
        
        Args:
            fps (float): Video frames per second
            image_points (np.ndarray): 4 points in image coordinates [[x,y],...]
            world_points (np.ndarray): 4 corresponding points in world coords [[x,y],...]
        """
        super().__init__(fps)
        self.homography_matrix = None
        
        if image_points is not None and world_points is not None:
            self.compute_homography(image_points, world_points)
    
    def compute_homography(self, image_points: np.ndarray, 
                          world_points: np.ndarray):
        """
        Compute homography matrix from point correspondences.
        
        Args:
            image_points (np.ndarray): 4+ points in image [[x,y],...]
            world_points (np.ndarray): Corresponding world points [[x,y],...]
        
        Example:
            # Define 4 corners of a known area (e.g., road section)
            image_pts = np.array([
                [100, 400],  # Bottom-left in image
                [500, 400],  # Bottom-right in image
                [200, 200],  # Top-left in image
                [400, 200],  # Top-right in image
            ], dtype=np.float32)
            
            # Corresponding real-world coordinates in meters
            world_pts = np.array([
                [0, 0],      # Origin
                [10, 0],     # 10 meters to the right
                [0, 20],     # 20 meters ahead
                [10, 20],    # Corner
            ], dtype=np.float32)
        """
        image_points = np.array(image_points, dtype=np.float32)
        world_points = np.array(world_points, dtype=np.float32)
        
        # Compute homography matrix
        self.homography_matrix, _ = cv2.findHomography(
            image_points, world_points, cv2.RANSAC
        )
        
        print("Homography matrix computed successfully")
        print(self.homography_matrix)
    
    def image_to_world(self, image_point: Tuple[float, float]) -> Tuple[float, float]:
        """
        Transform image coordinates to world coordinates.
        
        Args:
            image_point (tuple): (x, y) in image
        
        Returns:
            tuple: (x, y) in world coordinates (meters)
        """
        if self.homography_matrix is None:
            raise ValueError("Homography matrix not computed. Call compute_homography first.")
        
        # Convert to homogeneous coordinates
        point = np.array([[[image_point[0], image_point[1]]]], dtype=np.float32)
        
        # Apply homography
        world_point = cv2.perspectiveTransform(point, self.homography_matrix)
        
        return tuple(world_point[0][0])
    
    def compute_world_distance(self, point1: Tuple[float, float],
                              point2: Tuple[float, float]) -> float:
        """
        Compute distance between two points in world coordinates.
        
        Args:
            point1 (tuple): (x, y) in image
            point2 (tuple): (x, y) in image
        
        Returns:
            float: Distance in meters
        """
        # Transform to world coordinates
        world1 = self.image_to_world(point1)
        world2 = self.image_to_world(point2)
        
        # Euclidean distance
        distance = np.sqrt((world2[0] - world1[0])**2 + 
                          (world2[1] - world1[1])**2)
        
        return distance
    
    def pixels_to_speed(self, centroid1: Tuple[float, float],
                       centroid2: Tuple[float, float]) -> float:
        """
        Compute speed from two consecutive centroids.
        
        Args:
            centroid1 (tuple): Previous position (x, y)
            centroid2 (tuple): Current position (x, y)
        
        Returns:
            float: Speed in km/h
        """
        # Compute world distance
        distance_meters = self.compute_world_distance(centroid1, centroid2)
        
        # Distance per frame -> distance per second
        distance_per_second = distance_meters * self.fps
        
        # Convert to km/h
        speed_kmh = distance_per_second * 3.6
        
        return speed_kmh
    
    def draw_world_grid(self, frame: np.ndarray, 
                       grid_spacing: float = 5.0,
                       max_distance: float = 50.0,
                       color: Tuple[int, int, int] = (255, 255, 0),
                       thickness: int = 1) -> np.ndarray:
        """
        Draw world coordinate grid on image for visualization.
        
        Args:
            frame (np.ndarray): Input frame
            grid_spacing (float): Grid spacing in meters
            max_distance (float): Maximum distance to draw
            color (tuple): Line color (BGR)
            thickness (int): Line thickness
        
        Returns:
            np.ndarray: Frame with grid overlay
        """
        if self.homography_matrix is None:
            return frame
        
        annotated = frame.copy()
        
        # Generate world grid points
        world_points = []
        for x in np.arange(0, max_distance, grid_spacing):
            for y in np.arange(0, max_distance, grid_spacing):
                world_points.append([x, y])
        
        world_points = np.array(world_points, dtype=np.float32).reshape(-1, 1, 2)
        
        # Transform to image coordinates
        inv_homography = np.linalg.inv(self.homography_matrix)
        image_points = cv2.perspectiveTransform(world_points, inv_homography)
        
        # Draw grid
        h, w = frame.shape[:2]
        for point in image_points:
            x, y = point[0]
            if 0 <= x < w and 0 <= y < h:
                cv2.circle(annotated, (int(x), int(y)), 3, color, -1)
        
        return annotated


class SpeedSmoother:
    """Smooth and filter speed measurements to remove noise."""
    
    def __init__(self, window_size: int = 5, 
                 outlier_threshold: float = 3.0):
        """
        Initialize speed smoother.
        
        Args:
            window_size (int): Moving average window size
            outlier_threshold (float): Z-score threshold for outlier removal
        """
        self.window_size = window_size
        self.outlier_threshold = outlier_threshold
        self.speed_history = deque(maxlen=window_size)
    
    def add_speed(self, speed: float) -> float:
        """
        Add new speed measurement and return smoothed value.
        
        Args:
            speed (float): Raw speed measurement
        
        Returns:
            float: Smoothed speed
        """
        # Remove outliers using z-score
        if len(self.speed_history) > 2:
            mean = np.mean(self.speed_history)
            std = np.std(self.speed_history)
            
            if std > 0:
                z_score = abs((speed - mean) / std)
                if z_score > self.outlier_threshold:
                    # Outlier detected, use previous mean
                    speed = mean
        
        # Add to history
        self.speed_history.append(speed)
        
        # Return moving average
        return np.mean(self.speed_history)
    
    def reset(self):
        """Reset speed history."""
        self.speed_history.clear()


def setup_homography_interactive(frame: np.ndarray,
                                real_world_dims: Tuple[float, float] = (10.0, 20.0)
                                ) -> HomographySpeedEstimator:
    """
    Interactive tool to set up homography by clicking 4 points.
    
    Args:
        frame (np.ndarray): Sample frame from video
        real_world_dims (tuple): (width, height) of selected area in meters
    
    Returns:
        HomographySpeedEstimator: Configured estimator
    
    Instructions:
        1. Click 4 corners of a rectangular area (e.g., lane marking)
        2. Click in order: bottom-left, bottom-right, top-left, top-right
        3. Press any key when done
    """
    points = []
    
    def mouse_callback(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN:
            if len(points) < 4:
                points.append([x, y])
                cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)
                cv2.putText(frame, f"{len(points)}", (x+10, y+10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                cv2.imshow("Setup Homography", frame)
    
    cv2.namedWindow("Setup Homography")
    cv2.setMouseCallback("Setup Homography", mouse_callback)
    cv2.imshow("Setup Homography", frame)
    
    print("Click 4 corners of a rectangular area:")
    print("1. Bottom-left")
    print("2. Bottom-right")
    print("3. Top-left")
    print("4. Top-right")
    print("Press any key when done...")
    
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    
    if len(points) < 4:
        raise ValueError("Need 4 points for homography")
    
    # Define world coordinates
    width, height = real_world_dims
    world_points = np.array([
        [0, 0],
        [width, 0],
        [0, height],
        [width, height],
    ], dtype=np.float32)
    
    image_points = np.array(points, dtype=np.float32)
    
    # Create estimator
    estimator = HomographySpeedEstimator(
        image_points=image_points,
        world_points=world_points
    )
    
    return estimator


def estimate_fps_from_video(video_path: str) -> float:
    """
    Get FPS from video file.
    
    Args:
        video_path (str): Path to video
    
    Returns:
        float: Frames per second
    """
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    cap.release()
    return fps