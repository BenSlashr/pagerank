from typing import List, Any
from .base import BaseSelector

class PageRankSelector(BaseSelector):
    """Select pages based on their current PageRank"""
    
    def __init__(self, prefer_high_pagerank: bool = True):
        self.prefer_high_pagerank = prefer_high_pagerank
    
    def select_targets(self, 
                      source_page: Any, 
                      candidate_pages: List[Any], 
                      max_targets: int) -> List[Any]:
        """Select pages based on their current PageRank"""
        
        # Sort by PageRank
        sorted_pages = sorted(
            candidate_pages,
            key=lambda page: getattr(page, 'current_pagerank', 0) or getattr(page, 'get', lambda x: 0)('current_pagerank', 0),
            reverse=self.prefer_high_pagerank
        )
        
        return sorted_pages[:max_targets]
    
    def get_description(self) -> str:
        direction = "fort" if self.prefer_high_pagerank else "faible"
        return f"Sélectionne des pages avec PageRank {direction}"