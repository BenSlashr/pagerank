#!/usr/bin/env python3

import pandas as pd
from urllib.parse import urlparse

def normalize_column_names(df):
    """Normalize column names to support both English and French Screaming Frog exports"""
    
    # Create a mapping dictionary for common column names
    column_mapping = {
        # French to English
        'Adresse': 'address',
        'Code HTTP': 'status_code', 
        'Statut': 'status_text',
        'Destination': 'destination',
        'Source': 'source',
        'Type': 'type',
        'Ancrage': 'anchor',
        'Texte Alt': 'alt_text',
        'Suivre': 'follow',
        'Cible': 'target',
        'Title 1': 'title',
        'Meta Description 1': 'meta_description',
        'H1-1': 'h1',
        'Taille (octets)': 'size_bytes',
        'Liens entrants': 'inlinks',
        'Liens sortants': 'outlinks',
        'Type de contenu': 'content_type',
        'Profondeur du dossier': 'folder_depth',
        'Crawl profondeur': 'crawl_depth',
        
        # English to lowercase
        'Address': 'address',
        'Status Code': 'status_code',
        'Status': 'status_text', 
        'Destination': 'destination',
        'Source': 'source',
        'Type': 'type',
        'Anchor': 'anchor',
        'Alt Text': 'alt_text',
        'Follow': 'follow',
        'Target': 'target',
        'Title': 'title',
        'Meta Description': 'meta_description',
        'H1': 'h1',
        'Size (bytes)': 'size_bytes',
        'Inlinks': 'inlinks',
        'Outlinks': 'outlinks',
        'Content Type': 'content_type',
        'Folder Depth': 'folder_depth',
        'Crawl Depth': 'crawl_depth',
        'Segments': 'segments'
    }
    
    # Rename columns using the mapping
    df_renamed = df.rename(columns=column_mapping)
    
    # Convert all column names to lowercase for consistency
    df_renamed.columns = [col.lower().replace(' ', '_') for col in df_renamed.columns]
    
    return df_renamed

def debug_import():
    """Debug the import process step by step"""
    
    file_path = '/Users/benoit/simulation-pagerank/cuve-expert-pages-2.csv'
    
    print("=== STEP 1: Reading CSV ===")
    # First, try to detect the separator by reading first few lines
    with open(file_path, 'r', encoding='utf-8-sig') as f:
        first_line = f.readline().strip()
        
    # Detect separator based on first line
    separator = ','
    if first_line.count(';') > first_line.count(','):
        separator = ';'
        
    print(f"Detected CSV separator: '{separator}'")
    
    # Read CSV with detected separator
    df = pd.read_csv(file_path, sep=separator, encoding='utf-8-sig')
    print(f"CSV loaded successfully: {len(df)} rows, {len(df.columns)} columns")
    
    print("\\n=== STEP 2: Column normalization ===")
    df = normalize_column_names(df)
    print(f"After normalization: {len(df)} rows, {len(df.columns)} columns")
    print(f"Key columns present: address={('address' in df.columns)}, status_code={('status_code' in df.columns)}")
    
    print("\\n=== STEP 3: Filtering 2xx pages ===")
    print(f"Status code values (first 10): {list(df['status_code'].head(10))}")
    df_filtered = df[df['status_code'].astype(str).str.startswith('2')]
    print(f"After 2xx filter: {len(df_filtered)} rows")
    
    print("\\n=== STEP 4: Process pages simulation ===")
    pages_data = []
    urls_seen = set()
    duplicates = 0
    
    for i, (_, row) in enumerate(df_filtered.iterrows()):
        url = row['address']
        
        if url in urls_seen:
            duplicates += 1
            print(f"DUPLICATE found at row {i}: {url}")
        else:
            urls_seen.add(url)
            
        page_data = {
            "url": url,
            "type": "unknown",
            "category": "/",
            "current_pagerank": 0.0
        }
        pages_data.append(page_data)
        
        # Show first few URLs
        if i < 5:
            print(f"Row {i}: {url}")
    
    print(f"\\nFinal result: {len(pages_data)} pages, {duplicates} duplicates")
    
    # Check for potential issue with how DataFrame is being processed
    print("\\n=== STEP 5: DataFrame analysis ===")
    print(f"DataFrame shape: {df_filtered.shape}")
    print(f"DataFrame memory usage: {df_filtered.memory_usage(deep=True).sum() / 1024:.2f} KB")
    
    # Check if there are hidden duplicated rows in the DataFrame itself
    unique_urls = df_filtered['address'].nunique()
    total_rows = len(df_filtered)
    print(f"Unique URLs in DataFrame: {unique_urls}")
    print(f"Total rows in DataFrame: {total_rows}")
    
    if unique_urls != total_rows:
        print(f"WARNING: DataFrame has {total_rows - unique_urls} duplicate URLs!")
        duplicated = df_filtered[df_filtered['address'].duplicated()]
        print(f"Sample duplicates: {list(duplicated['address'].head(5))}")

if __name__ == "__main__":
    debug_import()