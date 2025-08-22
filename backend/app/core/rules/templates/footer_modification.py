from typing import List, Tuple, Any, Dict
from app.core.rules.base import BaseRule
from app.core.rules.registry import register_rule

@register_rule("footer_modification")
class FooterModificationRule(BaseRule):
    """Modifies footer links by adding or removing specific pages from the footer"""
    
    def generate_links(self, 
                      pages: List[Any], 
                      existing_links: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """Generate new footer link structure"""
        
        # Get configuration
        action = self.config.source_filter.get('action', 'add')  # 'add' or 'remove'
        target_urls = self.config.source_filter.get('target_urls', [])
        source_page_types = self.config.source_filter.get('source_types', ['product', 'category'])
        
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
        
        # Filter source pages (footer links are usually from content pages)
        # Support case-insensitive matching for page types
        source_page_types_lower = [t.lower() for t in source_page_types]
        source_pages = []
        for page in pages:
            page_type = page.type if hasattr(page, 'type') else page.get('type', 'other')
            if page_type.lower() in source_page_types_lower:
                source_pages.append(page)
        
        new_links = []
        
        if action == 'add':
            # Add footer links: selected page types link to target pages
            for page in source_pages:
                source_id = page.id if hasattr(page, 'id') else page['id']
                
                for target_id in target_page_ids:
                    # Don't link to self
                    if source_id != target_id:
                        link = (source_id, target_id)
                        new_links.append(link)
                        
        elif action == 'remove':
            # Remove footer links
            for page in source_pages:
                source_id = page.id if hasattr(page, 'id') else page['id']
                
                for target_id in target_page_ids:
                    if source_id != target_id:
                        link = (source_id, target_id)
                        new_links.append(link)
        
        return new_links
    
    def get_description(self) -> str:
        action = self.config.source_filter.get('action', 'add')
        target_urls = self.config.source_filter.get('target_urls', [])
        source_types = self.config.source_filter.get('source_types', ['product', 'category'])
        
        if action == 'add':
            return f"Add {len(target_urls)} pages to footer links from {', '.join(source_types)} pages"
        else:
            return f"Remove {len(target_urls)} pages from footer links on {', '.join(source_types)} pages"
    
    def is_removal_rule(self) -> bool:
        """Indicates if this rule removes links instead of adding them"""
        return self.config.source_filter.get('action', 'add') == 'remove'