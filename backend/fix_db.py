#!/usr/bin/env python3

import sqlite3
import os
import json

def fix_database():
    db_path = "data/pagerank.db"
    
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current schema
        cursor.execute("PRAGMA table_info(simulations)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        print("Current columns:", column_names)
        
        if 'rules_config' not in column_names:
            print("Adding rules_config column...")
            cursor.execute("ALTER TABLE simulations ADD COLUMN rules_config TEXT DEFAULT '[]'")
            conn.commit()
            print("✓ Column added successfully")
        else:
            print("✓ rules_config column already exists")
        
        # Verify final schema
        cursor.execute("PRAGMA table_info(simulations)")
        columns = cursor.fetchall()
        print("Final schema:")
        for col in columns:
            print(f"  {col[1]} ({col[2]})")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    fix_database()