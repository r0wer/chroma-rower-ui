#!/usr/bin/env python3
"""
Download required models for Chroma LoRA training.
Downloads from HuggingFace with progress display.
"""

import os
import sys
import requests
from pathlib import Path
from tqdm import tqdm

# Model URLs (HuggingFace)
MODELS = {
    "Chroma1-HD.safetensors": "https://huggingface.co/lodestone-horizon/chroma-weights/resolve/main/chroma1-hd.safetensors",
    "t5xxl_fp16.safetensors": "https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors",
    "ae.safetensors": "https://huggingface.co/cocktailpeanut/xulf-d/resolve/main/ae.safetensors",
}

def download_file(url: str, dest: Path, desc: str = None):
    """Download a file with progress bar."""
    if dest.exists():
        print(f"✓ Already exists: {dest.name}")
        return True
    
    print(f"⬇️  Downloading: {desc or dest.name}")
    
    try:
        response = requests.get(url, stream=True, timeout=30)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        
        # Create parent directory if needed
        dest.parent.mkdir(parents=True, exist_ok=True)
        
        # Download with progress
        with open(dest, 'wb') as f, tqdm(
            desc=dest.name,
            total=total_size,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
        ) as pbar:
            for chunk in response.iter_content(chunk_size=8192):
                size = f.write(chunk)
                pbar.update(size)
        
        print(f"✓ Downloaded: {dest.name}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to download {dest.name}: {e}")
        if dest.exists():
            dest.unlink()
        return False

def main():
    # Determine workspace directory
    script_dir = Path(__file__).parent
    workspace_dir = script_dir / "workspace"
    
    print("=" * 60)
    print("=== Downloading Chroma Training Models ===")
    print("=" * 60)
    print(f"📁 Workspace: {workspace_dir}")
    print()
    
    # Ensure workspace exists
    workspace_dir.mkdir(parents=True, exist_ok=True)
    
    all_success = True
    for filename, url in MODELS.items():
        dest = workspace_dir / filename
        if not download_file(url, dest, filename):
            all_success = False
    
    print()
    if all_success:
        print("✅ All models downloaded successfully!")
    else:
        print("⚠️  Some models failed to download. Please check your internet connection.")
        sys.exit(1)
    
    print("=" * 60)

if __name__ == "__main__":
    main()
