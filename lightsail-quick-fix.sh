#!/bin/bash

###############################################################################
# AWS Lightsail Quick Fix Script
# This script fixes the module system error and data source configuration
# Run this on your Lightsail instance to fix deployment issues
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}EWARS Lightsail Quick Fix${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root directory.${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Stopping PM2 services...${NC}"
pm2 stop all || true

echo -e "${GREEN}✓ Services stopped${NC}"
echo ""

echo -e "${YELLOW}Step 2: Pulling latest changes from git...${NC}"
git pull
echo -e "${GREEN}✓ Latest code pulled${NC}"
echo ""

echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 4: Verifying server/package.json module type...${NC}"
if grep -q '"type":"module"' server/package.json; then
    echo -e "${GREEN}✓ server/package.json correctly set to ES module${NC}"
else
    echo -e "${RED}✗ server/package.json not set to module type${NC}"
    echo -e "${YELLOW}Fixing...${NC}"
    echo '{"type":"module"}' > server/package.json
    echo -e "${GREEN}✓ Fixed server/package.json${NC}"
fi
echo ""

echo -e "${YELLOW}Step 5: Building application...${NC}"
npm run build:full
echo -e "${GREEN}✓ Application built${NC}"
echo ""

echo -e "${YELLOW}Step 6: Verifying server/dist/package.json exists...${NC}"
if [ -f "server/dist/package.json" ]; then
    echo -e "${GREEN}✓ server/dist/package.json exists${NC}"
else
    echo -e "${RED}✗ server/dist/package.json not found${NC}"
    echo -e "${YELLOW}Copying...${NC}"
    cp server/package.json server/dist/package.json
    echo -e "${GREEN}✓ Copied package.json to dist${NC}"
fi
echo ""

echo -e "${YELLOW}Step 7: Checking .env configuration...${NC}"
if grep -q "DASHBOARD_DATA_SOURCE=postgres" .env; then
    echo -e "${GREEN}✓ Data source set to postgres${NC}"
else
    echo -e "${RED}✗ Data source not set to postgres${NC}"
    echo -e "${YELLOW}Please update your .env file:${NC}"
    echo -e "  1. Open .env: ${BLUE}nano .env${NC}"
    echo -e "  2. Set: ${BLUE}DASHBOARD_DATA_SOURCE=postgres${NC}"
    echo -e "  3. Verify your POSTGRES_* credentials are correct"
    echo ""
    read -p "Press Enter after updating .env file, or Ctrl+C to exit and update manually..."
fi
echo ""

echo -e "${YELLOW}Step 8: Verifying .env database configuration...${NC}"
source .env
if [ -z "$POSTGRES_HOST" ] || [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
    echo -e "${RED}✗ Database configuration incomplete${NC}"
    echo -e "${YELLOW}Required environment variables:${NC}"
    echo -e "  - POSTGRES_HOST=your-dhis2-db-host"
    echo -e "  - POSTGRES_PORT=5432"
    echo -e "  - POSTGRES_DB=your_dhis2_database"
    echo -e "  - POSTGRES_USER=your_username"
    echo -e "  - POSTGRES_PASSWORD=your_password"
    echo ""
    read -p "Press Enter after updating .env file, or Ctrl+C to exit..."
else
    echo -e "${GREEN}✓ Database configuration found:${NC}"
    echo -e "  Host: ${BLUE}$POSTGRES_HOST${NC}"
    echo -e "  Database: ${BLUE}$POSTGRES_DB${NC}"
    echo -e "  User: ${BLUE}$POSTGRES_USER${NC}"
fi
echo ""

echo -e "${YELLOW}Step 9: Testing database connection...${NC}"
if command -v psql &> /dev/null; then
    if psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Database connection successful${NC}"
    else
        echo -e "${RED}✗ Database connection failed${NC}"
        echo -e "${YELLOW}Please verify:${NC}"
        echo -e "  1. Database credentials are correct"
        echo -e "  2. Database host is accessible from this server"
        echo -e "  3. Security groups allow connections from this IP"
        echo ""
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    echo -e "${YELLOW}⚠ psql not available for connection test${NC}"
fi
echo ""

echo -e "${YELLOW}Step 10: Restarting PM2 services...${NC}"
pm2 restart all
echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

echo -e "${YELLOW}Step 11: Checking service status...${NC}"
sleep 3
pm2 status
echo ""

echo -e "${YELLOW}Step 12: Checking backend logs...${NC}"
pm2 logs ewars-backend --nostream --lines 20
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Fix Applied Successfully!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "  1. Monitor logs: ${BLUE}pm2 logs ewars-backend${NC}"
echo -e "  2. Check status: ${BLUE}pm2 status${NC}"
echo -e "  3. Test API: ${BLUE}curl http://localhost:4000/api/health${NC}"
echo -e "  4. Open in browser: ${BLUE}http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)${NC}"
echo ""
echo -e "${YELLOW}If you see any errors, check:${NC}"
echo -e "  - Backend logs: ${BLUE}pm2 logs ewars-backend --lines 50${NC}"
echo -e "  - ML logs: ${BLUE}pm2 logs ewars-ml --lines 50${NC}"
echo -e "  - Nginx logs: ${BLUE}sudo tail -f /var/log/nginx/error.log${NC}"
echo ""
