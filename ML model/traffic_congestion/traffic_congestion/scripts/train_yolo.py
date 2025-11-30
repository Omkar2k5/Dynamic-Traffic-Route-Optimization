#!/usr/bin/env python3
"""
YOLOv8 Training Script for Traffic Vehicle Detection
Supports custom datasets, hyperparameter tuning, and automatic model saving
"""

import os
import argparse
from pathlib import Path
import tempfile
from ultralytics import YOLO
import torch
import yaml


def setup_training_environment():
    """Setup training environment and check GPU availability."""
    print("="*60)
    print("Training Environment Setup")
    print("="*60)
    
    # Check PyTorch and CUDA
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"CUDA version: {torch.version.cuda}")
        print(f"GPU Device: {torch.cuda.get_device_name(0)}")
        print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.2f} GB")
    print("="*60 + "\n")


def train_model(data_yaml, model_size='n', epochs=35, imgsz=640, batch=16,
                device='', project='runs/train', name='traffic_model',
                resume=False, pretrained=True, save_period=10, patience=50,
                optimizer='auto', lr0=0.01, momentum=0.937, weight_decay=0.0005,
                augment=True, hsv_h=0.015, hsv_s=0.7, hsv_v=0.4,
                degrees=0.0, translate=0.1, scale=0.5, shear=0.0,
                perspective=0.0, flipud=0.0, fliplr=0.5, mosaic=1.0,
                mixup=0.0, copy_paste=0.0, fraction=1.0, workers=8, cache=False):
    """
    Train YOLOv8 model on custom traffic dataset.
    
    Args:
        data_yaml (str): Path to data.yaml configuration
        model_size (str): Model size ('n', 's', 'm', 'l', 'x')
        epochs (int): Number of training epochs
        imgsz (int): Input image size
        batch (int): Batch size (-1 for auto)
        device (str): Device to use ('', '0', 'cpu', '0,1,2,3')
        project (str): Project directory
        name (str): Experiment name
        resume (bool): Resume from last checkpoint
        pretrained (bool): Use pretrained weights
        save_period (int): Save checkpoint every N epochs
        patience (int): Early stopping patience
        optimizer (str): Optimizer ('SGD', 'Adam', 'AdamW', 'auto')
        lr0 (float): Initial learning rate
        momentum (float): SGD momentum
        weight_decay (float): Optimizer weight decay
        augment (bool): Use data augmentation
        hsv_h (float): HSV-Hue augmentation
        hsv_s (float): HSV-Saturation augmentation
        hsv_v (float): HSV-Value augmentation
    
    # dataset / performance options will be defined after creating parser
        degrees (float): Rotation augmentation (degrees)
        translate (float): Translation augmentation
        scale (float): Scale augmentation
        shear (float): Shear augmentation (degrees)
        perspective (float): Perspective augmentation
        flipud (float): Vertical flip probability
        fliplr (float): Horizontal flip probability
        mosaic (float): Mosaic augmentation probability
        mixup (float): MixUp augmentation probability
        copy_paste (float): Copy-paste augmentation probability
    
    Returns:
        YOLO: Trained model
    """
    setup_training_environment()
    
    # Model size selection
    model_sizes = {
        'n': 'yolov8n.pt',  # Nano - fastest, 3.2M params
        's': 'yolov8s.pt',  # Small - balanced, 11.2M params
        'm': 'yolov8m.pt',  # Medium - accurate, 25.9M params
        'l': 'yolov8l.pt',  # Large - very accurate, 43.7M params
        'x': 'yolov8x.pt',  # XLarge - most accurate, 68.2M params
    }
    
    if model_size not in model_sizes:
        raise ValueError(f"Model size must be one of {list(model_sizes.keys())}")
    
    model_path = model_sizes[model_size] if pretrained else f'yolov8{model_size}.yaml'
    
    print(f"Loading model: {model_path}")
    print(f"Model size: {model_size.upper()}")
    print(f"Pretrained: {pretrained}\n")
    
    # Load model
    model = YOLO(model_path)
    
    # Training parameters
    train_args = {
        'data': data_yaml,
        'epochs': epochs,
        'imgsz': imgsz,
        'batch': batch,
        'device': device,
        'project': project,
        'name': name,
        'exist_ok': True,
        'resume': resume,
        'save': True,
        'save_period': save_period,
        'patience': patience,
        'optimizer': optimizer,
        'lr0': lr0,
        'lrf': 0.01,  # Final learning rate (lr0 * lrf)
        'momentum': momentum,
        'weight_decay': weight_decay,
        'warmup_epochs': 3.0,
        'warmup_momentum': 0.8,
        'warmup_bias_lr': 0.1,
        'box': 7.5,  # Box loss gain
        'cls': 0.5,  # Class loss gain
        'dfl': 1.5,  # DFL loss gain
        'pose': 12.0,  # Pose loss gain
        'kobj': 2.0,  # Keypoint obj loss gain
        'label_smoothing': 0.0,
        'nbs': 64,  # Nominal batch size
        'overlap_mask': True,
        'mask_ratio': 4,
        'dropout': 0.0,
        'val': True,
        'plots': True,
        'save_json': False,
        'save_hybrid': False,
        'conf': None,
        'iou': 0.7,
        'max_det': 300,
        'half': False,
        'dnn': False,
        'verbose': True,
        'seed': 0,
        'deterministic': True,
        'single_cls': False,
        'rect': False,
        'cos_lr': False,
        'close_mosaic': 10,
        'amp': True,
        'fraction': fraction,
        'profile': False,
        'freeze': None,
        'multi_scale': False,
        'workers': workers,
        'cache': cache,
    }
    
    # Add augmentation parameters if enabled
    if augment:
        train_args.update({
            'hsv_h': hsv_h,
            'hsv_s': hsv_s,
            'hsv_v': hsv_v,
            'degrees': degrees,
            'translate': translate,
            'scale': scale,
            'shear': shear,
            'perspective': perspective,
            'flipud': flipud,
            'fliplr': fliplr,
            'mosaic': mosaic,
            'mixup': mixup,
            'copy_paste': copy_paste,
        })
    
    print("Training Configuration:")
    print("-" * 60)
    for key, value in train_args.items():
        print(f"{key:20s}: {value}")
    print("-" * 60 + "\n")
    
    # Resolve dataset paths in data.yaml to absolute paths so training works
    # even when the script runs from a different working directory.
    tmp_data_file = None
    data_path = Path(data_yaml)
    if data_path.exists():
        try:
            with open(data_path, 'r', encoding='utf-8') as fh:
                cfg = yaml.safe_load(fh)

            base = data_path.parent.resolve()

            # Convert 'path' to absolute if present
            if isinstance(cfg, dict):
                cfg_path = cfg.get('path', '.')
                if not Path(cfg_path).is_absolute():
                    cfg['path'] = str(base)

                # Ensure train/val entries are absolute
                for k in ('train', 'val'):
                    if k in cfg:
                        p = Path(cfg[k])
                        if not p.is_absolute():
                            cfg[k] = str((base / cfg[k]).resolve())

            # Write adjusted YAML to a temporary file and use it for training
            tmpf = tempfile.NamedTemporaryFile(delete=False, suffix='.yaml')
            with open(tmpf.name, 'w', encoding='utf-8') as fh:
                yaml.safe_dump(cfg, fh)
            tmp_data_file = tmpf.name
            train_args['data'] = tmp_data_file
        except Exception as e:
            print(f"Warning: couldn't rewrite data paths from {data_path}: {e}")
            train_args['data'] = str(data_path)
    else:
        # If file doesn't exist (maybe user provided a dataset name), pass through
        train_args['data'] = data_yaml

    # Start training
    try:
        print("Starting training...")
        results = model.train(**train_args)

        print("\nTraining completed!")
        print(f"Best model saved at: {model.trainer.best}")
        print(f"Last model saved at: {model.trainer.last}")

        # Validate model
        print("\nValidating model...")
        metrics = model.val()

        print("\nValidation Metrics:")
        print(f"mAP50: {metrics.box.map50:.4f}")
        print(f"mAP50-95: {metrics.box.map:.4f}")
        print(f"Precision: {metrics.box.mp:.4f}")
        print(f"Recall: {metrics.box.mr:.4f}")

        return model
    finally:
        # cleanup temporary data file (if created)
        if tmp_data_file:
            try:
                Path(tmp_data_file).unlink()
            except Exception:
                pass


