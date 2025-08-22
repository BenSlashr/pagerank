#!/usr/bin/env python3
"""
Script pour vérifier la progression du calcul PageRank
"""
import requests
import time
import json

def check_project_pagerank_status(project_id):
    """Vérifie le statut d'un projet et quelques exemples de PageRank"""
    
    try:
        # Vérifier quelques pages pour voir si le PageRank a été calculé
        response = requests.get(f"http://localhost:8000/api/v1/projects/{project_id}/pages", params={"limit": 5})
        
        if response.status_code == 200:
            pages = response.json()
            
            print(f"📊 Projet {project_id} - Statut PageRank:")
            
            if not pages:
                print("   ❌ Aucune page trouvée")
                return False
            
            # Vérifier si les PageRank ont été calculés (différents de 0)
            calculated_pages = [p for p in pages if p['current_pagerank'] > 0]
            
            if len(calculated_pages) == 0:
                print("   ⏳ PageRank en cours de calcul... (tous les scores à 0)")
                return False
            else:
                print(f"   ✅ PageRank calculé! {len(calculated_pages)}/{len(pages)} pages avec scores > 0")
                
                # Afficher quelques exemples
                for i, page in enumerate(pages[:3]):
                    url_short = page['url'][:50] + "..." if len(page['url']) > 50 else page['url']
                    print(f"   {i+1}. PR: {page['current_pagerank']:.8f} | {url_short}")
                
                return True
        else:
            print(f"   ❌ Erreur {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return False

def main():
    """Surveille la progression du calcul PageRank"""
    
    project_id = 3  # Projet avec liens Cuve-Expert
    
    print("🔍 Surveillance du calcul PageRank...")
    print("=" * 50)
    
    max_checks = 60  # Maximum 60 vérifications (10 minutes si check toutes les 10s)
    check_interval = 10  # Vérifier toutes les 10 secondes
    
    for i in range(max_checks):
        print(f"\n⏰ Check #{i+1} ({time.strftime('%H:%M:%S')})")
        
        if check_project_pagerank_status(project_id):
            print("\n🎉 Calcul PageRank terminé avec succès!")
            break
        
        if i < max_checks - 1:
            print(f"   ⌛ Attente {check_interval}s avant la prochaine vérification...")
            time.sleep(check_interval)
    else:
        print(f"\n⚠️  Temps d'attente dépassé après {max_checks} vérifications")
        print("   Le calcul est peut-être encore en cours...")

if __name__ == "__main__":
    main()