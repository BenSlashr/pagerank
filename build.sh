#!/bin/bash

# Build script for PageRank Simulator production

echo "🚀 Building PageRank Simulator for production..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    exit 1
fi

# Build Docker image
echo "📦 Building Docker image..."
docker build -t pagerank-simulator:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "📋 To deploy on your VPS:"
    echo "1. Transfer this Docker image to your VPS"
    echo "2. Add to your docker-compose.yml in /seo-tools/:"
    echo ""
    echo "  pagerank:"
    echo "    image: pagerank-simulator:latest"
    echo "    container_name: pagerank"
    echo "    ports:"
    echo "      - \"8100:8000\""
    echo "    volumes:"
    echo "      - ./pagerank/data:/app/data"
    echo "      - ./pagerank/logs:/app/logs"
    echo "    environment:"
    echo "      - PYTHONPATH=/app"
    echo "    restart: unless-stopped"
    echo ""
    echo "3. Configure Caddy to reverse proxy:"
    echo "   ndd.fr/pagerank/* -> localhost:8100"
else
    echo "❌ Docker build failed!"
    exit 1
fi