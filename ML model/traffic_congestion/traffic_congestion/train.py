#!/usr/bin/env python3
"""
train.py - Complete Training Pipeline
Handles: video extraction, frame preparation, labeling helper, training

Features:
- Apple Silicon (M-series) optimized training (MPS)
- Optionally limit dataset to a balanced subset across classes
- Label validation before training to catch bad .txt files
"""

import os
import sys
import cv2
import yaml
import shutil
import random
import argparse
from pathlib import Path
from tqdm import tqdm
from ultralytics import YOLO


class TrainingPipeline:
    """Complete training pipeline from videos to trained model."""
    
    def __init__(self, base_dir="."):
        self.base_dir = Path(base_dir)
        self.data_dir = self.base_dir / "data"
        self.videos_dir = self.data_dir / "videos"
        self.dataset_dir = self.data_dir / "dataset"
        self.images_dir = self.dataset_dir / "images"
        self.labels_dir = self.dataset_dir / "labels"
        self.models_dir = self.base_dir / "models"
        
        # Class names for YOLO
        self.class_names = {
            0: 'car',
            1: 'truck', 
            2: 'bus',
            3: 'motorcycle',
            4: 'bicycle'
        }
    
    def setup_directories(self):
        """Create all necessary directories."""
        dirs = [
            self.videos_dir,
            self.dataset_dir,
            self.images_dir / "train",
            self.images_dir / "val",
            self.labels_dir / "train",
            self.labels_dir / "val",
            self.models_dir,
            self.base_dir / "outputs"
        ]
        
        for d in dirs:
            d.mkdir(parents=True, exist_ok=True)
        
        print("✓ Directory structure created")
    
    def extract_frames(self, fps=2, max_frames=500):
        """Extract frames from videos for training."""
        video_files = list(self.videos_dir.glob("*.mp4")) + \
                     list(self.videos_dir.glob("*.avi")) + \
                     list(self.videos_dir.glob("*.mov"))
        
        if not video_files:
            print(f"❌ No videos found in {self.videos_dir}")
            print(f"   Please add video files to: {self.videos_dir}")
            return 0
        
        print(f"\n📹 Found {len(video_files)} video(s)")
        total_frames = 0
        
        for video_path in video_files:
            print(f"\nProcessing: {video_path.name}")
            
            cap = cv2.VideoCapture(str(video_path))
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            frame_skip = max(1, int(video_fps / fps))
            prefix = video_path.stem
            
            frame_idx = 0
            extracted = 0
            
            pbar = tqdm(total=min(total // frame_skip, max_frames), 
                       desc=f"  Extracting")
            
            while cap.isOpened() and extracted < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_idx % frame_skip == 0:
                    output_path = self.images_dir / "train" / \
                                f"{prefix}_frame_{extracted:06d}.jpg"
                    cv2.imwrite(str(output_path), frame, 
                              [cv2.IMWRITE_JPEG_QUALITY, 95])
                    extracted += 1
                    pbar.update(1)
                
                frame_idx += 1
            
            pbar.close()
            cap.release()
            total_frames += extracted
            print(f"  ✓ Extracted {extracted} frames")
        
        print(f"\n✓ Total frames extracted: {total_frames}")
        return total_frames
    
    def check_labeling_status(self):
        """Check how many images have been labeled."""
        train_images = list((self.images_dir / "train").glob("*.jpg"))
        train_labels = list((self.labels_dir / "train").glob("*.txt"))
        
        print("\n📊 Labeling Status:")
        print(f"   Images: {len(train_images)}")
        print(f"   Labels: {len(train_labels)}")
        print(f"   Progress: {len(train_labels)}/{len(train_images)} " +
              f"({len(train_labels)/max(len(train_images),1)*100:.1f}%)")
        
        if len(train_labels) < len(train_images) * 0.8:
            print(f"\n⚠️  You need to label more images!")
            print(f"   Target: At least {int(len(train_images) * 0.8)} labels")
            print(f"\n   To label, run:")
            print(f"   pip install labelImg")
            print(f"   labelImg {self.images_dir / 'train'} " + 
                  f"{self.labels_dir / 'train'}")
            return False
        
        return True
    
    def split_dataset(self, train_ratio=0.8):
        """Split dataset into train and validation sets."""
        # Get all training images
        train_images = list((self.images_dir / "train").glob("*.jpg"))
        
        if not train_images:
            print("❌ No images found to split")
            return
        
        # Get images that have labels
        labeled_images = []
        for img in train_images:
            label_path = self.labels_dir / "train" / img.with_suffix('.txt').name
            if label_path.exists():
                labeled_images.append(img)
        
        print(f"\n🔀 Splitting dataset:")
        print(f"   Total labeled images: {len(labeled_images)}")
        
        # Shuffle
        random.shuffle(labeled_images)
        
        # Split
        split_idx = int(len(labeled_images) * train_ratio)
        val_images = labeled_images[split_idx:]
        
        print(f"   Training: {split_idx}")
        print(f"   Validation: {len(val_images)}")
        
        # Move validation images and labels
        for img_path in tqdm(val_images, desc="  Moving to val"):
            # Move image
            dest_img = self.images_dir / "val" / img_path.name
            shutil.move(str(img_path), str(dest_img))
            
            # Move label
            label_path = self.labels_dir / "train" / img_path.with_suffix('.txt').name
            if label_path.exists():
                dest_label = self.labels_dir / "val" / label_path.name
                shutil.move(str(label_path), str(dest_label))
        
        print("✓ Dataset split complete")
    
    def limit_dataset_balanced(self, max_images=10000):
        """
        Limit total dataset (train + val) to a balanced subset across classes.

        Strategy:
        - Read YOLO label files for each image
        - Build mapping: class_id -> [images containing that class]
        - Sample up to (max_images / num_classes) images per class
        - Take the union of those images as the 'keep' set
        - Fill remaining slots (if any) with random leftover images
        - Move all non-kept images + labels to *_unused folders
        """
        train_dir = self.images_dir / "train"
        val_dir = self.images_dir / "val"

        train_images = list(train_dir.glob("*.jpg"))
        val_images = list(val_dir.glob("*.jpg"))

        all_images = train_images + val_images
        total = len(all_images)

        if total == 0:
            print("❌ No images found to limit.")
            return

        num_classes = len(self.class_names)
        if num_classes == 0:
            print("❌ No classes defined in self.class_names.")
            return

        print(f"\n📉 Limiting dataset size (balanced by class):")
        print(f"   Current total images (train+val): {total}")
        print(f"   Target max images: {max_images}")
        print(f"   Number of classes: {num_classes}")

        if total <= max_images:
            print("✅ Dataset already within the limit. No changes made.")
            return

        # Target images per class (roughly)
        target_per_class = max_images // num_classes
        if target_per_class == 0:
            target_per_class = 1  # at least 1 per class

        print(f"   Target images per class (approx): {target_per_class}")

        # Build mapping: class_id -> list of images containing that class
        class_to_images = {cid: [] for cid in self.class_names.keys()}

        print("\n🔍 Scanning labels to build class -> images mapping...")
        for img in tqdm(all_images, desc="  Reading labels"):
            split_name = img.parent.name  # "train" or "val"
            label_path = self.labels_dir / split_name / img.with_suffix(".txt").name
            if not label_path.exists():
                continue

            try:
                with open(label_path, "r") as f:
                    lines = [ln.strip() for ln in f.readlines() if ln.strip()]
            except Exception:
                continue

            if not lines:
                continue

            # Collect unique class IDs present in this image
            img_classes = set()
            for ln in lines:
                parts = ln.split()
                if not parts:
                    continue
                try:
                    cid = int(parts[0])
                except ValueError:
                    continue
                if cid in self.class_names:
                    img_classes.add(cid)

            for cid in img_classes:
                class_to_images[cid].append(img)

        # Report class distribution
        print("\n📊 Class distribution (images containing class):")
        for cid, imgs in class_to_images.items():
            print(f"   Class {cid} ({self.class_names[cid]}): {len(imgs)} images")

        # Select images per class
        selected_images = set()
        print("\n🎯 Selecting balanced subset of images per class...")
        for cid, imgs in class_to_images.items():
            if not imgs:
                print(f"   ⚠️ Class {cid} ({self.class_names[cid]}) has 0 images with labels.")
                continue

            imgs_shuffled = imgs[:]
            random.shuffle(imgs_shuffled)
            take = min(target_per_class, len(imgs_shuffled))
            chosen = imgs_shuffled[:take]

            selected_images.update(chosen)
            print(f"   Class {cid} ({self.class_names[cid]}): selected {take} images")

        # If we selected more than max_images due to overlap, downsample
        selected_list = list(selected_images)
        if len(selected_list) > max_images:
            random.shuffle(selected_list)
            selected_list = selected_list[:max_images]
            selected_images = set(selected_list)

        # If fewer than max_images, fill with random remaining images
        if len(selected_images) < max_images:
            remaining_needed = max_images - len(selected_images)
            remaining_images = list(set(all_images) - selected_images)
            random.shuffle(remaining_images)
            fill = remaining_images[:remaining_needed]
            selected_images.update(fill)
            print(f"\n➕ Filled remaining slots with {len(fill)} random images.")
        
        print(f"\n✅ Final balanced subset size: {len(selected_images)} images")

        # Prepare unused directories
        unused_images_train = self.dataset_dir / "images_unused" / "train"
        unused_images_val = self.dataset_dir / "images_unused" / "val"
        unused_labels_train = self.dataset_dir / "labels_unused" / "train"
        unused_labels_val = self.dataset_dir / "labels_unused" / "val"

        for d in [unused_images_train, unused_images_val, unused_labels_train, unused_labels_val]:
            d.mkdir(parents=True, exist_ok=True)

        # Move non-selected images and corresponding labels
        to_remove = [img for img in all_images if img not in selected_images]
        print(f"\n🧹 Moving {len(to_remove)} unused images to *_unused folders...")
        for img in tqdm(to_remove, desc="  Moving unused images"):
            split_name = img.parent.name  # "train" or "val"
            if split_name == "train":
                dest_img = unused_images_train / img.name
                src_label = self.labels_dir / "train" / img.with_suffix(".txt").name
                dest_label = unused_labels_train / src_label.name
            else:
                dest_img = unused_images_val / img.name
                src_label = self.labels_dir / "val" / img.with_suffix(".txt").name
                dest_label = unused_labels_val / src_label.name

            # Move image
            shutil.move(str(img), str(dest_img))

            # Move label if exists
            if src_label.exists():
                shutil.move(str(src_label), str(dest_label))

        print(f"\n✓ Balanced dataset limiting complete.")
        print(f"  Kept images: {len(selected_images)}")
        print(f"  Unused images moved to: {self.dataset_dir / 'images_unused'}")
        print(f"  Unused labels moved to: {self.dataset_dir / 'labels_unused'}")

    def validate_labels(self):
        """
        Validate YOLO label files to catch common issues:
        - Wrong number of columns
        - Class id out of range
        - Non-normalized or invalid coordinates
        """
        print("\n🔍 Validating label files...")

        problems = []
        for split in ["train", "val"]:
            label_dir = self.labels_dir / split
            if not label_dir.exists():
                continue

            for label_path in label_dir.glob("*.txt"):
                with open(label_path, "r") as f:
                    lines = [ln.strip() for ln in f.readlines() if ln.strip()]

                if not lines:
                    # Empty label file (no objects) is allowed
                    continue

                line_no = 0
                for ln in lines:
                    line_no += 1
                    parts = ln.split()

                    # 1) column count
                    if len(parts) != 5:
                        problems.append(
                            f"{label_path} (line {line_no}): expected 5 values, got {len(parts)} -> '{ln}'"
                        )
                        continue

                    # 2) class id
                    try:
                        cid = int(parts[0])
                    except ValueError:
                        problems.append(
                            f"{label_path} (line {line_no}): class id is not int -> '{parts[0]}'"
                        )
                        continue

                    if cid not in self.class_names:
                        problems.append(
                            f"{label_path} (line {line_no}): class id {cid} not in {list(self.class_names.keys())}"
                        )
                        continue

                    # 3) coords
                    try:
                        x, y, w, h = map(float, parts[1:])
                    except ValueError:
                        problems.append(
                            f"{label_path} (line {line_no}): could not parse coords -> {parts[1:]}"
                        )
                        continue

                    if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0 and 0.0 < w <= 1.0 and 0.0 < h <= 1.0):
                        problems.append(
                            f"{label_path} (line {line_no}): invalid coords x={x}, y={y}, w={w}, h={h}"
                        )

        if not problems:
            print("✅ All labels look OK.")
        else:
            print(f"\n⚠️ Found {len(problems)} label issues:")
            for msg in problems[:50]:
                print("   -", msg)
            if len(problems) > 50:
                print(f"   ... and {len(problems) - 50} more")

        return problems
    
    def create_data_yaml(self):
        """Create YOLO dataset configuration."""
        config = {
            'path': str(self.dataset_dir.absolute()),
            'train': 'images/train',
            'val': 'images/val',
            'nc': len(self.class_names),
            'names': self.class_names
        }
        
        yaml_path = self.data_dir / "data.yaml"
        with open(yaml_path, 'w') as f:
            yaml.dump(config, f, default_flow_style=False)
        
        print(f"✓ Created {yaml_path}")
        return yaml_path
    
    def train_model(self, model_size='n', epochs=100, batch=16,
                    device='auto', imgsz=640, workers=4):
        """Train YOLO model with Apple Silicon / GPU-friendly defaults."""
        import torch  # local import to avoid issues if torch isn't installed

        # Validate labels before training
        issues = self.validate_labels()
        if issues:
            print("\n❌ Label validation failed. Fix the issues above and rerun training.")
            raise SystemExit(1)

        # Create data.yaml
        data_yaml = self.create_data_yaml()

        # Resolve device
        if device in ("", "auto", None):
            if torch.backends.mps.is_available():
                device = 'mps'
                print("⚙️ Using Apple MPS (Metal) backend")
            elif torch.cuda.is_available():
                device = 'cuda'
                print("⚙️ Using CUDA GPU")
            else:
                device = 'cpu'
                print("⚠️ No GPU detected, training on CPU (will be slow)")
        else:
            print(f"⚙️ Using user-specified device: {device}")

        # Model sizes
        models = {
            'n': 'yolov8n.pt',  # Nano - fastest
            's': 'yolov8s.pt',  # Small - recommended
            'm': 'yolov8m.pt',  # Medium
            'l': 'yolov8l.pt',  # Large
            'x': 'yolov8x.pt',  # XLarge
        }

        print(f"\n🏋️  Training YOLOv8{model_size.upper()}")
        print(f"   Epochs: {epochs}")
        print(f"   Batch size: {batch}")
        print(f"   Image size: {imgsz}")
        print(f"   Device: {device}")
        print(f"   DataLoader workers: {workers}\n")

        # Load model
        model = YOLO(models[model_size])

        # Train (optimized for MPS stability)
        results = model.train(
            data=str(data_yaml),
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            device=device,
            workers=workers,          # use multiple workers for data loading
            project=str(self.models_dir / "training"),
            name='traffic_model',
            exist_ok=True,
            patience=30,              # earlier stopping if plateau
            save=True,                # save best and last
            save_period=-1,           # don't save every N epochs
            plots=False,              # disable per-epoch plots
            verbose=False,            # reduced logging
            val=False,                # no per-epoch validation (MPS NMS is slow)
            amp=False,                # 🔴 disable AMP to avoid MPS/assigner shape bugs
        )

        # Copy best model to main models folder
        best_model = self.models_dir / "training" / "traffic_model" / "weights" / "best.pt"
        if best_model.exists():
            shutil.copy(best_model, self.models_dir / "best.pt")
            print(f"\n✓ Best model saved to: {self.models_dir / 'best.pt'}")

        # NOTE: We skip final model.val() here to avoid slow NMS on MPS.
        print("\nℹ️ Training finished without final validation step (for speed).")
        
        return str(self.models_dir / "best.pt")


