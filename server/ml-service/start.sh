#!/bin/bash

# Start script for ML Service
# This script activates the virtual environment and starts the FastAPI server

cd "$(dirname "$0")"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Please run setup.sh first."
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "Dependencies not installed. Installing..."
    pip install -q -r requirements.txt
fi

# Start the ML service
echo "Starting ML Service on port 8000..."
exec python main.py
