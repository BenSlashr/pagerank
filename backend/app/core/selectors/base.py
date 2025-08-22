from abc import ABC, abstractmethod
from typing import List, Any

class BaseSelector(ABC):
    """Base class for target page selection strategies"""
    
    @abstractmethod
    def select_targets(self, 
                      source_page: Any, 
                      candidate_pages: List[Any], 
                      max_targets: int) -> List[Any]:
        """Select target pages for linking from the source page"""
        pass
    
    @abstractmethod
    def get_description(self) -> str:
        """Return description of this selection method"""
        pass