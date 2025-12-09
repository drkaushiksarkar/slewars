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

# Create models directory if it doesn't exist
mkdir -p models

# Check if models exist, if not train them automatically
if [ ! -f "models/improved_unified_model_v3.1.pkl" ] && \
   [ ! -f "models/improved_unified_model_v3.0.pkl" ] && \
   [ ! -f "models/unified_model_v2.0.pkl" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  No ML models found - Auto-training..."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "This is a one-time setup. It may take 5-10 minutes."
    echo ""

    if [ -f "train_unified_model.py" ]; then
        python3 train_unified_model.py
        if [ $? -eq 0 ]; then
            echo ""
            echo "✓ Model training complete!"
            echo ""
        else
            echo ""
            echo "✗ Model training failed. Please check the errors above."
            echo "  You can manually train by running: python3 train_unified_model.py"
            echo ""
            exit 1
        fi
    else
        echo "✗ Training script not found. Cannot auto-train models."
        echo "  Please run: python3 train_unified_model.py"
        exit 1
    fi
fi

# Start the ML service
echo "Starting ML Service on port 8000..."
exec python main.py
