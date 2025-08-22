import random
from typing import List, Tuple, Any
from app.core.rules.base import BaseRule
from app.core.rules.registry import register_rule

@register_rule("popular_products")
class PopularProductsRule(BaseRule):
    """Links pages to the most popular product pages (highest PageRank)"""
    
    def generate_links(self, 
                      pages: List[Any], 
                      existing_links: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """Generate links to popular products based on current PageRank"""
        
        source_pages = self._filter_source_pages(pages)
        existing_links_set = self._get_existing_links_set(existing_links)
        
        # Find product pages and sort by PageRank
        product_pages = []
        for page in pages:
            page_type = page.type if hasattr(page, 'type') else page.get('type', 'other')
            if page_type == 'product':
                page_id = page.id if hasattr(page, 'id') else page['id']
                current_pagerank = page.current_pagerank if hasattr(page, 'current_pagerank') else page.get('current_pagerank', 0.0)
                product_pages.append((page_id, current_pagerank))
        
        # Sort by PageRank (descending) and take top candidates
        product_pages.sort(key=lambda x: x[1], reverse=True)
        top_products = [page_id for page_id, _ in product_pages[:min(50, len(product_pages))]]
        
        if not top_products:
            return []
        
        new_links = []
        
        for source_page in source_pages:
            source_id = source_page.id if hasattr(source_page, 'id') else source_page['id']
            
            # Don't link to self if source is a product
            available_targets = [pid for pid in top_products if pid != source_id]
            
            if not available_targets:
                continue
            
            # Select random popular products
            target_count = min(self.config.links_count, len(available_targets))
            selected_targets = random.sample(available_targets, target_count)
            
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
        return "Links pages to the most popular product pages based on current PageRank scores"