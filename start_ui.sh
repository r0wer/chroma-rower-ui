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
echo "Starting FastAPI server on port 8080..."
cd web_app
uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
