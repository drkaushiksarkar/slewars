#!/bin/bash

# One-line setup script for DHIS2 Disease Forecast Dashboard
# This script handles everything from dependencies to ML model training

set -e  # Exit on any error

echo "=============================================="
echo "  DHIS2 Disease Forecast Dashboard Setup"
echo "=============================================="
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    print_error "This script is optimized for macOS. You may need to adjust for your OS."
fi

# Step 1: Check PostgreSQL
print_info "Step 1/7: Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL not found. Please install PostgreSQL first."
    exit 1
fi

if ! psql -lqt | cut -d \| -f 1 | grep -qw dhis2SierraLeoneDemo; then
    print_error "Database 'dhis2SierraLeoneDemo' not found."
    print_info "Please import your DHIS2 database first."
    exit 1
fi
print_success "PostgreSQL database found"

# Step 2: Check Python
print_info "Step 2/7: Checking Python..."
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 not found. Installing via Homebrew..."
    if ! command -v brew &> /dev/null; then
        print_error "Homebrew not found. Please install Homebrew first."
        exit 1
    fi
    brew install python@3.12
fi

PYTHON_VERSION=$(python3 --version | awk '{print $2}')
print_success "Python $PYTHON_VERSION found"

# Step 3: Check Node.js and npm
print_info "Step 3/7: Checking Node.js..."
if ! command -v node &> /dev/null; then
    print_error "Node.js not found. Please install Node.js first."
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js $NODE_VERSION found"

# Step 4: Install Node dependencies
print_info "Step 4/7: Installing Node.js dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
else
    print_success "Node modules already installed"
fi
print_success "Node.js dependencies ready"

# Step 5: Setup Python ML Service
print_info "Step 5/7: Setting up ML Service..."
cd "$SCRIPT_DIR/server/ml-service"

# Check if libomp is installed (required for LightGBM on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    if ! brew list libomp &>/dev/null; then
        print_info "Installing libomp (required for LightGBM)..."
        brew install libomp
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_success "Virtual environment exists"
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
print_info "Installing Python dependencies..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
print_success "Python dependencies installed"

# Create models directory
mkdir -p models

# Step 5.5: Load climate data from ZIP files
print_info "Step 5.5/7: Loading climate data..."
if [ -d "data" ] && [ -n "$(ls -A data/*.zip 2>/dev/null)" ]; then
    print_info "Found climate data ZIP files, loading into database..."
    python3 auto_load_climate_data.py
    if [ $? -eq 0 ]; then
        print_success "Climate data loaded successfully"
    else
        print_info "Climate data load completed with warnings (check logs above)"
    fi
else
    print_info "No climate data ZIP files found in server/ml-service/data/"
    print_info "Climate data will be downloaded when needed"
fi

# Check if models exist, if not train them
print_info "Checking ML models..."
if [ ! -f "models/improved_unified_model_v3.1.pkl" ] && \
   [ ! -f "models/improved_unified_model_v3.0.pkl" ] && \
   [ ! -f "models/unified_model_v2.0.pkl" ]; then
    print_info "No models found. Training models (this may take a few minutes)..."
    python3 train_unified_model.py
    print_success "Model training complete"
else
    print_success "ML models found"
fi

cd "$SCRIPT_DIR"

# Step 6: Run database migrations
print_info "Step 6/7: Running database migrations..."
cd "$SCRIPT_DIR/server/migrations"
if [ -f "run_migrations.sh" ]; then
    ./run_migrations.sh
    print_success "Database migrations complete"
else
    print_info "Migration script not found, skipping..."
fi

cd "$SCRIPT_DIR"

# Step 7: Build server TypeScript files
print_info "Step 7/7: Building server..."
if [ -d "server/src" ]; then
    npm run server:build
    if [ $? -eq 0 ]; then
        print_success "Server build complete"
    else
        print_info "Server build completed with warnings"
    fi
else
    print_info "Server source not found, skipping build..."
fi

echo ""
echo "=============================================="
print_success "Setup Complete!"
echo "=============================================="
echo ""
echo "To start the dashboard, run:"
echo "  ${GREEN}npm run dev:full${NC}"
echo ""
echo "This will start:"
echo "  • Frontend (React) on http://localhost:3000"
echo "  • Backend API on http://localhost:4000"
echo "  • ML Service on http://localhost:8000"
echo ""
