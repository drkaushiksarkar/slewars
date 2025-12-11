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
# Step 0: Check Prerequisites
###############################################################################
echo ""
echo "Step 0: Checking prerequisites..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_info "Creating template .env file. Please edit it with your actual values."
    cat > .env << 'EOF'
# Server Configuration
NODE_ENV=production
PORT=4000

# Database Configuration - UPDATE THESE WITH YOUR DHIS2 DATABASE CREDENTIALS
POSTGRES_HOST=your-dhis2-db.region.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=your_dhis2_database_name
POSTGRES_USER=your_username
POSTGRES_PASSWORD=your_password

# Data Source (postgres for DHIS2 database, synthetic for demo data)
DASHBOARD_DATA_SOURCE=postgres

# DHIS2 Configuration (Optional)
DHIS2_BASE_URL=
DHIS2_USERNAME=
DHIS2_PASSWORD=
DHIS2_VERIFY_SSL=false

# API Keys (Optional)
OPENWEATHER_API_KEY=
MAPBOX_TOKEN=
ERA5_API_KEY=

# ML Service
ML_SERVICE_URL=http://localhost:8000
EOF
    print_error "Please edit the .env file with your database credentials, then run this script again."
    exit 1
else
    print_success ".env file found"
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
# Step 3: Install PostgreSQL Client Tools
###############################################################################
echo ""
echo "Step 3: Installing PostgreSQL client tools..."
if ! command -v psql &> /dev/null; then
    sudo apt-get install -y postgresql-client
    print_success "PostgreSQL client installed"
else
    print_success "PostgreSQL client already installed"
fi

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
# Step 8: Fix Permissions
###############################################################################
echo ""
echo "Step 8: Setting up proper permissions..."
# Fix home directory permissions for Nginx access
chmod +x /home/ubuntu || chmod +x $HOME
print_success "Home directory permissions set"

###############################################################################
# Step 9: Configure Backend Module System
###############################################################################
echo ""
echo "Step 9: Configuring backend module system..."
# Create CommonJS package.json files for server directories
echo '{"type":"commonjs"}' > server/package.json
mkdir -p server/dist
echo '{"type":"commonjs"}' > server/dist/package.json
print_success "Backend module system configured for CommonJS"

###############################################################################
# Step 10: Install Application Dependencies
###############################################################################
echo ""
echo "Step 10: Installing application dependencies..."
if [ -f "package.json" ]; then
    npm install
    print_success "Node.js dependencies installed"
else
    print_error "package.json not found. Are you in the correct directory?"
    exit 1
fi

###############################################################################
# Step 11: Setup ML Service
###############################################################################
echo ""
echo "Step 11: Setting up ML service..."
if [ -d "server/ml-service" ]; then
    cd server/ml-service

    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi

    source venv/bin/activate

    # Install dependencies with specific versions
    pip install --upgrade pip
    pip install -r requirements.txt

    # Ensure scikit-learn is up to date
    pip install --upgrade scikit-learn

    deactivate
    cd ../..
    print_success "ML service dependencies installed"
else
    print_error "ML service directory not found"
fi

###############################################################################
# Step 12: Build Application
###############################################################################
echo ""
echo "Step 12: Building application..."
npm run build:full
print_success "Application built successfully"

# Fix dist permissions for Nginx
chmod -R 755 dist
print_success "Build output permissions set"

# Verify backend build
if [ -f "server/dist/index.js" ]; then
    print_success "Backend compiled successfully"
else
    print_error "Backend compilation failed"
    exit 1
fi

###############################################################################
# Step 13: Configure Nginx
###############################################################################
echo ""
echo "Step 13: Configuring Nginx reverse proxy..."
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo "localhost")

sudo tee /etc/nginx/sites-available/ewars > /dev/null << EOF
server {
    listen 80;
    server_name $PUBLIC_IP _;

    # Serve static files
    location / {
        root $(pwd)/dist;
        try_files \$uri \$uri/ /index.html;
        index index.html;
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

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx

print_success "Nginx configured and reloaded"

###############################################################################
# Step 14: Setup PM2 Startup
###############################################################################
echo ""
echo "Step 14: Configuring PM2 to start on boot..."
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null | grep "sudo" | bash || true
print_success "PM2 startup configured"

###############################################################################
# Step 15: Clean PM2 Logs and Processes
###############################################################################
echo ""
echo "Step 15: Cleaning up old PM2 processes..."
pm2 delete all 2>/dev/null || true
rm -rf ~/.pm2/logs/* 2>/dev/null || true
rm -rf ~/.pm2/pids/* 2>/dev/null || true
print_success "PM2 cleaned"

###############################################################################
# Step 16: Start Services with PM2
###############################################################################
echo ""
echo "Step 16: Starting application services..."

# Start backend server
pm2 start npm --name "ewars-backend" -- run server:start
print_success "Backend service started"

# Start ML service with main.py
cd server/ml-service
pm2 start venv/bin/python --name "ewars-ml" -- main.py
cd ../..
print_success "ML service started"

# Save PM2 configuration
pm2 save
print_success "PM2 configuration saved"

###############################################################################
# Step 17: Wait and Verify Services
###############################################################################
echo ""
echo "Step 17: Verifying services are running..."
sleep 5

pm2 status

# Check if services are online
BACKEND_STATUS=$(pm2 jlist | grep -o '"name":"ewars-backend".*"status":"[^"]*"' | grep -o 'online' || echo "")
ML_STATUS=$(pm2 jlist | grep -o '"name":"ewars-ml".*"status":"[^"]*"' | grep -o 'online' || echo "")

if [ "$BACKEND_STATUS" = "online" ]; then
    print_success "Backend service is running"
else
    print_error "Backend service failed to start. Check logs with: pm2 logs ewars-backend"
fi

if [ "$ML_STATUS" = "online" ]; then
    print_success "ML service is running"
else
    print_error "ML service failed to start. Check logs with: pm2 logs ewars-ml"
fi

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
echo "  • Health Check: http://$PUBLIC_IP/api/health"
echo ""
echo "Useful Commands:"
echo "  • Check status: pm2 status"
echo "  • View logs: pm2 logs"
echo "  • View backend logs: pm2 logs ewars-backend"
echo "  • View ML logs: pm2 logs ewars-ml"
echo "  • Restart all: pm2 restart all"
echo "  • Stop all: pm2 stop all"
echo "  • Clear logs: pm2 flush"
echo ""
echo "Verify Services:"
echo "  • Backend health: curl http://localhost:4000/api/health"
echo "  • Through Nginx: curl http://localhost/api/health"
echo ""
echo "Next Steps:"
echo "  1. Configure your Lightsail firewall to allow HTTP (port 80)"
echo "  2. Test the application in your browser at http://$PUBLIC_IP"
echo "  3. (Optional) Set up a custom domain and SSL certificate"
echo "  4. (Optional) Configure monitoring and backups"
echo ""
print_info "For SSL setup with a domain, run: sudo certbot --nginx -d yourdomain.com"
echo ""
