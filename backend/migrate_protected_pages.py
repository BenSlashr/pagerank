#!/usr/bin/env python3

import sqlite3
import sys
import os

def add_protected_pages_column():
    """Safely add the protected_pages column to the simulations table"""
    
    db_path = "data/pagerank.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # First, check if the column already exists
        cursor.execute("PRAGMA table_info(simulations)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'protected_pages' in column_names:
            print("✓ protected_pages column already exists in database")
            conn.close()
            return True
        
        print("Adding protected_pages column to simulations table...")
        
        # Add the column with a default value
        # SQLite doesn't support adding NOT NULL columns without a default
        cursor.execute("""
            ALTER TABLE simulations 
            ADD COLUMN protected_pages TEXT DEFAULT '[]'
        """)
        
        # Commit the changes
        conn.commit()
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(simulations)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'protected_pages' in column_names:
            print("✓ Successfully added protected_pages column")
            print("\nUpdated schema:")
            for col in columns:
                cid, name, type_name, notnull, default_value, pk = col
                print(f"  {name} ({type_name})")
            
            conn.close()
            return True
        else:
            print("✗ Failed to add protected_pages column")
            conn.close()
            return False
        
    except Exception as e:
        print(f"Error adding column: {e}")
        return False

if __name__ == "__main__":
    success = add_protected_pages_column()
    if success:
        print("\nMigration completed successfully!")
    else:
        print("\nMigration failed!")
    sys.exit(0 if success else 1)