#!/bin/bash

# Test runner for PageRank Simulator

echo "🧪 Running PageRank Simulator Tests..."

# Backend tests
echo "🐍 Running backend tests..."
docker-compose exec backend pytest tests/ -v

# Frontend tests (if we had them)
echo "⚛️  Frontend tests would run here..."
# docker-compose exec frontend npm test

echo "✅ Tests completed!"