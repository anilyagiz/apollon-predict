#!/bin/bash
# Quick start script for Apollon Oracle

echo "🚀 Apollon Oracle Quick Start"
echo "==============================="
echo ""
echo "This script will start the Apollon Oracle API server."
echo ""

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON=python3
elif command -v python &> /dev/null; then
    PYTHON=python
else
    echo "❌ Python not found. Please install Python 3.11+"
    exit 1
fi

echo "✓ Python found: $($PYTHON --version)"

# Navigate to API directory
cd backend/api || exit

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    $PYTHON -m venv venv
fi

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null

# Install dependencies
echo "📥 Installing dependencies..."
pip install -q fastapi uvicorn pydantic pandas numpy aiohttp 2>/dev/null || echo "Some packages may already be installed"

# Start server
echo ""
echo "🚀 Starting API server..."
echo "   API will be available at: http://localhost:8000"
echo "   Health check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop"
echo "==============================="
echo ""

$PYTHON server.py
