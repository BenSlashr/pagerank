import random
from typing import List, Any
from .base import BaseSelector

class SemanticSelector(BaseSelector):
    """Select pages based on semantic similarity (placeholder implementation)"""
    
    def select_targets(self, 
                      source_page: Any, 
                      candidate_pages: List[Any], 
                      max_targets: int) -> List[Any]:
        """Select pages based on semantic similarity"""
        
        # TODO: Implement real semantic similarity
        # For now, fall back to category-based selection with some randomness
        source_category = getattr(source_page, 'category', None) or getattr(source_page, 'get', lambda x: None)('category')
        
        # Prefer same category but also include some random ones
        same_category_pages = [
            page for page in candidate_pages 
            if (getattr(page, 'category', None) or getattr(page, 'get', lambda x: None)('category')) == source_category
        ]
        
        other_pages = [
            page for page in candidate_pages 
            if (getattr(page, 'category', None) or getattr(page, 'get', lambda x: None)('category')) != source_category
        ]
        
        # Mix: 70% same category, 30% others
        targets = []
        same_cat_count = min(len(same_category_pages), int(max_targets * 0.7))
        other_count = min(len(other_pages), max_targets - same_cat_count)
        
        if same_cat_count > 0:
            targets.extend(random.sample(same_category_pages, same_cat_count))
        
        if other_count > 0:
            targets.extend(random.sample(other_pages, other_count))
        
        return targets
    
    def get_description(self) -> str:
        return "Sélectionne des pages par proximité sémantique (mix catégorie + aléatoire)"