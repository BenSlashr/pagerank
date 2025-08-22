import random
from typing import List, Any
from .base import BaseSelector

class RandomSelector(BaseSelector):
    """Select pages randomly"""
    
    def select_targets(self, 
                      source_page: Any, 
                      candidate_pages: List[Any], 
                      max_targets: int) -> List[Any]:
        """Select pages randomly from all candidates"""
        
        if len(candidate_pages) <= max_targets:
            return candidate_pages
        else:
            return random.sample(candidate_pages, max_targets)
    
    def get_description(self) -> str:
        return "Sélectionne des pages aléatoirement"