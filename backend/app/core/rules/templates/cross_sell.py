import random
from typing import List, Tuple, Any
from app.core.rules.base import BaseRule
from app.core.rules.registry import register_rule

@register_rule("cross_sell")
class CrossSellRule(BaseRule):
    """Links product pages to products from different categories"""
    
    def generate_links(self, 
                      pages: List[Any], 
                      existing_links: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """Generate cross-category links for cross-selling"""
        
        source_pages = self._filter_source_pages(pages)
        existing_links_set = self._get_existing_links_set(existing_links)
        
        # Group pages by category and type
        product_pages_by_category = {}
        
        for page in pages:
            page_id = page.id if hasattr(page, 'id') else page['id']
            page_type = page.type if hasattr(page, 'type') else page.get('type', 'other')
            category = page.category if hasattr(page, 'category') else page.get('category', '/')
            
            # Only consider product pages for cross-sell
            if page_type == 'product':
                if category not in product_pages_by_category:
                    product_pages_by_category[category] = []
                product_pages_by_category[category].append(page_id)
        
        new_links = []
        
        for source_page in source_pages:
            source_id = source_page.id if hasattr(source_page, 'id') else source_page['id']
            source_category = source_page.category if hasattr(source_page, 'category') else source_page.get('category', '/')
            
            # Get products from different categories
            cross_sell_candidates = []
            for category, page_ids in product_pages_by_category.items():
                if category != source_category:
                    cross_sell_candidates.extend(page_ids)
            
            if not cross_sell_candidates:
                continue
            
            # Randomly select target pages
            target_count = min(self.config.links_count, len(cross_sell_candidates))
            selected_targets = random.sample(cross_sell_candidates, target_count)
            
            for target_id in selected_targets:
                link = (source_id, target_id)
                if link not in existing_links_set:
                    new_links.append(link)
                    
                    # Add bidirectional link if configured
                    if self.config.bidirectional:
                        reverse_link = (target_id, source_id)
                        if reverse_link not in existing_links_set:
                            new_links.append(reverse_link)
        
        return self._remove_existing_links(new_links, existing_links_set)
    
    def get_description(self) -> str:
        return "Links product pages to products from different categories for cross-selling opportunities"