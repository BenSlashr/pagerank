from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Tuple, Dict, Any

@dataclass
class RuleConfig:
    """Configuration for a linking rule"""
    source_filter: Dict[str, Any]  # {"type": "product", "category": "/electronics/"}
    target_selector: str           # "same_category", "cross_sell", "semantic_similar"
    links_count: int              # Number of links to add per source page
    bidirectional: bool = False   # Whether to add links in both directions
    exclude_existing: bool = True  # Whether to exclude already existing links
    link_position: str = "content" # Position of links: header, content_top, content, content_bottom, sidebar, footer
    legacy_uniform_weights: bool = False  # Use old uniform weights (ignore semantic relevance)
    semantic_threshold: float = 0.4  # Minimum similarity threshold for semantic analysis

class BaseRule(ABC):
    """Abstract base class for all linking rules"""
    
    def __init__(self, config: RuleConfig):
        self.config = config
    
    @abstractmethod
    def generate_links(self, 
                      pages: List[Any], 
                      existing_links: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """
        Generate new links based on the rule configuration
        
        Args:
            pages: List of page objects
            existing_links: List of existing links as (from_page_id, to_page_id) tuples
            
        Returns:
            List of new links as (from_page_id, to_page_id) tuples
        """
        pass
    
    @abstractmethod
    def get_description(self) -> str:
        """Get human-readable description of this rule"""
        pass
    
    def _filter_source_pages(self, pages: List[Any]) -> List[Any]:
        """Filter pages that match the source criteria"""
        filtered_pages = []
        
        for page in pages:
            page_data = page.__dict__ if hasattr(page, '__dict__') else page
            
            matches = True
            for key, value in self.config.source_filter.items():
                if key not in page_data or page_data[key] != value:
                    matches = False
                    break
            
            if matches:
                filtered_pages.append(page)
        
        return filtered_pages
    
    def _get_existing_links_set(self, existing_links: List[Tuple[int, int]]) -> set:
        """Convert existing links to a set for fast lookup"""
        return set(existing_links)
    
    def _remove_existing_links(self, 
                              new_links: List[Tuple[int, int]], 
                              existing_links_set: set) -> List[Tuple[int, int]]:
        """Remove links that already exist"""
        if not self.config.exclude_existing:
            return new_links
        
        return [link for link in new_links if link not in existing_links_set]
    
    def get_link_weight_multiplier(self) -> float:
        """
        Get the weight multiplier based on link position.
        Links higher on the page have more SEO value.
        """
        position_weights = {
            "header": 1.0,          # Maximum weight - top navigation/menu
            "content_top": 0.95,    # Very high - first paragraph  
            "content": 0.8,         # Standard weight - middle content
            "content_bottom": 0.6,  # Lower weight - end of content
            "sidebar": 0.4,         # Moderate weight - secondary zone
            "footer": 0.2           # Minimum weight - footer links
        }
        
        # For menu modifications, use header weight; for footer modifications, use footer weight
        rule_name = getattr(self.config, 'target_selector', '')
        if rule_name == 'menu_modification':
            return position_weights.get("header", 1.0)
        elif rule_name == 'footer_modification':
            return position_weights.get("footer", 0.2)
        
        return position_weights.get(self.config.link_position, 0.8)