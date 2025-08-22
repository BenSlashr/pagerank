#!/usr/bin/env python3

import pandas as pd

def test_csv_reading(file_path):
    """Test CSV reading with separator detection"""
    
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
    
    # Show first few column names
    print(f"First 10 columns: {list(df.columns[:10])}")
    
    # Show sample data
    print(f"\nSample data (first 3 rows):")
    print(df.head(3)[['Adresse', 'Code HTTP', 'Segments']].to_string())
    
    return df

if __name__ == "__main__":
    file_path = "/Users/benoit/simulation-pagerank/cuve-expert-pages-2.csv"
    df = test_csv_reading(file_path)