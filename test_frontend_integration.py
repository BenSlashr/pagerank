#!/usr/bin/env python3

"""
Test d'intégration frontend-backend pour les règles multiples
"""

import requests
import json

def test_multi_rule_api():
    """Test l'API de simulation avec règles multiples"""
    
    # Configuration
    base_url = "http://localhost:8000/api/v1"
    project_id = 1  # Supposons qu'on a un projet avec ID 1
    
    print("🧪 Test d'intégration Frontend-Backend")
    print("=" * 50)
    
    # Test 1: Créer une simulation avec règles multiples
    print("\n1. Test création simulation multi-règles...")
    
    simulation_data = {
        "name": "Test Frontend Integration",
        "rules": [
            {
                "source_types": ["product"],
                "source_categories": [],
                "target_types": ["product"],
                "target_categories": [],
                "selection_method": "category",
                "links_per_page": 3,
                "bidirectional": False,
                "avoid_self_links": True
            },
            {
                "source_types": ["blog"],
                "source_categories": [],
                "target_types": ["product"],
                "target_categories": [],
                "selection_method": "semantic",
                "links_per_page": 2,
                "bidirectional": False,
                "avoid_self_links": True
            }
        ]
    }
    
    try:
        response = requests.post(
            f"{base_url}/projects/{project_id}/simulations",
            json=simulation_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Simulation créée avec succès!")
            print(f"   ID: {result.get('simulation_id')}")
            print(f"   Nouveaux liens: {result.get('new_links_count')}")
        else:
            print(f"❌ Erreur création: {response.status_code}")
            print(f"   Détail: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter au backend")
        print("   Vérifiez que le serveur FastAPI tourne sur localhost:8000")
        return False
    
    # Test 2: Preview des règles multiples
    print("\n2. Test preview règles multiples...")
    
    preview_data = {
        "rules": simulation_data["rules"],
        "preview_count": 5
    }
    
    try:
        response = requests.post(
            f"{base_url}/projects/{project_id}/preview",
            json=preview_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Preview réussi!")
            print(f"   Règles appliquées: {result.get('rules_applied')}")
            print(f"   Liens total: {result.get('total_new_links')}")
            print(f"   Aperçu: {len(result.get('preview_links', []))} liens")
        else:
            print(f"❌ Erreur preview: {response.status_code}")
            print(f"   Détail: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur preview: {str(e)}")
    
    # Test 3: Liste des simulations
    print("\n3. Test liste simulations...")
    
    try:
        response = requests.get(f"{base_url}/projects/{project_id}/simulations")
        
        if response.status_code == 200:
            simulations = response.json()
            print(f"✅ {len(simulations)} simulations trouvées")
            for sim in simulations[-3:]:  # Dernières 3
                rules_count = len(sim.get('rules', []))
                print(f"   - {sim['name']}: {rules_count} règles, status: {sim['status']}")
        else:
            print(f"❌ Erreur liste: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur liste: {str(e)}")
    
    print("\n" + "=" * 50)
    print("Test terminé!")
    
    return True

if __name__ == "__main__":
    test_multi_rule_api()