def main():
    parser = argparse.ArgumentParser(
        description="Training Pipeline for Traffic Detection",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full pipeline (extract, label check, split, train)
  python train.py --all
  
  # Extract frames only
  python train.py --extract --fps 2 --max-frames 500
  
  # Check labeling status
  python train.py --check-labels
  
  # Split dataset after labeling
  python train.py --split
  
  # Limit dataset to 10k images (balanced across classes)
  python train.py --limit-images --max-images 10000
  
  # Train model only
  python train.py --train --model-size s --epochs 100
  
  # Custom training
  python train.py --train --model-size m --epochs 150 --batch 16 --device mps
        """
    )
    
    # Actions
    parser.add_argument('--all', action='store_true',
                       help='Run complete pipeline')
    parser.add_argument('--setup', action='store_true',
                       help='Setup directories only')
    parser.add_argument('--extract', action='store_true',
                       help='Extract frames from videos')
    parser.add_argument('--check-labels', action='store_true',
                       help='Check labeling progress')
    parser.add_argument('--split', action='store_true',
                       help='Split dataset into train/val')
    parser.add_argument('--train', action='store_true',
                       help='Train model')
    parser.add_argument('--limit-images', action='store_true',
                       help='Limit dataset to max-images with balanced classes')
    
    # Extract options
    parser.add_argument('--fps', type=float, default=2,
                       help='Frames per second to extract (default: 2)')
    parser.add_argument('--max-frames', type=int, default=500,
                       help='Max frames per video (default: 500)')
    
    # Training / limiting options
    parser.add_argument('--model-size', type=str, default='n',
                       choices=['n', 's', 'm', 'l', 'x'],
                       help='Model size: n=nano, s=small, m=medium (default: n)')
    parser.add_argument('--epochs', type=int, default=100,
                       help='Training epochs (default: 100)')
    parser.add_argument('--batch', type=int, default=16,
                       help='Batch size (default: 16)')
    parser.add_argument('--imgsz', type=int, default=640,
                       help='Image size (default: 640)')
    parser.add_argument('--device', type=str, default='auto',
                       help='Device: auto, mps, cuda, cpu (default: auto)')
    parser.add_argument('--workers', type=int, default=4,
                       help='Number of dataloader workers (default: 4)')
    parser.add_argument('--max-images', type=int, default=10000,
                       help='Maximum total images (train+val) to keep in balanced subset (default: 10000)')
    
    args = parser.parse_args()
    
    # Initialize pipeline
    pipeline = TrainingPipeline()
    
    # Setup directories
    pipeline.setup_directories()
    
    # Execute requested actions
    if args.setup:
        print("\n✅ Setup complete!")
        print(f"\nNext steps:")
        print(f"1. Add videos to: {pipeline.videos_dir}")
        print(f"2. Run: python train.py --extract")
        return
    
    if args.extract or args.all:
        count = pipeline.extract_frames(fps=args.fps, max_frames=args.max_frames)
        if count == 0:
            return
        
        if not args.all:
            print(f"\n✅ Frames extracted!")
            print(f"\nNext steps:")
            print(f"1. Install labelImg: pip install labelImg")
            print(f"2. Label images: labelImg {pipeline.images_dir / 'train'} " +
                  f"{pipeline.labels_dir / 'train'}")
            print(f"3. After labeling, run: python train.py --split --train")
            return
    
    if args.check_labels or args.all:
        has_labels = pipeline.check_labeling_status()
        if not has_labels and not args.all:
            return
    
    if args.limit_images:
        pipeline.limit_dataset_balanced(max_images=args.max_images)
    
    if args.split or args.all:
        pipeline.split_dataset()
        
        if not args.all and not args.train:
            print(f"\n✅ Dataset split!")
            print(f"\nNext steps:")
            print(f"Run: python train.py --train")
            return
    
    if args.train or args.all:
        model_path = pipeline.train_model(
            model_size=args.model_size,
            epochs=args.epochs,
            batch=args.batch,
            device=args.device,   # 'auto' by default
            imgsz=args.imgsz,
            workers=args.workers
        )
        
        print(f"\n✅ Training complete!")
        print(f"\nModel saved to: {model_path}")
        print(f"\nNext steps:")
        print(f"Test your model:")
        print(f"python detect.py --input video.mp4 --model {model_path}")
    
    if not any([args.all, args.setup, args.extract, args.check_labels, 
                args.split, args.train, args.limit_images]):
        parser.print_help()


if __name__ == "__main__":
    main()
