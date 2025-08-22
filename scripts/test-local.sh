#!/bin/bash

# Test runner pour l'environnement local

echo "🧪 Tests du PageRank Simulator (environnement local)..."

# Backend tests
echo "🐍 Tests du backend..."
cd backend

# Vérifier si l'environnement virtuel existe
if [ ! -d "venv" ]; then
    echo "❌ Environnement virtuel non trouvé. Exécutez d'abord: ./scripts/setup-local.sh"
    exit 1
fi

# Activer l'environnement virtuel
. venv/bin/activate

# Exécuter les tests
pytest tests/ -v

cd ..

echo "✅ Tests terminés!"