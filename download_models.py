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

# Model URLs (correct HuggingFace links)
MODELS = [
    {
        "url": "https://huggingface.co/lodestones/Chroma1-HD/resolve/main/Chroma1-HD.safetensors",
        "filename": "Chroma1-HD.safetensors",
        "name": "Chroma1-HD"
    },
    {
        "url": "https://huggingface.co/UmeAiRT/ComfyUI-Auto_installer/resolve/df511f9f086b2f12e3a81471831ccb23969d8461/t5xxl_fp16.safetensors",
        "filename": "t5xxl_fp16.safetensors",
        "name": "T5XXL FP16"
    },
    {
        "url": "https://huggingface.co/receptektas/black-forest-labs-ae_safetensors/resolve/main/ae.safetensors",
        "filename": "ae.safetensors",
        "name": "VAE (AutoEncoder)"
    }
]

# Optional: HF Token if needed for private models
HF_TOKEN = os.environ.get("HF_TOKEN")

def download_file(url: str, dest: Path, name: str):
    """Download a file with progress bar."""
    if dest.exists():
        print(f"✓ {name} already exists at {dest.name}")
        return True
    
    print(f"⬇️  Downloading {name}...")
    
    headers = {}
    if "huggingface.co" in url and HF_TOKEN:
        headers["Authorization"] = f"Bearer {HF_TOKEN}"
    
    try:
        response = requests.get(url, stream=True, headers=headers, timeout=30)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        
        # Create parent directory if needed
        dest.parent.mkdir(parents=True, exist_ok=True)
        
        # Download with progress
        with open(dest, 'wb') as f, tqdm(
            desc=name,
            total=total_size,
            unit='iB',
            unit_scale=True,
            unit_divisor=1024,
        ) as pbar:
            for chunk in response.iter_content(chunk_size=8192):
                size = f.write(chunk)
                pbar.update(size)
        
        print(f"✓ {name} downloaded successfully.")
        return True
        
    except requests.exceptions.HTTPError as err:
        if err.response.status_code == 401:
            print(f"❌ Error: 401 Unauthorized. Model may require HF_TOKEN.")
        elif err.response.status_code == 403:
            print(f"❌ Error: 403 Forbidden. You may not have access.")
        else:
            print(f"❌ Error downloading {name}: {err}")
        if dest.exists():
            dest.unlink()
        return False
    except Exception as e:
        print(f"❌ Error downloading {name}: {e}")
        if dest.exists():
            dest.unlink()
        return False

def main():
    # Determine workspace directory (sd-scripts/workspace)
    script_dir = Path(__file__).parent
    workspace_dir = script_dir / "sd-scripts" / "workspace"
    
    print("=" * 60)
    print("=== Downloading Chroma Training Models ===")
    print("=" * 60)
    print(f"📁 Workspace: {workspace_dir}")
    print()
    
    # Ensure workspace exists
    workspace_dir.mkdir(parents=True, exist_ok=True)
    
    all_success = True
    for model in MODELS:
        dest = workspace_dir / model["filename"]
        if not download_file(model["url"], dest, model["name"]):
            all_success = False
    
    print()
    if all_success:
        print("✅ All models downloaded successfully!")
    else:
        print("⚠️  Some models failed to download.")
        sys.exit(1)
    
    print("=" * 60)

if __name__ == "__main__":
    main()
