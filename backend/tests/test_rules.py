import pytest
from app.core.rules.templates.same_category import SameCategoryRule
from app.core.rules.templates.cross_sell import CrossSellRule
from app.core.rules.base import RuleConfig

class MockPage:
    def __init__(self, id, type, category, current_pagerank):
        self.id = id
        self.type = type
        self.category = category
        self.current_pagerank = current_pagerank

def create_mock_pages():
    """Create mock pages for testing"""
    return [
        MockPage(1, 'product', '/electronics/', 0.001),
        MockPage(2, 'product', '/electronics/', 0.002),
        MockPage(3, 'product', '/clothing/', 0.001),
        MockPage(4, 'category', '/electronics/', 0.005),
    ]

def test_same_category_rule():
    """Test same category rule"""
    config = RuleConfig(
        source_filter={'type': 'product'},
        target_selector='same_category',
        links_count=1,
        bidirectional=False
    )
    
    rule = SameCategoryRule(config)
    pages = create_mock_pages()
    existing_links = []
    
    new_links = rule.generate_links(pages, existing_links)
    
    # Should create links between products in same category
    assert len(new_links) >= 1
    
    # Check that links are within same category
    page_lookup = {p.id: p for p in pages}
    for from_id, to_id in new_links:
        from_page = page_lookup[from_id]
        to_page = page_lookup[to_id]
        assert from_page.category == to_page.category
        assert from_page.type == 'product'  # Source filter
        
def test_cross_sell_rule():
    """Test cross sell rule"""
    config = RuleConfig(
        source_filter={'type': 'product'},
        target_selector='cross_sell',
        links_count=1,
        bidirectional=False
    )
    
    rule = CrossSellRule(config)
    pages = create_mock_pages()
    existing_links = []
    
    new_links = rule.generate_links(pages, existing_links)
    
    # Should create links between products in different categories
    if new_links:  # May be empty if not enough cross-category products
        page_lookup = {p.id: p for p in pages}
        for from_id, to_id in new_links:
            from_page = page_lookup[from_id]
            to_page = page_lookup[to_id] 
            assert from_page.category != to_page.category
            assert to_page.type == 'product'

def test_rule_excludes_existing_links():
    """Test that rules exclude existing links"""
    config = RuleConfig(
        source_filter={'type': 'product'},
        target_selector='same_category',
        links_count=10,
        bidirectional=False,
        exclude_existing=True
    )
    
    rule = SameCategoryRule(config)
    pages = create_mock_pages()
    existing_links = [(1, 2)]  # Already exists
    
    new_links = rule.generate_links(pages, existing_links)
    
    # Should not include the existing link
    assert (1, 2) not in new_links