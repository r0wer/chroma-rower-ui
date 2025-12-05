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
# Start the backend server on port 8080
# OPEN_BUTTON_PORT=8080 will make Vast.ai's "OPEN" button go directly to our app
python3 -m uvicorn web_app.backend.main:app --host 0.0.0.0 --port 8080 --reload
