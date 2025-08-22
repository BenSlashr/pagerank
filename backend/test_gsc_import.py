#!/usr/bin/env python3
"""
Script de test pour l'import GSC
"""

import sys
import os
import tempfile
from datetime import datetime

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import get_db
from app.repositories.gsc_repository import SQLiteGSCRepository
from sqlalchemy.orm import Session

def create_test_csv():
    """Create a test GSC CSV file"""
    csv_content = """Page,Impressions,Clicks,CTR,Position
https://example.com/,1500,45,3.0,12.5
https://example.com/products/,800,25,3.125,8.2
https://example.com/category/electronics,600,18,3.0,15.8
https://example.com/blog/seo-tips,400,12,3.0,22.1
"""
    
    # Create temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write(csv_content)
        return f.name

def test_gsc_import():
    """Test GSC import functionality"""
    print("🧪 Testing GSC Import Functionality")
    
    # Create test CSV
    csv_path = create_test_csv()
    print(f"📁 Created test CSV: {csv_path}")
    
    try:
        # Get database session
        db_gen = get_db()
        db: Session = next(db_gen)
        
        # Create repository
        gsc_repo = SQLiteGSCRepository(db)
        
        # Test import (project_id=1 should exist if you have test data)
        print("🔄 Testing CSV import...")
        result = await gsc_repo.import_gsc_csv(
            project_id=1,  # Assuming project 1 exists
            csv_path=csv_path,
            period_start="2024-01-01T00:00:00Z",
            period_end="2024-01-31T23:59:59Z"
        )
        
        print("✅ Import successful!")
        print(f"   📊 Imported rows: {result['imported_rows']}")
        print(f"   🔗 Matched pages: {result['matched_pages']}")
        print(f"   ❓ Unmatched URLs: {result['total_unmatched']}")
        
        if result['unmatched_urls']:
            print("   📝 Sample unmatched URLs:")
            for url in result['unmatched_urls'][:3]:
                print(f"      - {url}")
        
        # Test retrieval
        print("\n🔍 Testing data retrieval...")
        gsc_data = await gsc_repo.get_by_project(1)
        print(f"   📈 Retrieved {len(gsc_data)} GSC records")
        
        if gsc_data:
            top_page = gsc_data[0]
            print(f"   🏆 Top page: {top_page.url}")
            print(f"      👀 Impressions: {top_page.impressions}")
            print(f"      🖱️  Clicks: {top_page.clicks}")
            print(f"      📍 Position: {top_page.position}")
        
        # Test analysis
        print("\n🎯 Testing GSC+PageRank analysis...")
        analysis = await gsc_repo.get_gsc_pagerank_analysis(1)
        
        if "insights" in analysis:
            insights = analysis["insights"]
            print(f"   🚀 High traffic, low PageRank: {insights['high_traffic_low_pagerank']['count']} pages")
            print(f"   🔗 High PageRank, no traffic: {insights['high_pagerank_no_traffic']['count']} pages")
            print(f"   ⚖️  Balanced pages: {insights['balanced_pages']['count']} pages")
            print(f"   👻 Orphan GSC pages: {insights['orphan_gsc']['count']} pages")
        
        print("\n🎉 All tests passed!")
        
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Cleanup
        try:
            os.unlink(csv_path)
            print(f"🧹 Cleaned up test CSV")
        except:
            pass

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_gsc_import())