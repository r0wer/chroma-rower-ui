#!/bin/bash

set -euo pipefail

# Activate base venv if it exists (Vast.ai specific)
if [ -f "/venv/main/bin/activate" ]; then
    . /venv/main/bin/activate
fi

cd "$WORKSPACE"

# Clone the repository if it doesn't exist
if [[ ! -d "${WORKSPACE}/chroma-trainer" ]]; then
    git clone https://github.com/r0wer/chroma-rower-ui chroma-trainer
fi

cd chroma-trainer

# Install System Dependencies
apt-get update && apt-get install -y libgl1 python3-venv python3-pip git wget nodejs npm

# Install Python Dependencies
# We will create a new venv for the app to avoid conflicts
python3 -m venv venv
source venv/bin/activate

# ============================================================================
# SETUP SD-SCRIPTS
# ============================================================================
if [ ! -d "sd-scripts" ]; then
    echo "Cloning sd-scripts..."
    git clone https://github.com/kohya-ss/sd-scripts.git
    cd sd-scripts
    git checkout sd3
    cd ..
fi

# Inject Custom Configs
echo "Injecting custom configurations..."
cp configs/train.sh sd-scripts/train.sh
chmod +x sd-scripts/train.sh

mkdir -p sd-scripts/workspace
cp configs/lora_config.toml sd-scripts/workspace/lora_config.toml

# Create necessary directories
mkdir -p sd-scripts/workspace/datasets/goal
mkdir -p sd-scripts/workspace/output/chroma_loras
mkdir -p sd-scripts/workspace/logs

# Install PyTorch (matching setup.sh)
pip install torch==2.5.1+cu121 torchvision==0.20.1+cu121 --index-url https://download.pytorch.org/whl/cu121
pip install xformers --index-url https://download.pytorch.org/whl/cu121

# Install App Requirements
pip install -r web_app/requirements.txt
pip install -r sd-scripts/requirements.txt

# Install Additional Training Dependencies
pip install prodigy-plus-schedule-free lycoris-lora requests tqdm

# Build Frontend
# Ensure Node.js is available (Vast.ai usually has nvm)
if [ -f /opt/nvm/nvm.sh ]; then
    . /opt/nvm/nvm.sh
fi

# Install Node 20 if needed
nvm install 20 || true
nvm use 20 || true

cd web_app/frontend
npm install
npm run build
cd ../..

# Create Startup Script for Supervisor
cat > /opt/supervisor-scripts/chroma-trainer.sh << 'EOL'
#!/bin/bash

kill_subprocesses() {
    local pid=$1
    local subprocesses=$(pgrep -P "$pid")
    
    for process in $subprocesses; do
        kill_subprocesses "$process"
    done
    
    if [[ -n "$subprocesses" ]]; then
        kill -TERM $subprocesses 2>/dev/null
    fi
}

cleanup() {
    kill_subprocesses $$
    sleep 2
    pkill -KILL -P $$ 2>/dev/null
    exit 0
}

trap cleanup EXIT INT TERM

# Wait for portal config
while [ ! -f "$(realpath -q /etc/portal.yaml 2>/dev/null)" ]; do
    echo "Waiting for /etc/portal.yaml..."
    sleep 1
done

echo "Starting Chroma Trainer..."

# Activate Venv
cd /workspace/chroma-trainer
source venv/bin/activate

# Start the App
./start_ui.sh 2>&1

EOL

chmod +x /opt/supervisor-scripts/chroma-trainer.sh

# Generate Supervisor Config
cat > /etc/supervisor/conf.d/chroma-trainer.conf << 'EOL'
[program:chroma-trainer]
environment=PROC_NAME="%(program_name)s"
command=/opt/supervisor-scripts/chroma-trainer.sh
autostart=true
autorestart=true
exitcodes=0
startsecs=0
stopasgroup=true
killasgroup=true
stopsignal=TERM
stopwaitsecs=10
stdout_logfile=/dev/stdout
redirect_stderr=true
stdout_events_enabled=true
stdout_logfile_maxbytes=0
stdout_logfile_backups=0
EOL

# Reload Supervisor
supervisorctl reread
supervisorctl update
