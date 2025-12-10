#!/bin/bash
# Quick fix for backend module system error

set -e

echo "🔧 Fixing backend module system..."

# Go to project root
cd ~/slewars

# Stop backend
echo "Stopping backend..."
pm2 stop ewars-backend || true

# Clean build
echo "Cleaning old build..."
rm -rf server/dist

# Ensure server package.json exists
echo "Creating server/package.json..."
echo '{"type":"commonjs"}' > server/package.json

# Rebuild server with CommonJS
echo "Rebuilding server..."
npm run server:build

# Create dist package.json to force CommonJS
echo "Creating server/dist/package.json..."
echo '{"type":"commonjs"}' > server/dist/package.json

# Verify the build
echo ""
echo "Verifying compiled code..."
if grep -q "import " server/dist/index.js; then
    echo "⚠️  WARNING: Compiled code still has ES module imports!"
    echo "This might still cause issues. Checking tsconfig.json..."

    # Try alternative fix: update tsconfig to explicitly use CommonJS
    if ! grep -q '"module": "commonjs"' server/tsconfig.json; then
        echo "Updating tsconfig.json to force CommonJS..."
        sed -i 's/"module": "CommonJS"/"module": "commonjs"/g' server/tsconfig.json

        # Rebuild
        rm -rf server/dist
        npm run server:build
        echo '{"type":"commonjs"}' > server/dist/package.json
    fi
fi

# Start backend
echo ""
echo "Starting backend..."
pm2 start npm --name "ewars-backend" -- run server:start

# Wait a moment
sleep 5

# Check status
echo ""
echo "Checking status..."
pm2 status

echo ""
echo "Checking logs..."
pm2 logs ewars-backend --lines 20 --nostream

echo ""
echo "✅ Fix complete!"
echo ""
echo "If you still see errors, run: pm2 logs ewars-backend --lines 50"
