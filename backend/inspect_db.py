#!/usr/bin/env python3

import sqlite3
import sys
import os

def inspect_database():
    db_path = "data/pagerank.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if simulations table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='simulations'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("Simulations table does not exist!")
            return False
        
        print("=== Simulations Table Schema ===")
        cursor.execute("PRAGMA table_info(simulations)")
        columns = cursor.fetchall()
        
        for col in columns:
            cid, name, type_name, notnull, default_value, pk = col
            print(f"Column: {name}")
            print(f"  Type: {type_name}")
            print(f"  Not Null: {bool(notnull)}")
            print(f"  Default: {default_value}")
            print(f"  Primary Key: {bool(pk)}")
            print()
        
        # Check if rules_config column exists
        column_names = [col[1] for col in columns]
        if 'rules_config' in column_names:
            print("✓ rules_config column EXISTS in database")
        else:
            print("✗ rules_config column MISSING from database")
            print("Available columns:", column_names)
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error inspecting database: {e}")
        return False

if __name__ == "__main__":
    success = inspect_database()
    sys.exit(0 if success else 1)