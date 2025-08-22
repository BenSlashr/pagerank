#!/usr/bin/env python3

from sqlalchemy import MetaData, create_engine, text
from sqlalchemy.schema import CreateTable
from app.models.simulation import Simulation
from app.core.config import settings
import logging

# Set up logging to see SQL statements
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

def check_model_vs_db():
    print("=== Model Definition ===")
    print("Expected Simulation table schema:")
    
    # Create an engine to generate SQL
    engine = create_engine("sqlite:///:memory:")
    
    # Generate CREATE TABLE statement from model
    create_sql = CreateTable(Simulation.__table__)
    print(str(create_sql.compile(engine)))
    print()
    
    print("=== Database Connection ===")
    print(f"Database URL: {settings.DATABASE_URL}")
    
    try:
        # Connect to actual database  
        engine = create_engine(settings.DATABASE_URL)
        
        with engine.connect() as conn:
            # Check if table exists
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='simulations'"))
            table_exists = result.fetchone()
            
            if table_exists:
                print("✓ Simulations table exists in database")
                
                # Get current schema
                result = conn.execute(text("PRAGMA table_info(simulations)"))
                columns = result.fetchall()
                
                print("\nCurrent database columns:")
                for col in columns:
                    print(f"  {col[1]} ({col[2]})")
                
                # Check for rules_config specifically
                column_names = [col[1] for col in columns]
                if 'rules_config' in column_names:
                    print("\n✓ rules_config column exists")
                else:
                    print("\n✗ rules_config column MISSING")
                    print("Need to add rules_config column with type JSON")
                    
            else:
                print("✗ Simulations table does not exist")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_model_vs_db()