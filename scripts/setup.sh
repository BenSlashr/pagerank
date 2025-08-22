#!/bin/bash

# PageRank Simulator Setup Script

echo "🚀 Setting up PageRank Simulator..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/data
mkdir -p frontend/dist

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose up -d --build

echo "⏳ Waiting for services to start..."
sleep 30

# Check if services are healthy
echo "🔍 Checking service health..."

# Check backend
if curl -f -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend health check failed"
fi

# Check frontend
if curl -f -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is healthy"
else
    echo "❌ Frontend health check failed"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Services:"
echo "   Backend API: http://localhost:8000"
echo "   Frontend UI: http://localhost:3000"
echo "   API Docs:    http://localhost:8000/docs"
echo ""
echo "🔧 Commands:"
echo "   View logs:   docker-compose logs -f"
echo "   Stop:        docker-compose down"
echo "   Restart:     docker-compose restart"
echo ""