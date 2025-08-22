#!/usr/bin/env python3
"""
Script de test pour l'import des fichiers CSV Screaming Frog
"""
import requests
import sys
import os

API_BASE = "http://localhost:8000"

def test_import_csv(file_path, project_name):
    """Test l'import d'un fichier CSV"""
    
    if not os.path.exists(file_path):
        print(f"❌ Fichier introuvable: {file_path}")
        return False
    
    print(f"📁 Test d'import: {file_path}")
    print(f"📊 Projet: {project_name}")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f, 'text/csv')}
            data = {'project_name': project_name}
            
            response = requests.post(
                f"{API_BASE}/api/v1/projects/import",
                files=files,
                data=data,
                timeout=30
            )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Import réussi!")
            print(f"   - Projet ID: {result.get('project_id')}")
            print(f"   - Domaine: {result.get('domain')}")  
            print(f"   - Pages importées: {result.get('pages_imported')}")
            print(f"   - Liens importés: {result.get('links_imported')}")
            return True
        else:
            print(f"❌ Erreur {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de connexion: {e}")
        return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def main():
    print("🧪 Test d'import des fichiers Screaming Frog\n")
    
    # Test fichier 1: Pages HTML internes
    file1 = "/Users/benoit/simulation-pagerank/cuve-----interne_html.csv"
    success1 = test_import_csv(file1, "Cuve-Expert - Pages internes")
    
    print("\n" + "="*50 + "\n")
    
    # Test fichier 2: Liens sortants
    file2 = "/Users/benoit/simulation-pagerank/cuve-expert-tous_les_liens_sortants.csv"  
    success2 = test_import_csv(file2, "Cuve-Expert - Liens sortants")
    
    print("\n" + "="*50)
    print("📋 RÉSUMÉ:")
    print(f"   - Pages internes: {'✅' if success1 else '❌'}")
    print(f"   - Liens sortants: {'✅' if success2 else '❌'}")

if __name__ == "__main__":
    main()