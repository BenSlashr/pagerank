#!/usr/bin/env python3

"""
Exemple d'utilisation de la nouvelle API multi-règles
"""

import json

# Exemple de payload pour créer une simulation avec multiple règles
simulation_payload = {
    "name": "Optimisation e-commerce complète", 
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
            "source_types": ["category"],
            "source_categories": [],
            "target_types": ["product"],
            "target_categories": [],
            "selection_method": "category", 
            "links_per_page": 5,
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

# Exemple de payload pour prévisualiser des règles
preview_payload = {
    "rules": [
        {
            "source_types": ["product"],
            "target_types": ["product"],
            "selection_method": "category",
            "links_per_page": 2,
            "bidirectional": True,
            "avoid_self_links": True
        }
    ],
    "preview_count": 10
}

print("🚀 Nouvelle API Multi-Règles")
print("=" * 50)

print("\n📝 Exemple de création de simulation:")
print("POST /api/v1/projects/1/simulations")
print(json.dumps(simulation_payload, indent=2, ensure_ascii=False))

print("\n👀 Exemple de prévisualisation:")
print("POST /api/v1/projects/1/preview") 
print(json.dumps(preview_payload, indent=2, ensure_ascii=False))

print("\n🔧 Méthodes de sélection disponibles:")
print("- 'category': Même catégorie")
print("- 'semantic': Proximité sémantique") 
print("- 'random': Aléatoire")
print("- 'pagerank': Par PageRank")

print("\n✨ Avantages du nouveau système:")
print("- ✅ Règles multiples cumulatives")
print("- ✅ Filtres source ET cible") 
print("- ✅ Différentes stratégies de sélection")
print("- ✅ Configuration granulaire par règle")
print("- ✅ Prévisualisation avant application")

print("\nReady to go! 🎉")