import random
from typing import List, Tuple, Any
from app.core.rules.base import BaseRule
from app.core.rules.registry import register_rule

@register_rule("same_category")
class SameCategoryRule(BaseRule):
    """Links pages within the same category"""
    
    def generate_links(self, 
                      pages: List[Any], 
                      existing_links: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """Generate links between pages in the same category"""
        
        source_pages = self._filter_source_pages(pages)
        existing_links_set = self._get_existing_links_set(existing_links)
        
        # Group pages by category
        category_groups = {}
        page_lookup = {}
        
        for page in pages:
            page_id = page.id if hasattr(page, 'id') else page['id']
            category = page.category if hasattr(page, 'category') else page.get('category', '/')
            
            page_lookup[page_id] = page
            
            if category not in category_groups:
                category_groups[category] = []
            category_groups[category].append(page_id)
        
        new_links = []
        
        for source_page in source_pages:
            source_id = source_page.id if hasattr(source_page, 'id') else source_page['id']
            source_category = source_page.category if hasattr(source_page, 'category') else source_page.get('category', '/')
            
            # Get other pages in the same category
            same_category_pages = [
                page_id for page_id in category_groups.get(source_category, [])
                if page_id != source_id
            ]
            
            if not same_category_pages:
                continue
            
            # Randomly select target pages
            target_count = min(self.config.links_count, len(same_category_pages))
            if target_count > 0:
                selected_targets = random.sample(same_category_pages, target_count)
            else:
                selected_targets = []
            
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
        return "Links pages within the same category (e.g., products in /electronics/ link to other /electronics/ products)"