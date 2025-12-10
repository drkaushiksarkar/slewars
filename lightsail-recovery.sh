#!/bin/bash

###############################################################################
# Lightsail Recovery Script
# This restores the working CommonJS configuration
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}EWARS Lightsail Recovery${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Not in project directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Restoring correct configuration...${NC}"
echo '{"type":"commonjs"}' > server/package.json
echo -e "${GREEN}✓ server/package.json set to commonjs (correct for your setup)${NC}"
echo ""

echo -e "${YELLOW}Step 2: Stopping services...${NC}"
pm2 stop all
echo -e "${GREEN}✓ Services stopped${NC}"
echo ""

echo -e "${YELLOW}Step 3: Cleaning old build...${NC}"
rm -rf server/dist
echo -e "${GREEN}✓ Old build removed${NC}"
echo ""

echo -e "${YELLOW}Step 4: Rebuilding with correct settings...${NC}"
npm run server:build
echo -e "${GREEN}✓ Backend rebuilt${NC}"
echo ""

echo -e "${YELLOW}Step 5: Verifying server/dist/package.json...${NC}"
if [ -f "server/dist/package.json" ]; then
    CONTENT=$(cat server/dist/package.json)
    echo "Content: $CONTENT"
    if [[ "$CONTENT" == *"commonjs"* ]]; then
        echo -e "${GREEN}✓ Correct: commonjs${NC}"
    else
        echo -e "${YELLOW}⚠ package.json exists but doesn't specify commonjs${NC}"
        echo -e "${YELLOW}Creating it...${NC}"
        echo '{"type":"commonjs"}' > server/dist/package.json
    fi
else
    echo -e "${YELLOW}⚠ server/dist/package.json doesn't exist, creating...${NC}"
    echo '{"type":"commonjs"}' > server/dist/package.json
    echo -e "${GREEN}✓ Created${NC}"
fi
echo ""

echo -e "${YELLOW}Step 6: Verifying .env data source...${NC}"
if grep -q "DASHBOARD_DATA_SOURCE=postgres" .env; then
    echo -e "${GREEN}✓ Using postgres data source${NC}"
else
    echo -e "${RED}✗ Data source not set to postgres${NC}"
    echo -e "${YELLOW}Update your .env: DASHBOARD_DATA_SOURCE=postgres${NC}"
fi
echo ""

echo -e "${YELLOW}Step 7: Clearing old PM2 logs...${NC}"
pm2 flush
echo -e "${GREEN}✓ Old error logs cleared${NC}"
echo ""

echo -e "${YELLOW}Step 8: Restarting services...${NC}"
pm2 restart all
echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

echo -e "${YELLOW}Step 9: Waiting for startup...${NC}"
sleep 5
echo ""

echo -e "${YELLOW}Step 10: Checking status...${NC}"
pm2 status
echo ""

echo -e "${YELLOW}Step 11: Recent logs...${NC}"
pm2 logs ewars-backend --nostream --lines 20
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Recovery Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if pm2 logs ewars-backend --nostream --lines 10 | grep -qi "listening\|started"; then
    echo -e "${GREEN}✓ Backend is running!${NC}"
    echo -e "${GREEN}✓ System restored to working state${NC}"
    echo ""
    echo "Access your dashboard at:"
    echo "  ${BLUE}http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo 'your-lightsail-ip')${NC}"
else
    echo -e "${YELLOW}⚠ Backend might still be starting${NC}"
    echo ""
    echo "Monitor with:"
    echo "  ${BLUE}pm2 logs ewars-backend${NC}"
fi
echo ""
