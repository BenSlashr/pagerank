from abc import ABC, abstractmethod
from typing import Dict, List, Tuple

class PageRankCalculator(ABC):
    """Abstract base class for PageRank calculation"""
    
    @abstractmethod
    async def calculate(self, 
                       pages: List[Dict], 
                       links: List[Tuple[int, int]],
                       damping: float = 0.85,
                       max_iter: int = 100,
                       tolerance: float = 1e-6,
                       link_weights: Dict[Tuple[int, int], float] = None) -> Dict[int, float]:
        """
        Calculate PageRank for given pages and links
        
        Args:
            pages: List of page dictionaries with 'id' field
            links: List of tuples (from_page_id, to_page_id)
            damping: Damping factor (usually 0.85)
            max_iter: Maximum iterations
            tolerance: Convergence tolerance
            link_weights: Optional dict mapping (from_id, to_id) to weight (for position-based weighting)
            
        Returns:
            Dict mapping page_id to PageRank score
        """
        pass