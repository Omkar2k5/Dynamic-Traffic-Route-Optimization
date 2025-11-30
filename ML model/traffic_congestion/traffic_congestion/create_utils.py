# create_utils.py - Run this to create all util files automatically
import os

# Create utils directory if not exists
os.makedirs('utils', exist_ok=True)

# Content for __init__.py
init_content = '''"""Utils package for traffic congestion detection."""

from .tracking import TrackManager, VehicleTrack, draw_tracks
from .speed_estimation import (
    PixelSpeedEstimator, 
    HomographySpeedEstimator, 
    SpeedSmoother
)
from .metrics import (
    CongestionDetector, 
    CongestionMetrics, 
    CongestionLevel,
    draw_congestion_overlay,
    export_metrics_csv
)

__all__ = [
    'TrackManager', 'VehicleTrack', 'draw_tracks',
    'PixelSpeedEstimator', 'HomographySpeedEstimator', 'SpeedSmoother',
    'CongestionDetector', 'CongestionMetrics', 'CongestionLevel',
    'draw_congestion_overlay', 'export_metrics_csv'
]
'''

with open('utils/__init__.py', 'w') as f:
    f.write(init_content)

print("✓ Created utils/__init__.py")
print("\nNow manually copy:")
print("1. tracking.py")
print("2. speed_estimation.py")
print("3. metrics.py")
print("\nInto the utils/ folder")