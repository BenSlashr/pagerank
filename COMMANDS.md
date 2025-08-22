# Commandes Utiles - PageRank Simulator

## 🚀 Démarrage Rapide

```bash
# Configuration initiale (une seule fois)
./scripts/setup-local.sh

# Démarrage des services (2 terminaux)
./scripts/start-backend.sh    # Terminal 1
./scripts/start-frontend.sh   # Terminal 2
```

## 🧪 Tests

```bash
# Tests du backend
./scripts/test-local.sh

# Tests manuels
cd backend
. venv/bin/activate
pytest tests/ -v
```

## 🐍 Backend (Port 8000)

```bash
# Démarrer le backend
cd backend
. venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Installer une nouvelle dépendance
cd backend
./venv/bin/pip install nouvelle-dependance
./venv/bin/pip freeze > requirements.txt
```

## ⚛️ Frontend (Port 3000)

```bash
# Démarrer le frontend
cd frontend
npm run dev

# Installer une nouvelle dépendance
cd frontend
npm install nouvelle-dependance
```

## 📊 URLs Importantes

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Documentation API**: http://localhost:8000/docs
- **Redoc**: http://localhost:8000/redoc

## 🔧 Maintenance

```bash
# Recréer l'environnement virtuel
rm -rf backend/venv
cd backend
python3 -m venv venv
. venv/bin/activate
pip install -r requirements.txt

# Nettoyer le frontend
cd frontend
rm -rf node_modules
npm install

# Voir les logs du backend
./scripts/start-backend.sh  # Les logs s'affichent directement
```

## 📝 Développement

```bash
# Structure des fichiers importants
backend/app/core/rules/templates/     # Nouvelles règles de linking
backend/app/api/v1/endpoints/         # Nouveaux endpoints
frontend/src/components/              # Nouveaux composants React
frontend/src/pages/                   # Nouvelles pages

# Ajouter une nouvelle règle
1. Créer backend/app/core/rules/templates/ma_regle.py
2. Suivre le pattern des règles existantes
3. Utiliser @register_rule("ma_regle")

# Ajouter un nouveau endpoint
1. Créer backend/app/api/v1/endpoints/mon_endpoint.py  
2. L'ajouter dans backend/app/api/v1/__init__.py
```

## 🐛 Dépannage

```bash
# Problème de port occupé
lsof -ti:8000 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend

# Problème de dépendances Python
cd backend
rm -rf venv __pycache__ .pytest_cache
./scripts/setup-local.sh

# Problème de dépendances Node
cd frontend  
rm -rf node_modules package-lock.json
npm install
```