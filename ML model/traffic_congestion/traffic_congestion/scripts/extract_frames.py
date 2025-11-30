#!/usr/bin/env python3
"""
Extract frames from traffic videos for training dataset preparation.
Supports batch processing and intelligent frame sampling.
"""

import cv2
import os
import argparse
from pathlib import Path
from tqdm import tqdm


def extract_frames(video_path, output_dir, fps=None, max_frames=None, 
                   skip_frames=1, prefix="frame"):
    """
    Extract frames from a video file.
    
    Args:
        video_path (str): Path to input video
        output_dir (str): Directory to save extracted frames
        fps (float): Target FPS for extraction (None = use video FPS)
        max_frames (int): Maximum number of frames to extract
        skip_frames (int): Extract every Nth frame (1 = all frames)
        prefix (str): Prefix for output filenames
    
    Returns:
        int: Number of frames extracted
    """
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")
    
    # Get video properties
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f"Video info: {width}x{height} @ {video_fps:.2f} FPS, {total_frames} frames")
    
    # Calculate frame sampling
    if fps is not None:
        skip_frames = max(1, int(video_fps / fps))
        print(f"Extracting at {fps} FPS (every {skip_frames} frames)")
    
    frame_count = 0
    extracted_count = 0
    
    # Progress bar
    pbar = tqdm(total=min(total_frames // skip_frames, max_frames or float('inf')),
                desc="Extracting frames")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Check if we should extract this frame
        if frame_count % skip_frames == 0:
            # Save frame
            frame_filename = f"{prefix}_{extracted_count:06d}.jpg"
            frame_path = os.path.join(output_dir, frame_filename)
            cv2.imwrite(frame_path, frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
            extracted_count += 1
            pbar.update(1)
            
            # Check max frames limit
            if max_frames and extracted_count >= max_frames:
                break
        
        frame_count += 1
    
    pbar.close()
    cap.release()
    
    print(f"Extracted {extracted_count} frames to {output_dir}")
    return extracted_count


def batch_extract(input_dir, output_base_dir, **kwargs):
    """
    Extract frames from multiple videos in a directory.
    
    Args:
        input_dir (str): Directory containing video files
        output_base_dir (str): Base directory for output
        **kwargs: Arguments passed to extract_frames()
    """
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv'}
    
    # Find all video files
    input_path = Path(input_dir)
    video_files = [f for f in input_path.iterdir() 
                   if f.suffix.lower() in video_extensions]
    
    if not video_files:
        print(f"No video files found in {input_dir}")
        return
    
    print(f"Found {len(video_files)} video files")
    
    for video_file in video_files:
        video_name = video_file.stem
        output_dir = os.path.join(output_base_dir, video_name)
        
        print(f"\n{'='*60}")
        print(f"Processing: {video_file.name}")
        print(f"{'='*60}")
        
        try:
            extract_frames(str(video_file), output_dir, 
                          prefix=video_name, **kwargs)
        except Exception as e:
            print(f"Error processing {video_file.name}: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Extract frames from traffic videos for dataset preparation"
    )
    parser.add_argument('input', help='Input video file or directory')
    parser.add_argument('output', help='Output directory for extracted frames')
    parser.add_argument('--fps', type=float, default=None,
                        help='Target FPS for extraction (default: use video FPS)')
    parser.add_argument('--max-frames', type=int, default=None,
                        help='Maximum number of frames to extract')
    parser.add_argument('--skip-frames', type=int, default=1,
                        help='Extract every Nth frame (default: 1)')
    parser.add_argument('--batch', action='store_true',
                        help='Process all videos in input directory')
    parser.add_argument('--prefix', type=str, default='frame',
                        help='Prefix for output filenames')
    
    args = parser.parse_args()
    
    if args.batch:
        batch_extract(args.input, args.output, 
                     fps=args.fps, 
                     max_frames=args.max_frames,
                     skip_frames=args.skip_frames)
    else:
        extract_frames(args.input, args.output,
                      fps=args.fps,
                      max_frames=args.max_frames,
                      skip_frames=args.skip_frames,
                      prefix=args.prefix)


if __name__ == "__main__":
    main()