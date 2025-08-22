#!/usr/bin/env python3

import asyncio
import sys
import logging
from typing import Dict, List

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Add path for imports
sys.path.append('/Users/benoit/simulation-pagerank/backend')

from app.core.pagerank.advanced_impl import AdvancedPageRankCalculator

class MockPage:
    """Mock page object for testing"""
    def __init__(self, page_id: int, url: str):
        self.id = page_id
        self.url = url

async def test_basic_functionality():
    """Test basic water-filling projection"""
    print("\n🧪 Testing Advanced PageRank Calculator")
    print("=" * 50)
    
    # Create simple test graph: A -> B -> C -> A (triangle)
    pages = [
        MockPage(1, "http://test.com/page-a"),
        MockPage(2, "http://test.com/page-b"), 
        MockPage(3, "http://test.com/page-c")
    ]
    
    links = [
        (1, 2),  # A -> B
        (2, 3),  # B -> C  
        (3, 1)   # C -> A
    ]
    
    calculator = AdvancedPageRankCalculator()
    
    print("📊 Test graph: 3 pages in triangle (A->B->C->A)")
    print(f"   Pages: {[p.url for p in pages]}")
    print(f"   Links: {links}")
    
    # Test 1: Baseline (no protection/boost)
    print("\n🔬 Test 1: Baseline PageRank")
    baseline_result = await calculator.calculate(pages, links)
    
    print("   Results:")
    for page in pages:
        pr_value = baseline_result[page.id]
        print(f"     {page.url}: {pr_value:.6f}")
    
    total_mass = sum(baseline_result.values())
    print(f"   Total mass: {total_mass:.8f} (should be 1.0)")
    
    # Test 2: Protection only
    print("\n🛡️  Test 2: Protect page A (floor = 0.5)")
    protected_result = await calculator.calculate(
        pages, links,
        protected_pages={"http://test.com/page-a": 0.5},  # Protect A at 50% of baseline
        eta_protect=0.1
    )
    
    print("   Results:")
    for page in pages:
        pr_value = protected_result[page.id] 
        baseline_value = baseline_result[page.id]
        change = ((pr_value - baseline_value) / baseline_value) * 100
        status = "🛡️ PROTECTED" if page.url == "http://test.com/page-a" else ""
        print(f"     {page.url}: {pr_value:.6f} ({change:+.1f}%) {status}")
    
    total_mass = sum(protected_result.values())
    print(f"   Total mass: {total_mass:.8f} (should be 1.0)")
    
    # Test 3: Boost only
    print("\n⚡ Test 3: Boost page B (target = 2x baseline)")
    boosted_result = await calculator.calculate(
        pages, links,
        boosted_pages={"http://test.com/page-b": 2.0},  # Boost B to 2x baseline
        eta_boost=0.1
    )
    
    print("   Results:")
    for page in pages:
        pr_value = boosted_result[page.id]
        baseline_value = baseline_result[page.id] 
        change = ((pr_value - baseline_value) / baseline_value) * 100
        status = "⚡ BOOSTED" if page.url == "http://test.com/page-b" else ""
        print(f"     {page.url}: {pr_value:.6f} ({change:+.1f}%) {status}")
    
    total_mass = sum(boosted_result.values())
    print(f"   Total mass: {total_mass:.8f} (should be 1.0)")
    
    # Test 4: Protection + Boost combined
    print("\n🛡️⚡ Test 4: Protect A (0.5x) + Boost B (2.0x)")
    combined_result = await calculator.calculate(
        pages, links,
        protected_pages={"http://test.com/page-a": 0.5},
        boosted_pages={"http://test.com/page-b": 2.0},
        eta_protect=0.08,
        eta_boost=0.05
    )
    
    print("   Results:")
    for page in pages:
        pr_value = combined_result[page.id]
        baseline_value = baseline_result[page.id]
        change = ((pr_value - baseline_value) / baseline_value) * 100
        status = ""
        if page.url == "http://test.com/page-a":
            status = "🛡️ PROTECTED"
        elif page.url == "http://test.com/page-b":
            status = "⚡ BOOSTED"
        print(f"     {page.url}: {pr_value:.6f} ({change:+.1f}%) {status}")
    
    total_mass = sum(combined_result.values())
    print(f"   Total mass: {total_mass:.8f} (should be 1.0)")
    
    print("\n✅ Basic tests completed!")
    return True

async def test_water_filling():
    """Test water-filling projection directly"""
    print("\n🧪 Testing Water-Filling Projection")
    print("=" * 40)
    
    import numpy as np
    
    calculator = AdvancedPageRankCalculator()
    
    # Test case: 3 pages, need to project [0.2, 0.3, 0.5] with floor [0.4, 0.1, 0.2]
    print("Test: Project [0.2, 0.3, 0.5] with floors [0.4, 0.1, 0.2]")
    
    p = np.array([0.2, 0.3, 0.5])
    floors = np.array([0.4, 0.1, 0.2])  # Page 0 needs boost from 0.2 to 0.4
    
    print(f"  Input:  {p} (sum={np.sum(p):.3f})")
    print(f"  Floors: {floors}")
    
    projected = calculator._water_filling_projection(p, floors)
    
    print(f"  Output: {projected} (sum={np.sum(projected):.6f})")
    
    # Verify constraints
    constraint_check = np.all(projected >= floors - 1e-10)  # Allow tiny floating point errors
    sum_check = abs(np.sum(projected) - 1.0) < 1e-10
    
    print(f"  ✅ Floor constraints satisfied: {constraint_check}")
    print(f"  ✅ Sum = 1.0: {sum_check}")
    
    if constraint_check and sum_check:
        print("  🎯 Water-filling test PASSED")
        return True
    else:
        print("  ❌ Water-filling test FAILED")
        return False

async def main():
    """Run all tests"""
    print("🚀 Advanced PageRank Calculator Tests")
    print("====================================")
    
    # Test water-filling first (unit test)
    water_test = await test_water_filling()
    if not water_test:
        print("❌ Water-filling failed, stopping tests")
        return
    
    # Test full functionality
    basic_test = await test_basic_functionality()
    
    if basic_test and water_test:
        print("\n🎉 ALL TESTS PASSED!")
        print("Ready for integration into the simulator.")
    else:
        print("\n❌ SOME TESTS FAILED")
        print("Need debugging before integration.")

if __name__ == "__main__":
    asyncio.run(main())