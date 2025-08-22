#!/usr/bin/env python3

import pandas as pd
import sys
import os

# Add the backend to Python path
sys.path.insert(0, '/Users/benoit/simulation-pagerank/backend')

from app.services.import_service import ImportService

class MockRepo:
    """Mock repository for testing"""
    def __init__(self):
        self.projects = []
        self.pages = []
        self.links = []
    
    async def create(self, name, domain):
        project = type('Project', (), {'id': 1, 'name': name, 'domain': domain})
        self.projects.append(project)
        return project
    
    async def bulk_insert(self, items):
        self.pages.extend(items) if hasattr(self, 'pages') else None
        self.links.extend(items) if hasattr(self, 'links') else None
    
    async def get_by_project(self, project_id):
        return [p for p in getattr(self, 'pages', []) if p.get('project_id') == project_id]
    
    async def update_total_pages(self, project_id, count):
        print(f"Update project {project_id} total pages: {count}")
    
    async def update_page_types(self, project_id, page_types):
        print(f"Update project {project_id} page types: {page_types}")

def test_import():
    """Test the complete import process"""
    
    print("=== Testing Import Service ===")
    
    # Create mock repositories
    project_repo = MockRepo()
    page_repo = MockRepo() 
    link_repo = MockRepo()
    
    # Create import service
    import_service = ImportService(project_repo, page_repo, link_repo)
    
    # Test file path
    file_path = '/Users/benoit/simulation-pagerank/cuve-expert-pages-2.csv'
    
    print(f"Testing import of: {file_path}")
    
    try:
        # Simulate the import process step by step
        print("\\n1. Reading CSV...")
        
        # Read CSV with separator detection (same logic as import_service)
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            first_line = f.readline().strip()
        
        separator = ','
        if first_line.count(';') > first_line.count(','):
            separator = ';'
        
        print(f"Detected separator: '{separator}'")
        
        df = pd.read_csv(file_path, sep=separator, encoding='utf-8-sig')
        print(f"CSV loaded: {len(df)} rows, {len(df.columns)} columns")
        
        # Normalize column names
        df = import_service._normalize_column_names(df)
        print(f"After normalization: {len(df)} rows, {len(df.columns)} columns")
        
        # Check required columns
        required_columns = ['address', 'status_code', 'segments']
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            print(f"❌ Missing columns: {missing}")
            return
        else:
            print(f"✅ All required columns present: {required_columns}")
        
        # Check segments column
        empty_segments = df['segments'].isna() | (df['segments'] == '')
        if empty_segments.any():
            empty_count = empty_segments.sum()
            print(f"❌ {empty_count} pages have empty segments")
            return
        else:
            print("✅ All pages have segments defined")
        
        # Filter 2xx pages
        print(f"\\n2. Filtering pages...")
        print(f"Before 2xx filter: {len(df)} rows")
        df_filtered = df[df['status_code'].astype(str).str.startswith('2')]
        print(f"After 2xx filter: {len(df_filtered)} rows")
        
        # Extract page types
        page_types = sorted(df_filtered['segments'].unique())
        print(f"Page types found: {page_types}")
        
        # Simulate page processing
        print(f"\\n3. Processing pages...")
        pages_data = []
        urls_seen = set()
        
        for i, (_, row) in enumerate(df_filtered.iterrows()):
            url = row['address']
            
            if url in urls_seen:
                continue
            urls_seen.add(url)
            
            # Use segments directly as page type
            page_type = str(row['segments']).strip()
            
            page_data = {
                "project_id": 1,
                "url": url,
                "type": page_type,
                "category": "/",  # Simplified for test
                "current_pagerank": 0.0
            }
            pages_data.append(page_data)
        
        print(f"✅ Created {len(pages_data)} unique pages")
        
        # Show sample of page types
        type_counts = {}
        for page in pages_data[:100]:  # Sample first 100
            ptype = page['type']
            type_counts[ptype] = type_counts.get(ptype, 0) + 1
        
        print(f"Sample page types: {type_counts}")
        
        print(f"\\n🎉 Import test successful!")
        print(f"   Expected pages: {len(pages_data)}")
        print(f"   Page types: {page_types}")
        
    except Exception as e:
        print(f"❌ Import test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import asyncio
    test_import()