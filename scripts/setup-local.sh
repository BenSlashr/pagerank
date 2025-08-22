#!/bin/bash

# PageRank Simulator Local Setup (sans Docker)

echo "🚀 Configuration locale du PageRank Simulator..."

# Vérifier Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 est requis mais non installé."
    exit 1
fi

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js est requis mais non installé."
    exit 1
fi

# Backend setup
echo "🐍 Configuration du backend..."
cd backend

# Créer environnement virtuel
echo "📦 Création de l'environnement virtuel..."
python3 -m venv venv

# Activer environnement virtuel
echo "🔄 Activation de l'environnement virtuel..."
. venv/bin/activate

# Installer les dépendances
echo "📥 Installation des dépendances Python..."
pip install --upgrade pip
pip install -r requirements.txt

# Créer le répertoire data
mkdir -p data

echo "✅ Backend configuré"

# Retour au répertoire racine
cd ..

# Frontend setup
echo "⚛️  Configuration du frontend..."
cd frontend

# Installer les dépendances
echo "📥 Installation des dépendances Node.js..."
npm install

echo "✅ Frontend configuré"

# Retour au répertoire racine
cd ..

echo ""
echo "🎉 Configuration terminée!"
echo ""
echo "📋 Pour démarrer l'application:"
echo "   Terminal 1 (Backend):"
echo "     cd backend"
echo "     source venv/bin/activate"
echo "     uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
echo ""
echo "   Terminal 2 (Frontend):"
echo "     cd frontend" 
echo "     npm run dev"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""