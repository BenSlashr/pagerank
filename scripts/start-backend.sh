#!/bin/bash

# Script pour démarrer le backend en local

echo "🐍 Démarrage du backend PageRank Simulator..."

cd backend

# Vérifier si l'environnement virtuel existe
if [ ! -d "venv" ]; then
    echo "❌ Environnement virtuel non trouvé. Exécutez d'abord: ./scripts/setup-local.sh"
    exit 1
fi

# Activer l'environnement virtuel
echo "🔄 Activation de l'environnement virtuel..."
. venv/bin/activate

# Créer le répertoire data si nécessaire
mkdir -p data

echo "🚀 Démarrage du serveur FastAPI..."
echo "   URL: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo "   Arrêt: Ctrl+C"
echo ""

# Démarrer le serveur
uvicorn main:app --host 0.0.0.0 --port 8000 --reload