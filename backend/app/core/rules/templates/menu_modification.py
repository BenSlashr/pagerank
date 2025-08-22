from typing import List, Tuple, Any, Dict
from app.core.rules.base import BaseRule
from app.core.rules.registry import register_rule

@register_rule("menu_modification")
class MenuModificationRule(BaseRule):
    """Modifies menu links by adding or removing specific pages from the menu"""
    
    def generate_links(self, 
                      pages: List[Any], 
                      existing_links: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """Generate new menu link structure"""
        
        # Get configuration
        action = self.config.source_filter.get('action', 'add')  # 'add' or 'remove'
        target_urls = self.config.source_filter.get('target_urls', [])
        
        if not target_urls:
            return []
        
        # Find target pages by URL (support both full URLs and URL paths)
        target_page_ids = []
        for page in pages:
            page_url = page.url if hasattr(page, 'url') else page.get('url', '')
            
            # Check for exact match or if any target URL is contained in the page URL
            for target_url in target_urls:
                if target_url == page_url or target_url in page_url:
                    target_page_ids.append(page.id if hasattr(page, 'id') else page['id'])
                    break  # Found a match, no need to check other target URLs
        
        if not target_page_ids:
            return []
        
        new_links = []
        
        if action == 'add':
            # Add menu links: all pages link to the target pages (menu behavior)
            for page in pages:
                source_id = page.id if hasattr(page, 'id') else page['id']
                
                for target_id in target_page_ids:
                    # Don't link to self
                    if source_id != target_id:
                        link = (source_id, target_id)
                        new_links.append(link)
                        
        elif action == 'remove':
            # Remove menu links: we'll return negative links to indicate removal
            # This will be handled in the simulator to exclude these links
            for page in pages:
                source_id = page.id if hasattr(page, 'id') else page['id']
                
                for target_id in target_page_ids:
                    if source_id != target_id:
                        # Mark links for removal (negative indication)
                        link = (source_id, target_id)
                        new_links.append(link)
        
        return new_links
    
    def get_description(self) -> str:
        action = self.config.source_filter.get('action', 'add')
        target_urls = self.config.source_filter.get('target_urls', [])
        
        if action == 'add':
            return f"Add {len(target_urls)} pages to the main menu (all pages will link to them)"
        else:
            return f"Remove {len(target_urls)} pages from the main menu (remove links from all pages)"
    
    def is_removal_rule(self) -> bool:
        """Indicates if this rule removes links instead of adding them"""
        return self.config.source_filter.get('action', 'add') == 'remove'