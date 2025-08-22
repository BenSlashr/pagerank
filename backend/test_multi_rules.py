#!/usr/bin/env python3

import asyncio
import sys
import os

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.rules.multi_rule import MultiRule

def test_multi_rule():
    """Test the multi-rule system with mock data"""
    
    # Mock pages data
    pages = [
        {"id": 1, "type": "product", "category": "electronics", "url": "electronics/phone1"},
        {"id": 2, "type": "product", "category": "electronics", "url": "electronics/phone2"},
        {"id": 3, "type": "product", "category": "clothing", "url": "clothing/shirt1"},
        {"id": 4, "type": "category", "category": "electronics", "url": "electronics/"},
        {"id": 5, "type": "blog", "category": "news", "url": "blog/tech-news"},
    ]
    
    # Mock existing links
    existing_links = [(1, 2)]  # phone1 -> phone2
    
    # Test configuration with multiple rules
    rules_config = [
        {
            "source_types": ["product"],
            "target_types": ["product"],
            "selection_method": "category",
            "links_per_page": 2,
            "bidirectional": False,
            "avoid_self_links": True
        },
        {
            "source_types": ["category"],
            "target_types": ["product"],
            "selection_method": "category",
            "links_per_page": 3,
            "bidirectional": False,
            "avoid_self_links": True
        },
        {
            "source_types": ["blog"],
            "target_types": ["product"],
            "selection_method": "random",
            "links_per_page": 1,
            "bidirectional": False,
            "avoid_self_links": True
        }
    ]
    
    print("🧪 Testing Multi-Rule System")
    print("=" * 50)
    
    print(f"Pages: {len(pages)}")
    print(f"Existing links: {existing_links}")
    print(f"Rules to apply: {len(rules_config)}")
    
    # Create and apply multi-rule
    multi_rule = MultiRule(rules_config)
    new_links = multi_rule.generate_links(pages, existing_links)
    
    print(f"\n✅ Generated {len(new_links)} new links:")
    for from_id, to_id in new_links:
        from_page = next(p for p in pages if p["id"] == from_id)
        to_page = next(p for p in pages if p["id"] == to_id)
        print(f"  {from_page['url']} ({from_page['type']}) -> {to_page['url']} ({to_page['type']})")
    
    print(f"\n📊 Summary:")
    print(f"  - Total existing links: {len(existing_links)}")
    print(f"  - New links generated: {len(new_links)}")
    print(f"  - Total links after simulation: {len(existing_links) + len(new_links)}")
    
    return len(new_links) > 0

if __name__ == "__main__":
    success = test_multi_rule()
    if success:
        print("\n🎉 Test passed!")
        sys.exit(0)
    else:
        print("\n❌ Test failed!")
        sys.exit(1)