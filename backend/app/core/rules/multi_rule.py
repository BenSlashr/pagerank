import random
import logging
from typing import List, Tuple, Any, Dict
from app.core.rules.base import BaseRule
from app.core.selectors import CategorySelector, SemanticSelector, RandomSelector, PageRankSelector

logger = logging.getLogger(__name__)

class MultiRule(BaseRule):
    """Rule that applies multiple linking strategies cumulatively"""
    
    def __init__(self, rules_config: List[Dict]):
        # Create selector instances
        self.selectors = {
            'category': CategorySelector(),
            'semantic': SemanticSelector(), 
            'random': RandomSelector(),
            'pagerank_high': PageRankSelector(prefer_high_pagerank=True),
            'pagerank_low': PageRankSelector(prefer_high_pagerank=False)
        }
        
        self.rules_config = rules_config
        
        # Create dummy config for base class compatibility
        super().__init__({'rules': rules_config})
    
    def generate_links(self, 
                      pages: List[Any], 
                      existing_links: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """Generate links by applying all rules cumulatively"""
        
        logger.info(f"🚀 MultiRule.generate_links called with {len(pages)} pages, {len(existing_links)} existing links")
        logger.info(f"📋 Rules config: {self.rules_config}")
        
        all_new_links = []
        existing_links_set = self._get_existing_links_set(existing_links)
        
        # Apply each rule in sequence
        for i, rule_config in enumerate(self.rules_config):
            logger.info(f"🔄 Applying rule {i+1}/{len(self.rules_config)}: {rule_config}")
            rule_links = self._apply_single_rule(pages, existing_links_set, rule_config)
            logger.info(f"   ✨ Rule {i+1} generated {len(rule_links)} links")
            
            # Add new links to our set to avoid duplicates in subsequent rules
            for link in rule_links:
                if link not in existing_links_set:
                    all_new_links.append(link)
                    existing_links_set.add(link)
        
        logger.info(f"🏁 Total new links generated: {len(all_new_links)}")
        return all_new_links
    
    def _apply_single_rule(self, 
                          pages: List[Any], 
                          existing_links_set: set, 
                          rule_config: Dict) -> List[Tuple[int, int]]:
        """Apply a single rule configuration"""
        
        logger.info(f"   🔍 Filtering pages for rule:")
        logger.info(f"      Source types: {rule_config.get('source_types', [])}")
        logger.info(f"      Target types: {rule_config.get('target_types', [])}")
        
        # Filter source pages
        source_pages = self._filter_pages_by_criteria(
            pages,
            types_filter=rule_config.get('source_types', []),
            categories_filter=rule_config.get('source_categories', [])
        )
        logger.info(f"      📤 Source pages found: {len(source_pages)}")
        
        # Filter target pages  
        target_pages = self._filter_pages_by_criteria(
            pages,
            types_filter=rule_config.get('target_types', []),
            categories_filter=rule_config.get('target_categories', [])
        )
        logger.info(f"      📥 Target pages found: {len(target_pages)}")
        
        # Get selector
        selection_method = rule_config.get('selection_method', 'category')
        selector = self.selectors.get(selection_method, self.selectors['category'])
        
        # Configuration
        links_per_page = rule_config.get('links_per_page', 3)
        bidirectional = rule_config.get('bidirectional', False)
        avoid_self_links = rule_config.get('avoid_self_links', True)
        
        new_links = []
        
        for source_page in source_pages:
            source_id = self._get_page_id(source_page)
            
            # Filter out self-links if required
            available_targets = target_pages
            if avoid_self_links:
                available_targets = [
                    page for page in target_pages 
                    if self._get_page_id(page) != source_id
                ]
            
            # Use selector to choose targets
            selected_targets = selector.select_targets(
                source_page, available_targets, links_per_page
            )
            
            # Create links
            for target_page in selected_targets:
                target_id = self._get_page_id(target_page)
                link = (source_id, target_id)
                
                if link not in existing_links_set:
                    new_links.append(link)
                    
                    # Add bidirectional link if configured
                    if bidirectional:
                        reverse_link = (target_id, source_id)
                        if reverse_link not in existing_links_set:
                            new_links.append(reverse_link)
        
        return new_links
    
    def _filter_pages_by_criteria(self, 
                                 pages: List[Any], 
                                 types_filter: List[str], 
                                 categories_filter: List[str]) -> List[Any]:
        """Filter pages by type and category criteria"""
        
        filtered = pages
        
        # Filter by types if specified (case-insensitive)
        if types_filter:
            types_filter_lower = [t.lower() for t in types_filter]
            filtered = [
                page for page in filtered
                if self._get_page_type(page).lower() in types_filter_lower
            ]
        
        # Filter by categories if specified (case-insensitive)
        if categories_filter:
            categories_filter_lower = [c.lower() for c in categories_filter]
            filtered = [
                page for page in filtered
                if self._get_page_category(page).lower() in categories_filter_lower
            ]
        
        return filtered
    
    def _get_page_id(self, page: Any) -> int:
        """Get page ID from page object"""
        return getattr(page, 'id', None) or page.get('id')
    
    def _get_page_type(self, page: Any) -> str:
        """Get page type from page object"""
        return getattr(page, 'type', None) or page.get('type', '')
    
    def _get_page_category(self, page: Any) -> str:
        """Get page category from page object"""
        return getattr(page, 'category', None) or page.get('category', '')
    
    def get_description(self) -> str:
        return f"Applique {len(self.rules_config)} règles de maillage cumulatives"