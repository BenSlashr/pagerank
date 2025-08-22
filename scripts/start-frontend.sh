#!/bin/bash

# Script pour démarrer le frontend en local

echo "⚛️  Démarrage du frontend PageRank Simulator..."

cd frontend

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "❌ Dépendances non installées. Exécutez d'abord: ./scripts/setup-local.sh"
    exit 1
fi

echo "🚀 Démarrage du serveur de développement Vite..."
echo "   URL: http://localhost:3000"
echo "   Arrêt: Ctrl+C"
echo ""

# Démarrer le serveur de développement
npm run dev