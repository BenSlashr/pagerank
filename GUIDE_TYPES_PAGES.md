# Guide : Types de pages personnalisables

## Vue d'ensemble

Le PageRank Simulator Tool utilise désormais la colonne **"Segments"** de Screaming Frog pour définir des types de pages entièrement personnalisables. Cette approche vous permet de créer des simulations plus précises et adaptées à votre site.

## Configuration requise

### 1. Colonne Segments obligatoire
- La colonne "Segments" doit être présente et renseignée pour **toutes les pages**
- Aucune page ne peut avoir un segment vide
- Les types seront utilisés tels quels pour les simulations

### 2. Configuration dans Screaming Frog

#### Étape 1 : Définir vos types de pages
Exemples pour un site e-commerce :
- `Produit` - Pages produits
- `Catégorie` - Pages catégories  
- `Blog` - Articles de blog
- `Filtre` - Pages de filtres produits
- `CMS` - Pages statiques
- `Homepage` - Page d'accueil

#### Étape 2 : Configurer les segments dans Screaming Frog
1. Aller dans **Configuration > Custom > Segments**
2. Créer vos segments personnalisés
3. Utiliser des règles basées sur :
   - URL patterns (ex: `/produit/`, `/categorie/`)
   - H1 content
   - Title patterns
   - Custom regex

#### Exemples de règles de segments :

```
Segment: Produit
Rule: URL Contains "/produit/" OR URL Contains ".html" (si structure produit)

Segment: Catégorie  
Rule: URL Contains "/categorie/" OR H1 Contains "Gamme" OR H1 Contains "Collection"

Segment: Blog
Rule: URL Contains "/blog/" OR URL Contains "/actualites/"

Segment: Filtre
Rule: URL Contains "?" OR URL Contains "filter" OR URL Contains "tri="
```

## Avantages des types personnalisables

### 1. Simulations précises
- Règles de linking entre types spécifiques
- Ex: "Ajouter des liens des Filtres vers les Produits"
- Ex: "Cross-sell entre Produits de même Catégorie"

### 2. Analyses segmentées
- Répartition du PageRank par type de page
- Identification des types sous-performants
- Optimisation ciblée

### 3. Flexibilité totale
- Types adaptés à votre secteur
- Granularité selon vos besoins
- Evolution des segments sans refonte

## Exemples par secteur

### E-commerce classique
- `Produit`
- `Catégorie`
- `Marque`
- `Guide`
- `Blog`

### Site B2B industriel
- `Produit`
- `Application`
- `Solution`
- `Documentation`
- `Support`

### Site de contenu/média
- `Article`
- `Dossier`
- `Auteur`
- `Rubrique`
- `Newsletter`

## Validation lors de l'import

Le système vérifie :
✅ Présence de la colonne "Segments"  
✅ Aucune valeur vide dans cette colonne  
✅ Types cohérents et utilisables

Erreurs possibles :
❌ `CSV must contain columns: ['address', 'status_code', 'segments']`
❌ `La colonne 'Segments' doit être renseignée pour toutes les pages`

## Utilisation pour les simulations

Une fois importé, vos types personnalisés seront disponibles pour :
- **Règles Same Category** : Liens entre pages du même type
- **Règles Cross-Sell** : Liens entre types complémentaires
- **Règles Popular Products** : Boost des types prioritaires
- **Règles personnalisées** : Logiques métier spécifiques

## Conseils d'optimisation

1. **Gardez 3-7 types** : Trop de granularité nuit à la lisibilité
2. **Noms explicites** : "Produit" plutôt que "Type1"
3. **Cohérence** : Même terminologie dans tout le projet
4. **Testez vos règles** : Vérifiez que Screaming Frog assigne bien les segments
5. **Documentez** : Tenez un référentiel de vos types et règles

## Migration depuis l'ancien système

Si vous avez déjà des projets avec l'ancienne logique :
1. Réexportez vos données avec les segments configurés
2. Supprimez l'ancien projet
3. Réimportez avec la nouvelle structure
4. Vos simulations seront plus précises !