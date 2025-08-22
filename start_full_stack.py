#!/usr/bin/env python3

"""
Script pour démarrer le stack complet frontend + backend
"""

import subprocess
import threading
import time
import sys
import os

def start_backend():
    """Démarre le serveur FastAPI"""
    print("🚀 Démarrage du backend...")
    os.chdir("backend")
    subprocess.run([
        "python3", "-m", "uvicorn", "main:app", 
        "--reload", "--host", "0.0.0.0", "--port", "8000"
    ])

def start_frontend():
    """Démarre le serveur Vite"""
    print("🎨 Démarrage du frontend...")
    time.sleep(3)  # Attendre que le backend démarre
    os.chdir("frontend")
    subprocess.run(["npm", "run", "dev"])

def main():
    print("🏁 Démarrage du stack complet PageRank Simulator")
    print("=" * 60)
    print("Backend: http://localhost:8000")
    print("Frontend: http://localhost:5173")
    print("=" * 60)
    
    # Démarrer les deux serveurs en parallèle
    backend_thread = threading.Thread(target=start_backend, daemon=True)
    frontend_thread = threading.Thread(target=start_frontend, daemon=True)
    
    backend_thread.start()
    frontend_thread.start()
    
    try:
        # Attendre indéfiniment
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 Arrêt des serveurs...")
        sys.exit(0)

if __name__ == "__main__":
    main()