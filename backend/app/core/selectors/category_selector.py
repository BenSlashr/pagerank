import random
from typing import List, Any
from .base import BaseSelector

class CategorySelector(BaseSelector):
    """Select pages from the same category"""
    
    def select_targets(self, 
                      source_page: Any, 
                      candidate_pages: List[Any], 
                      max_targets: int) -> List[Any]:
        """Select pages from the same category as source page"""
        
        source_category = getattr(source_page, 'category', None) or getattr(source_page, 'get', lambda x: None)('category')
        
        # Filter candidates to same category
        same_category_pages = [
            page for page in candidate_pages 
            if (getattr(page, 'category', None) or getattr(page, 'get', lambda x: None)('category')) == source_category
        ]
        
        # Randomly select up to max_targets
        if len(same_category_pages) <= max_targets:
            return same_category_pages
        else:
            return random.sample(same_category_pages, max_targets)
    
    def get_description(self) -> str:
        return "Sélectionne des pages de la même catégorie"