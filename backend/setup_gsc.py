#!/usr/bin/env python3
"""
Script pour configurer le système GSC
"""

import sqlite3
from datetime import datetime

def setup_gsc_table():
    """Create the GSC table manually if Alembic is not available"""
    print("🔧 Setting up GSC table...")
    
    # Connect to the database
    db_path = "data/pagerank.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='gsc_data'
        """)
        
        if cursor.fetchone():
            print("✅ GSC table already exists")
            return
        
        # Create the GSC table
        cursor.execute("""
            CREATE TABLE gsc_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                page_id INTEGER NULL,
                url TEXT NOT NULL,
                impressions INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                ctr REAL DEFAULT 0.0,
                position REAL DEFAULT 0.0,
                import_date DATETIME NULL,
                period_start DATETIME NULL,
                period_end DATETIME NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id),
                FOREIGN KEY (page_id) REFERENCES pages(id),
                UNIQUE(project_id, url, import_date) 
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX ix_gsc_data_id ON gsc_data (id)")
        cursor.execute("CREATE INDEX ix_gsc_data_project_id ON gsc_data (project_id)")
        cursor.execute("CREATE INDEX ix_gsc_data_clicks ON gsc_data (clicks DESC)")
        
        conn.commit()
        print("✅ GSC table created successfully")
        
        # Test insert sample data
        sample_data = (
            1,  # project_id (assuming project 1 exists)
            None,  # page_id
            'https://example.com/test',
            1000,  # impressions
            30,    # clicks
            3.0,   # ctr
            12.5,  # position
            datetime.now(),
            None,  # period_start
            None   # period_end
        )
        
        cursor.execute("""
            INSERT INTO gsc_data 
            (project_id, page_id, url, impressions, clicks, ctr, position, import_date, period_start, period_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, sample_data)
        
        conn.commit()
        print("✅ Sample GSC data inserted")
        
        # Verify the insert
        cursor.execute("SELECT COUNT(*) FROM gsc_data")
        count = cursor.fetchone()[0]
        print(f"📊 GSC table now has {count} records")
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        conn.close()

def check_existing_projects():
    """Check what projects exist"""
    print("\n🔍 Checking existing projects...")
    
    db_path = "data/pagerank.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT id, name, domain, total_pages FROM projects LIMIT 5")
        projects = cursor.fetchall()
        
        if projects:
            print("📋 Available projects:")
            for project in projects:
                print(f"   ID: {project[0]} | {project[1]} | {project[2]} | {project[3]} pages")
        else:
            print("⚠️  No projects found. Import some data first!")
            
    except sqlite3.Error as e:
        print(f"❌ Error checking projects: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    print("🚀 GSC Setup Script")
    print("=" * 50)
    
    check_existing_projects()
    setup_gsc_table()
    
    print("\n🎉 GSC setup completed!")
    print("💡 You can now use the GSC import functionality in the frontend.")