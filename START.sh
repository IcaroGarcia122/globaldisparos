#!/bin/bash
# Quick Start Scripts for Development

echo "======================================"
echo "🚀 STARTING GLOBAL DISPAROS"
echo "======================================"
echo ""

# Kill any existing node processes
echo "Cleaning up old processes..."
pkill -f "node" || true
sleep 2

echo "✅ Old processes cleaned"
echo ""

# Check if PostgreSQL is running
echo "Checking PostgreSQL..."
if sudo service postgresql status > /dev/null 2>&1; then
  echo "✅ PostgreSQL is running"
else
  echo "⚠️  PostgreSQL is not running. Starting..."
  sudo service postgresql start
fi

echo ""

# Check if Redis is running
echo "Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis is running"
else
  echo "⚠️  Redis is not running. The app will work with degraded features."
fi

echo ""
echo "======================================"
echo "Starting Backend..."
echo "======================================"

cd backend
npm run build
npm start &
BACKEND_PID=$!

echo "Backend running with PID: $BACKEND_PID"
sleep 5

# Test backend
if curl -s http://localhost:3001/health > /dev/null; then
  echo "✅ Backend is responding"
else
  echo "❌ Backend is not responding"
fi

echo ""
echo "======================================"
echo "Starting Frontend..."
echo "======================================"

cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "Frontend running with PID: $FRONTEND_PID"
sleep 3

echo ""
echo "======================================"
echo "✅ APPLICATION STARTED"
echo "======================================"
echo ""
echo "📍 Frontend:  http://localhost:5173"
echo "📍 Backend:   http://localhost:3001"
echo "📍 Health:    http://localhost:3001/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Keep running
wait
