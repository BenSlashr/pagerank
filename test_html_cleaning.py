#!/usr/bin/env python3

"""
Script de test pour valider la fonctionnalité de nettoyage HTML
"""

import sys
import os
import pandas as pd

# Ajouter le répertoire backend au path Python
sys.path.append('/Users/benoit/simulation-pagerank/backend')

from app.services.import_service import ImportService

def test_html_cleaning():
    """Test de la fonction de nettoyage HTML"""
    
    # Créer une instance d'ImportService (sans repos pour ce test)
    service = ImportService(None, None, None)
    
    print("🧪 TEST DE NETTOYAGE HTML")
    print("=" * 60)
    
    # Test 1: Contenu HTML basique
    test_html = """<div><span class="text-green"><strong>L'espèce</strong></span></div>

<p>Le <strong>sainfoin </strong>est une <strong>espèce mellifère</strong> et <strong>rustique très intéressante</strong>. Elle est <strong>très tolérante à la sécheresse</strong> et <strong>au gel</strong>.</p>"""
    
    cleaned = service._clean_html_content(test_html)
    print(f"📝 Test 1 - Contenu HTML basique:")
    print(f"Original: {test_html[:100]}...")
    print(f"Nettoyé: {cleaned}")
    print()
    
    # Test 2: HTML avec entités
    test_entities = """<p>Test avec entit&eacute;s: &amp; &lt; &gt; &quot; &#39; &nbsp;</p>"""
    cleaned_entities = service._clean_html_content(test_entities)
    print(f"📝 Test 2 - Entités HTML:")
    print(f"Original: {test_entities}")
    print(f"Nettoyé: {cleaned_entities}")
    print()
    
    # Test 3: Contenu avec script (dangereux)
    test_script = """<div>Contenu normal <script>alert('hack');</script> suite du contenu</div>"""
    cleaned_script = service._clean_html_content(test_script)
    print(f"📝 Test 3 - Script dangereux:")
    print(f"Original: {test_script}")
    print(f"Nettoyé: {cleaned_script}")
    print()
    
    # Test 4: Lire le fichier CSV réel
    csv_path = "/Users/benoit/simulation-pagerank/FContenu fiche produit agryco - query_result_2025-08-14T14_50_52.830017Z.csv"
    
    if os.path.exists(csv_path):
        print(f"📂 Test 4 - Lecture du fichier CSV réel:")
        try:
            df = pd.read_csv(csv_path)
            print(f"   Lignes: {len(df)}, Colonnes: {len(df.columns)}")
            print(f"   Colonnes: {list(df.columns)}")
            
            if 'long_text' in df.columns and len(df) > 0:
                original_content = df['long_text'].iloc[0]
                cleaned_content = service._clean_html_content(original_content)
                
                print(f"\n   Original (premiers 200 caractères):")
                print(f"   {str(original_content)[:200]}...")
                print(f"\n   Nettoyé (premiers 200 caractères):")
                print(f"   {cleaned_content[:200]}...")
                
                print(f"\n   Statistiques:")
                print(f"   - Taille originale: {len(str(original_content))} caractères")
                print(f"   - Taille nettoyée: {len(cleaned_content)} caractères")
                print(f"   - Réduction: {((len(str(original_content)) - len(cleaned_content)) / len(str(original_content)) * 100):.1f}%")
                
        except Exception as e:
            print(f"   ❌ Erreur lors de la lecture: {e}")
    else:
        print(f"   ❌ Fichier CSV non trouvé: {csv_path}")
    
    print("\n✅ Tests terminés!")

if __name__ == "__main__":
    test_html_cleaning()