def save_to_google_drive(model_path, drive_folder='traffic_models'):
    """
    Save trained model to Google Drive (Colab environment).
    
    Args:
        model_path (str): Path to model weights
        drive_folder (str): Folder name in Google Drive
    """
    try:
        from google.colab import drive
        import shutil
        
        # Mount Google Drive
        print("Mounting Google Drive...")
        drive.mount('/content/drive')
        
        # Create destination folder
        dest_dir = f'/content/drive/MyDrive/{drive_folder}'
        os.makedirs(dest_dir, exist_ok=True)
        
        # Copy model
        model_name = os.path.basename(model_path)
        dest_path = os.path.join(dest_dir, model_name)
        shutil.copy(model_path, dest_path)
        
        print(f"\nModel saved to Google Drive:")
        print(f"  {dest_path}")
        
    except ImportError:
        print("\nNot running in Colab environment. Skipping Google Drive upload.")
    except Exception as e:
        print(f"\nError saving to Google Drive: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Train YOLOv8 for traffic vehicle detection"
    )
    
    # Required arguments
    parser.add_argument('--data', type=str, required=True,
                        help='Path to data.yaml')
    
    # Model arguments
    parser.add_argument('--model-size', type=str, default='n',
                        choices=['n', 's', 'm', 'l', 'x'],
                        help='Model size (n=nano, s=small, m=medium, l=large, x=xlarge)')
    parser.add_argument('--pretrained', action='store_true', default=True,
                        help='Use pretrained weights')
    parser.add_argument('--no-pretrained', dest='pretrained', action='store_false',
                        help='Train from scratch')
    
    # Training arguments
    parser.add_argument('--epochs', type=int, default=35,
                        help='Number of training epochs')
    parser.add_argument('--batch', type=int, default=16,
                        help='Batch size (-1 for auto)')
    parser.add_argument('--imgsz', type=int, default=640,
                        help='Input image size')
    parser.add_argument('--device', type=str, default='',
                        help='Device to use (empty=auto, 0=GPU0, cpu=CPU)')
    
    # Optimizer arguments
    parser.add_argument('--optimizer', type=str, default='auto',
                        choices=['SGD', 'Adam', 'AdamW', 'auto'],
                        help='Optimizer type')
    parser.add_argument('--lr0', type=float, default=0.01,
                        help='Initial learning rate')
    parser.add_argument('--momentum', type=float, default=0.937,
                        help='SGD momentum')
    parser.add_argument('--weight-decay', type=float, default=0.0005,
                        help='Optimizer weight decay')
    
    # Output arguments
    parser.add_argument('--project', type=str, default='runs/train',
                        help='Project directory')
    parser.add_argument('--name', type=str, default='traffic_model',
                        help='Experiment name')
    parser.add_argument('--save-period', type=int, default=10,
                        help='Save checkpoint every N epochs')
    parser.add_argument('--patience', type=int, default=50,
                        help='Early stopping patience')
    
    # Augmentation arguments
    parser.add_argument('--no-augment', dest='augment', action='store_false',
                        help='Disable data augmentation')
    parser.add_argument('--fliplr', type=float, default=0.5,
                        help='Horizontal flip probability')
    parser.add_argument('--mosaic', type=float, default=1.0,
                        help='Mosaic augmentation probability')

    # Dataset / performance options (helpful for very large datasets)
    parser.add_argument('--fraction', type=float, default=1.0,
                        help='Fraction (0< f <= 1) of dataset to use for faster experiments')
    parser.add_argument('--cache', action='store_true',
                        help='Cache dataset in RAM (speeds up training but uses more memory)')
    parser.add_argument('--workers', type=int, default=8,
                        help='Number of dataloader workers')
    
    # Google Drive
    parser.add_argument('--save-drive', action='store_true',
                        help='Save model to Google Drive (Colab only)')
    parser.add_argument('--drive-folder', type=str, default='traffic_models',
                        help='Google Drive folder name')
    
    # Misc
    parser.add_argument('--resume', action='store_true',
                        help='Resume from last checkpoint')
    
    args = parser.parse_args()
    
    # Train model
    model = train_model(
        data_yaml=args.data,
        model_size=args.model_size,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=args.project,
        name=args.name,
        resume=args.resume,
        pretrained=args.pretrained,
        save_period=args.save_period,
        patience=args.patience,
        optimizer=args.optimizer,
        lr0=args.lr0,
        momentum=args.momentum,
        weight_decay=args.weight_decay,
        augment=args.augment,
        fliplr=args.fliplr,
        mosaic=args.mosaic,
        fraction=args.fraction,
        workers=args.workers,
        cache=args.cache,
    )
    
    # Save to Google Drive if requested
    if args.save_drive:
        save_to_google_drive(
            model.trainer.best,
            drive_folder=args.drive_folder
        )


if __name__ == "__main__":
    main()