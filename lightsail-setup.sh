#!/bin/bash

###############################################################################
# AWS Lightsail Deployment Setup Script
# This script automates the complete setup of the EWARS application
# on AWS Lightsail Ubuntu instance
###############################################################################

set -e  # Exit on error

echo "=========================================="
echo "AWS Lightsail - EWARS Platform Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    exit 1
fi

###############################################################################
# Step 1: System Update
###############################################################################
echo ""
echo "Step 1: Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y
print_success "System packages updated"

###############################################################################
# Step 2: Install Node.js 18+
###############################################################################
echo ""
echo "Step 2: Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js installed: $(node --version)"
else
    print_success "Node.js already installed: $(node --version)"
fi

###############################################################################
# Step 3: Install PostgreSQL
###############################################################################
echo ""
echo "Step 3: Installing PostgreSQL..."
if ! command -v psql &> /dev/null; then
    sudo apt-get install -y postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    print_success "PostgreSQL installed and started"
else
    print_success "PostgreSQL already installed"
fi

# Configure PostgreSQL
echo ""
print_info "Configuring PostgreSQL database..."
sudo -u postgres psql -c "CREATE USER ewars_user WITH PASSWORD 'ewars_password_2024';" 2>/dev/null || print_info "User already exists"
sudo -u postgres psql -c "CREATE DATABASE ewars_db OWNER ewars_user;" 2>/dev/null || print_info "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ewars_db TO ewars_user;" 2>/dev/null
print_success "PostgreSQL configured"

###############################################################################
# Step 4: Install Python 3 and pip
###############################################################################
echo ""
echo "Step 4: Installing Python 3..."
sudo apt-get install -y python3 python3-pip python3-venv
print_success "Python installed: $(python3 --version)"

###############################################################################
# Step 5: Install Git (if not present)
###############################################################################
echo ""
echo "Step 5: Checking Git installation..."
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
    print_success "Git installed"
else
    print_success "Git already installed: $(git --version)"
fi

###############################################################################
# Step 6: Install PM2 (Process Manager)
###############################################################################
echo ""
echo "Step 6: Installing PM2 process manager..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    print_success "PM2 installed"
else
    print_success "PM2 already installed"
fi

###############################################################################
# Step 7: Install Nginx (Reverse Proxy)
###############################################################################
echo ""
echo "Step 7: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_success "Nginx installed and started"
else
    print_success "Nginx already installed"
fi

###############################################################################
# Step 8: Install Application Dependencies
###############################################################################
echo ""
echo "Step 8: Installing application dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Node.js dependencies installed"
else
    print_error "package.json not found. Are you in the correct directory?"
    exit 1
fi

###############################################################################
# Step 9: Setup ML Service
###############################################################################
echo ""
echo "Step 9: Setting up ML service..."
if [ -d "server/ml-service" ]; then
    cd server/ml-service

    # Create virtual environment
    python3 -m venv venv
    source venv/bin/activate

    # Install dependencies
    pip install --upgrade pip
    pip install flask flask-cors pandas numpy scikit-learn scipy requests python-dotenv

    deactivate
    cd ../..
    print_success "ML service dependencies installed"
else
    print_error "ML service directory not found"
fi

###############################################################################
# Step 10: Create .env file
###############################################################################
echo ""
echo "Step 10: Creating environment configuration..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
# Server Configuration
NODE_ENV=production
PORT=4000

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=ewars_db
POSTGRES_USER=ewars_user
POSTGRES_PASSWORD=ewars_password_2024

# Data Source (postgres for DHIS2 database, synthetic for demo data)
DASHBOARD_DATA_SOURCE=postgres

# DHIS2 Configuration (Optional - configure if using DHIS2)
DHIS2_BASE_URL=
DHIS2_USERNAME=
DHIS2_PASSWORD=
DHIS2_VERIFY_SSL=false

# API Keys (Optional - add if needed)
OPENWEATHER_API_KEY=
MAPBOX_TOKEN=
ERA5_API_KEY=

# ML Service
ML_SERVICE_URL=http://localhost:8000
EOF
    print_success ".env file created"
    print_info "Please edit .env file with your configurations if needed"
else
    print_info ".env file already exists, skipping..."
fi

###############################################################################
# Step 11: Build Application
###############################################################################
echo ""
echo "Step 11: Building application..."
npm run build:full
print_success "Application built successfully"

###############################################################################
# Step 12: Configure Nginx
###############################################################################
echo ""
echo "Step 12: Configuring Nginx reverse proxy..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

sudo tee /etc/nginx/sites-available/ewars > /dev/null << EOF
server {
    listen 80;
    server_name $PUBLIC_IP;

    # Serve static files
    location / {
        root $(pwd)/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/ewars /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

print_success "Nginx configured"

###############################################################################
# Step 13: Initialize Database
###############################################################################
echo ""
echo "Step 13: Initializing database..."
npm run db:init
print_success "Database initialized"

###############################################################################
# Step 14: Setup PM2 Startup
###############################################################################
echo ""
echo "Step 14: Configuring PM2 to start on boot..."
pm2 startup systemd -u $USER --hp $HOME | grep sudo | bash || true
print_success "PM2 startup configured"

###############################################################################
# Step 15: Start Services with PM2
###############################################################################
echo ""
echo "Step 15: Starting application services..."

# Stop any existing PM2 processes
pm2 delete all 2>/dev/null || true

# Start backend server
pm2 start npm --name "ewars-backend" -- run server:start

# Start ML service
cd server/ml-service
pm2 start "venv/bin/python -m flask run --host=0.0.0.0 --port=8000" --name "ewars-ml" --interpreter none
cd ../..

# Save PM2 configuration
pm2 save

print_success "All services started with PM2"

###############################################################################
# Final Steps
###############################################################################
echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
print_success "Application is now running!"
echo ""
echo "Access URLs:"
echo "  • Frontend: http://$PUBLIC_IP"
echo "  • Backend API: http://$PUBLIC_IP/api"
echo ""
echo "Useful Commands:"
echo "  • Check status: pm2 status"
echo "  • View logs: pm2 logs"
echo "  • Restart all: pm2 restart all"
echo "  • Stop all: pm2 stop all"
echo ""
echo "Next Steps:"
echo "  1. Configure your Lightsail firewall to allow HTTP (port 80)"
echo "  2. (Optional) Set up a custom domain and SSL certificate"
echo "  3. (Optional) Edit .env file for DHIS2 or API keys"
echo ""
print_info "For SSL setup, run: sudo certbot --nginx"
echo ""
