# 🚀 Déploiement PageRank Simulator sur VPS

## Configuration VPS requise

- **Docker** installé et configuré
- **Caddy** pour le reverse proxy
- Structure `/seo-tools/` existante

## 🔧 Installation

### 1. Transférer les fichiers

```bash
# Sur votre machine locale
./build.sh

# Transférer l'image Docker vers le VPS
docker save pagerank-simulator:latest | gzip > pagerank-simulator.tar.gz
scp pagerank-simulator.tar.gz user@your-vps:/seo-tools/
```

### 2. Charger l'image sur le VPS

```bash
# Sur le VPS
cd /seo-tools/
docker load < pagerank-simulator.tar.gz
```

### 3. Créer les dossiers nécessaires

```bash
mkdir -p /seo-tools/pagerank/{data,logs}
chmod 755 /seo-tools/pagerank/{data,logs}
```

### 4. Ajouter au docker-compose.yml

Dans `/seo-tools/docker-compose.yml`, ajouter :

```yaml
services:
  # ... autres services existants

  pagerank:
    image: pagerank-simulator:latest
    container_name: pagerank
    ports:
      - "8100:8000"
    volumes:
      - ./pagerank/data:/app/data
      - ./pagerank/logs:/app/logs
    environment:
      - PYTHONPATH=/app
      - DATABASE_URL=sqlite:///./data/pagerank.db
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 5. Configuration Caddy

Dans votre Caddyfile, ajouter :

```caddy
ndd.fr {
    # ... autres configurations

    # PageRank Simulator
    handle_path /pagerank/* {
        reverse_proxy localhost:8100
    }
}
```

### 6. Démarrer le service

```bash
cd /seo-tools/
docker-compose up -d pagerank
```

## 📊 Vérification

1. **Santé du conteneur** : `docker-compose logs pagerank`
2. **API accessible** : `curl http://localhost:8100/health`
3. **Frontend accessible** : Visiter `https://ndd.fr/pagerank/`

## 🔧 Structure des fichiers

```
/seo-tools/
├── docker-compose.yml          # Configuration existante + service pagerank
└── pagerank/
    ├── data/                   # Base de données SQLite
    │   └── pagerank.db
    └── logs/                   # Logs de l'application
        └── pagerank.log
```

## 🛠️ Maintenance

### Mise à jour de l'application

```bash
# Reconstruire l'image
./build.sh
docker save pagerank-simulator:latest | gzip > pagerank-simulator.tar.gz

# Sur le VPS
docker-compose stop pagerank
docker load < pagerank-simulator.tar.gz
docker-compose up -d pagerank
```

### Sauvegarde des données

```bash
# Sauvegarder la base de données
cp /seo-tools/pagerank/data/pagerank.db /backup/pagerank-$(date +%Y%m%d).db
```

### Monitoring

```bash
# Voir les logs en temps réel
docker-compose logs -f pagerank

# Status du conteneur
docker-compose ps pagerank
```

## 🌐 URLs en production

- **Frontend** : `https://ndd.fr/pagerank/`
- **API** : `https://ndd.fr/pagerank/api/v1/`
- **Health** : `https://ndd.fr/pagerank/health`
- **API Docs** : `https://ndd.fr/pagerank/docs`