import pytest
from app.core.pagerank.networkx_impl import NetworkXPageRankCalculator

@pytest.mark.asyncio
async def test_pagerank_calculation():
    """Test basic PageRank calculation"""
    calculator = NetworkXPageRankCalculator()
    
    # Simple test case: 3 pages, A->B, B->C, C->A
    pages = [
        {'id': 1},
        {'id': 2}, 
        {'id': 3}
    ]
    
    links = [
        (1, 2),  # A -> B
        (2, 3),  # B -> C
        (3, 1),  # C -> A
    ]
    
    results = await calculator.calculate(pages, links)
    
    # All pages should have equal PageRank in this symmetric case
    assert len(results) == 3
    assert all(0.3 < pr < 0.4 for pr in results.values())
    assert abs(results[1] - results[2]) < 0.001
    assert abs(results[2] - results[3]) < 0.001

@pytest.mark.asyncio
async def test_pagerank_no_links():
    """Test PageRank with no links"""
    calculator = NetworkXPageRankCalculator()
    
    pages = [{'id': 1}, {'id': 2}, {'id': 3}]
    links = []
    
    results = await calculator.calculate(pages, links)
    
    # Should distribute equally
    assert len(results) == 3
    expected_pr = 1.0 / 3
    for pr in results.values():
        assert abs(pr - expected_pr) < 0.001

@pytest.mark.asyncio 
async def test_pagerank_hub_and_authority():
    """Test PageRank with hub and authority structure"""
    calculator = NetworkXPageRankCalculator()
    
    pages = [{'id': i} for i in range(1, 5)]
    
    # Page 1 links to all others (hub)
    # All others link back to page 1 (authority)
    links = [
        (1, 2), (1, 3), (1, 4),  # Hub links out
        (2, 1), (3, 1), (4, 1),  # Authority links in
    ]
    
    results = await calculator.calculate(pages, links)
    
    # Page 1 should have higher PageRank as it receives more links
    assert results[1] > results[2]
    assert results[1] > results[3] 
    assert results[1] > results[4]