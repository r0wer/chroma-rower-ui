from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import shutil
import logging
import psutil
import subprocess
try:
    import GPUtil
except ImportError:
    GPUtil = None
from typing import List
from .services.process_manager import process_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket endpoint for terminal output
@app.websocket("/ws/terminal")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await process_manager.subscribe(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await process_manager.unsubscribe(websocket)

@app.post("/api/start-setup")
async def start_setup():
    if process_manager.running:
        return {"status": "error", "message": "Process already running"}
    
    cmd = "bash setup.sh" 
    
    try:
        await process_manager.start_process(cmd, cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        return {"status": "success", "message": "Setup started"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/upload-dataset")
async def upload_dataset(files: List[UploadFile] = File(...)):
    # Define dataset directory: chroma-trainer/sd-scripts/workspace/datasets/goal
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dataset_dir = os.path.join(root_dir, "sd-scripts", "workspace", "datasets", "goal")
    
    if not os.path.exists(dataset_dir):
        os.makedirs(dataset_dir, exist_ok=True)
    
    uploaded_files = []
    try:
        for file in files:
            file_path = os.path.join(dataset_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            uploaded_files.append(file.filename)
            
        return {"status": "success", "message": f"Uploaded {len(uploaded_files)} files to {dataset_dir}", "files": uploaded_files}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/start-training")
async def start_training():
    if process_manager.running:
        return {"status": "error", "message": "Process already running"}
    
    cmd = "cd sd-scripts && bash train.sh"
    
    try:
        await process_manager.start_process(cmd, cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        return {"status": "success", "message": "Training started"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/stop-training")
async def stop_training():
    if not process_manager.running:
        return {"status": "error", "message": "No process running"}
    
    if process_manager.stop_process():
        return {"status": "success", "message": "Process stopped"}
    else:
        return {"status": "error", "message": "Failed to stop process"}

@app.get("/api/status")
async def get_status():
    # Check if venv exists to determine if installed
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    venv_path = os.path.join(root_dir, "venv")
    
    is_installed = os.path.exists(venv_path)
    
    return {
        "running": process_manager.running,
        "installed": is_installed
    }

@app.get("/api/system-stats")
async def get_system_stats():
    # CPU
    cpu_percent = psutil.cpu_percent(interval=0.5)
    # Memory
    memory = psutil.virtual_memory()
    
    gpu_data = None
    
    # Try to get GPU stats
    try:
        # Explicitly check common WSL path first
        nvidia_smi_path = "/usr/lib/wsl/lib/nvidia-smi"
        if not os.path.exists(nvidia_smi_path):
            nvidia_smi_path = shutil.which('nvidia-smi')
            
        if not nvidia_smi_path:
            nvidia_smi_path = shutil.which('nvidia-smi.exe')
            
        if nvidia_smi_path:
            cmd = [nvidia_smi_path, '--query-gpu=name,utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits']
            # Use shell=False, capture output
            result = subprocess.check_output(cmd, encoding='utf-8', stderr=subprocess.STDOUT)
            
            # Parse output
            lines = result.strip().split('\n')
            if lines:
                parts = [x.strip() for x in lines[0].split(',')]
                if len(parts) >= 4:
                    gpu_data = {
                        "name": parts[0],
                        "utilization": float(parts[1]),
                        "memoryUsed": float(parts[2]) * 1024 * 1024,
                        "memoryTotal": float(parts[3]) * 1024 * 1024
                    }
        else:
            logger.warning("nvidia-smi not found in PATH or standard locations")
            
    except Exception as e:
        logger.error(f"Failed to get GPU stats: {e}")
        # Try to log the output of the command if it failed with CalledProcessError
        if isinstance(e, subprocess.CalledProcessError):
             logger.error(f"Command output: {e.output}")
        pass 
        
    return {
        "cpu": {
            "load": cpu_percent,
            "brand": "CPU"
        },
        "memory": {
            "used": memory.used,
            "total": memory.total,
            "available": memory.available
        },
        "gpu": gpu_data
    }

@app.get("/api/training-config")
async def get_training_config():
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    train_sh_path = os.path.join(root_dir, "sd-scripts", "train.sh")
    toml_path = os.path.join(root_dir, "sd-scripts", "workspace", "lora_config.toml")
    
    config = {
        "output_name": "chroma_lora",
        "network_dim": 16,
        "network_alpha": 1,
        "max_train_steps": 2500,
        "save_every_n_steps": 250,
        "learning_rate": 1,
        "resolution": 512,
        "num_repeats": 10
    }
    
    import re

    if os.path.exists(train_sh_path):
        try:
            with open(train_sh_path, "r") as f:
                content = f.read()
                
                def extract(key, default):
                    match = re.search(rf'--{key}[=\s]+"?([^"\s\\]+)"?', content)
                    return match.group(1) if match else default

                config["output_name"] = extract("output_name", config["output_name"])
                config["network_dim"] = int(extract("network_dim", config["network_dim"]))
                config["network_alpha"] = float(extract("network_alpha", config["network_alpha"]))
                config["max_train_steps"] = int(extract("max_train_steps", config["max_train_steps"]))
                config["save_every_n_steps"] = int(extract("save_every_n_steps", config["save_every_n_steps"]))
                config["learning_rate"] = float(extract("learning_rate", config["learning_rate"]))
        except Exception as e:
            logger.error(f"Error reading train.sh: {e}")

    if os.path.exists(toml_path):
        try:
            with open(toml_path, "r") as f:
                content = f.read()
                
                # Extract resolution = [512, 512] -> just take the first number
                # Allow for spaces: resolution = [ 512 , 512 ]
                res_match = re.search(r'resolution\s*=\s*\[\s*(\d+)', content)
                if res_match:
                    config["resolution"] = int(res_match.group(1))
                
                # Extract num_repeats = 10
                rep_match = re.search(r'num_repeats\s*=\s*(\d+)', content)
                if rep_match:
                    config["num_repeats"] = int(rep_match.group(1))
        except Exception as e:
            logger.error(f"Error reading lora_config.toml: {e}")
            
    return config

from pydantic import BaseModel

class TrainingConfig(BaseModel):
    output_name: str
    network_dim: int
    network_alpha: float
    max_train_steps: int
    save_every_n_steps: int
    learning_rate: float
    resolution: int
    num_repeats: int

@app.post("/api/training-config")
async def update_training_config(config: TrainingConfig):
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    train_sh_path = os.path.join(root_dir, "sd-scripts", "train.sh")
    toml_path = os.path.join(root_dir, "sd-scripts", "workspace", "lora_config.toml")
    
    if not os.path.exists(train_sh_path):
        return {"status": "error", "message": "train.sh not found"}
        
    try:
        import re
        
        # Update train.sh
        with open(train_sh_path, "r") as f:
            content = f.read()
            
        def replace(key, value, text):
            pattern = rf'(--{key}[=\s]+"?)([^"\s\\]+)("?)'
            def replacer(match):
                prefix = match.group(1)
                suffix = match.group(3)
                return f"{prefix}{value}{suffix}"
            return re.sub(pattern, replacer, text)

        content = replace("output_name", config.output_name, content)
        content = replace("network_dim", str(config.network_dim), content)
        content = replace("network_alpha", str(config.network_alpha), content)
        content = replace("max_train_steps", str(config.max_train_steps), content)
        content = replace("save_every_n_steps", str(config.save_every_n_steps), content)
        content = replace("learning_rate", str(config.learning_rate), content)
        
        # Update max_bucket_reso to match resolution if resolution is higher than current max_bucket_reso
        # Or simply set it to be at least the resolution.
        # The error was: max_bucket_reso must be equal or greater than resolution
        # So we should update max_bucket_reso to be at least config.resolution
        
        # Find current max_bucket_reso
        max_bucket_match = re.search(r'--max_bucket_reso[=\s]+"?(\d+)"?', content)
        if max_bucket_match:
            current_max_bucket = int(max_bucket_match.group(1))
            if config.resolution > current_max_bucket:
                content = replace("max_bucket_reso", str(config.resolution), content)
            elif config.resolution < current_max_bucket and current_max_bucket > 2048:
                 # Optional: lower it if it was very high, but safer to keep it high enough.
                 # Let's just ensure it's at least config.resolution.
                 pass
        else:
             # If not found, we might want to append it, but for now let's assume it exists as per file view
             pass
             
        # Actually, let's just always set max_bucket_reso to config.resolution if it's larger than 768 (default in script was 768)
        # Or better, just set it to config.resolution if config.resolution > 768.
        # To be safe, let's always set max_bucket_reso to match the resolution if it's > 768, 
        # or keep it at 768 if resolution is small.
        
        target_bucket_reso = max(768, config.resolution)
        content = replace("max_bucket_reso", str(target_bucket_reso), content)
        
        with open(train_sh_path, "w") as f:
            f.write(content)

        # Update lora_config.toml
        if os.path.exists(toml_path):
            with open(toml_path, "r") as f:
                toml_content = f.read()
            
            # Replace resolution = [512, 512]
            # Robust regex to handle spaces
            toml_content = re.sub(r'(resolution\s*=\s*\[\s*)(\d+)(\s*,\s*)(\d+)(\s*\])', 
                                  f"\\g<1>{config.resolution}\\g<3>{config.resolution}\\g<5>", 
                                  toml_content)
            
            # Replace num_repeats = 10
            toml_content = re.sub(r'(num_repeats\s*=\s*)(\d+)', 
                                  f"\\g<1>{config.num_repeats}", 
                                  toml_content)
                                  
            with open(toml_path, "w") as f:
                f.write(toml_content)
            
        return {"status": "success", "message": "Configuration updated"}
    except Exception as e:
        logger.error(f"Failed to update config: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/outputs")
async def list_outputs():
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    output_dir = os.path.join(root_dir, "sd-scripts", "workspace", "output", "chroma_loras")
    
    if not os.path.exists(output_dir):
        return {"files": []}
        
    files = []
    for f in os.listdir(output_dir):
        if f.endswith(".safetensors"):
            file_path = os.path.join(output_dir, f)
            stats = os.stat(file_path)
            files.append({
                "name": f,
                "size": stats.st_size,
                "modified": stats.st_mtime
            })
            
    # Sort by modified time (newest first)
    files.sort(key=lambda x: x["modified"], reverse=True)
    return {"files": files}

@app.get("/api/download/{filename}")
async def download_output(filename: str):
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    output_dir = os.path.join(root_dir, "sd-scripts", "workspace", "output", "chroma_loras")
    file_path = os.path.join(output_dir, filename)
    
    if os.path.exists(file_path):
        return FileResponse(file_path, filename=filename)
    return {"error": "File not found"}

# Dataset Management Endpoints

@app.get("/api/dataset")
async def get_dataset():
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dataset_dir = os.path.join(root_dir, "sd-scripts", "workspace", "datasets", "goal")
    
    if not os.path.exists(dataset_dir):
        return []
        
    items = []
    for f in os.listdir(dataset_dir):
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            # Found an image
            image_path = os.path.join(dataset_dir, f)
            base_name = os.path.splitext(f)[0]
            txt_path = os.path.join(dataset_dir, base_name + ".txt")
            
            caption = ""
            if os.path.exists(txt_path):
                with open(txt_path, "r", encoding="utf-8") as txt_file:
                    caption = txt_file.read()
            
            items.append({
                "name": f,
                "caption": caption,
                "has_caption": os.path.exists(txt_path)
            })
    
    # Sort by name
    items.sort(key=lambda x: x["name"])
    return items

@app.get("/api/dataset/image/{filename}")
async def get_dataset_image(filename: str):
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dataset_dir = os.path.join(root_dir, "sd-scripts", "workspace", "datasets", "goal")
    file_path = os.path.join(dataset_dir, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path)
    return {"error": "File not found"}

class CaptionUpdate(BaseModel):
    filename: str
    caption: str

@app.post("/api/dataset/caption")
async def update_caption(data: CaptionUpdate):
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    dataset_dir = os.path.join(root_dir, "sd-scripts", "workspace", "datasets", "goal")
    
    # Determine txt filename
    base_name = os.path.splitext(data.filename)[0]
    txt_path = os.path.join(dataset_dir, base_name + ".txt")
    
    try:
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(data.caption)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to update caption: {e}")
        return {"status": "error", "message": str(e)}

# Mount frontend static files
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
