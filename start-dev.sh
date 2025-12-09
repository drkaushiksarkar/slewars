#!/bin/bash

# Simple development startup script
# Runs services in separate terminal tabs/windows

echo "==================================="
echo "Starting Development Environment"
echo "==================================="

# Check if backend is already running
if lsof -ti:4000 > /dev/null 2>&1; then
    echo "⚠️  Port 4000 already in use. Killing existing process..."
    kill $(lsof -ti:4000) 2>/dev/null
    sleep 2
fi

# Check if frontend is already running
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Port 3000 already in use. Killing existing process..."
    kill $(lsof -ti:3000) 2>/dev/null
    sleep 2
fi

# Check if ML service is already running
if lsof -ti:8000 > /dev/null 2>&1; then
    echo "⚠️  Port 8000 already in use. Killing existing process..."
    kill $(lsof -ti:8000) 2>/dev/null
    sleep 2
fi

echo ""
echo "Step 1: Starting Node.js Backend API (port 4000)..."
echo "----------------------------------------"
npm run server:dev > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:4000/api/health > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "Step 2: Starting React Frontend (port 3000)..."
echo "----------------------------------------"
npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "Step 3: Starting Python ML Service (port 8000)..."
echo "----------------------------------------"
cd server/ml-service
if [ -d "venv" ]; then
    source venv/bin/activate
    python main.py > ../../logs/ml-service.log 2>&1 &
    ML_PID=$!
    cd ../..
    echo "ML Service started with PID: $ML_PID"
else
    echo "❌ Virtual environment not found. Run: cd server/ml-service && ./setup.sh"
    cd ../..
fi

echo ""
echo "==================================="
echo "✅ All services started!"
echo "==================================="
echo ""
echo "Access the application:"
echo "  Frontend: http://localhost:3000"
echo "  Backend API: http://localhost:4000"
echo "  ML Service: http://localhost:8000"
echo ""
echo "View logs:"
echo "  tail -f logs/backend.log"
echo "  tail -f logs/frontend.log"
echo "  tail -f logs/ml-service.log"
echo ""
echo "To stop all services:"
echo "  kill $BACKEND_PID $FRONTEND_PID $ML_PID"
echo ""
echo "Or simply close this terminal"
echo ""
