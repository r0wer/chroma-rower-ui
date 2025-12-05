#!/bin/bash

# Ensure we are in the right directory
cd "$(dirname "$0")"

echo "Starting Chroma Trainer Web UI..."

# Create venv if not exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install python dependencies
echo "Installing backend dependencies..."
pip install -r web_app/requirements.txt

# Start the backend server
echo "Starting FastAPI server on port 1111..."
# Start the backend server
# We use port 1111 to match the standard "Instance Portal" port on Vast.ai templates (like Ostris)
python3 -m uvicorn web_app.backend.main:app --host 0.0.0.0 --port 1111 --reload
