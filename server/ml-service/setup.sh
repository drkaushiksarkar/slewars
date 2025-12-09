#!/bin/bash

# Setup script for ML Service

echo "Setting up Disease Forecasting ML Service..."

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create models directory
echo "Creating models directory..."
mkdir -p models

# Copy .env.example to .env if .env doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env
    echo "Please update .env file with your configuration"
fi

echo ""
echo "Setup complete!"
echo ""
echo "To start the ML service:"
echo "  1. Activate virtual environment: source venv/bin/activate"
echo "  2. Run the service: python main.py"
echo ""
echo "Or use uvicorn directly:"
echo "  uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
