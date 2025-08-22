#!/usr/bin/env python3

import sqlite3
import sys
import os

def add_page_boosts_column():
    """Add the page_boosts column to the simulations table"""
    
    db_path = "data/pagerank.db"
    
    if not os.path.exists(db_path):
        print(f"Database file {db_path} not found!")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(simulations)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'page_boosts' in column_names:
            print("✓ page_boosts column already exists in database")
            conn.close()
            return True
        
        print("Adding page_boosts column to simulations table...")
        
        # Add the column with a default empty JSON array
        cursor.execute("""
            ALTER TABLE simulations 
            ADD COLUMN page_boosts TEXT DEFAULT '[]'
        """)
        
        # Commit the changes
        conn.commit()
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(simulations)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'page_boosts' in column_names:
            print("✓ Successfully added page_boosts column")
            print("\nUpdated schema:")
            for col in columns:
                cid, name, type_name, notnull, default_value, pk = col
                print(f"  {name} ({type_name})")
            
            conn.close()
            return True
        else:
            print("✗ Failed to add page_boosts column")
            conn.close()
            return False
        
    except Exception as e:
        print(f"Error adding column: {e}")
        return False

if __name__ == "__main__":
    success = add_page_boosts_column()
    if success:
        print("\nMigration completed successfully!")
    else:
        print("\nMigration failed!")
    sys.exit(0 if success else 1)