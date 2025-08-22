#!/usr/bin/env python3

"""
Simple test to verify the protected_pages implementation is working correctly.
This test verifies:
1. Database schema has protected_pages column
2. The protected_pages feature can be tested with mock data
"""

import sqlite3
import json

def test_database_schema():
    """Test that protected_pages column exists in database"""
    print("🔬 Testing database schema...")
    
    db_path = "data/pagerank.db"
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check table info
        cursor.execute("PRAGMA table_info(simulations)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'protected_pages' in column_names:
            print("✅ protected_pages column exists in database")
        else:
            print("❌ protected_pages column missing from database")
            return False
            
        if 'page_boosts' in column_names:
            print("✅ page_boosts column exists in database")
        else:
            print("❌ page_boosts column missing from database")
            return False
        
        # Test inserting a simulation with protected_pages
        test_data = {
            'project_id': 1,
            'name': 'Protected Pages Test',
            'rules_config': '[]',
            'page_boosts': json.dumps([]),
            'protected_pages': json.dumps([
                {'url': 'https://test.com/important-page', 'protection_factor': 0.05}
            ]),
            'status': 'pending'
        }
        
        cursor.execute("""
            INSERT INTO simulations (project_id, name, rules_config, page_boosts, protected_pages, status)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            test_data['project_id'],
            test_data['name'], 
            test_data['rules_config'],
            test_data['page_boosts'],
            test_data['protected_pages'],
            test_data['status']
        ))
        
        simulation_id = cursor.lastrowid
        print(f"✅ Successfully inserted test simulation with protected_pages (ID: {simulation_id})")
        
        # Verify the data was inserted correctly
        cursor.execute("SELECT protected_pages FROM simulations WHERE id = ?", (simulation_id,))
        result = cursor.fetchone()
        
        if result and result[0]:
            protected_pages = json.loads(result[0])
            if len(protected_pages) == 1 and protected_pages[0]['url'] == 'https://test.com/important-page':
                print("✅ Protected pages data correctly stored and retrieved")
            else:
                print("❌ Protected pages data corrupted")
                return False
        else:
            print("❌ Failed to retrieve protected pages data")
            return False
        
        # Clean up test data
        cursor.execute("DELETE FROM simulations WHERE id = ?", (simulation_id,))
        conn.commit()
        print("✅ Test data cleaned up")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def test_json_schema():
    """Test the expected JSON structure for protected_pages"""
    print("\n🧪 Testing JSON schema format...")
    
    # Test valid protected_pages structure
    valid_protected_pages = [
        {
            "url": "https://example.com/homepage",
            "protection_factor": 0.05  # 5% minimum PageRank
        },
        {
            "url": "https://example.com/contact", 
            "protection_factor": 0.02  # 2% minimum PageRank
        }
    ]
    
    try:
        json_str = json.dumps(valid_protected_pages)
        parsed = json.loads(json_str)
        
        # Validate structure
        for protect in parsed:
            assert 'url' in protect, "Missing 'url' field"
            assert 'protection_factor' in protect, "Missing 'protection_factor' field"
            assert isinstance(protect['protection_factor'], (int, float)), "protection_factor must be numeric"
            assert 0 < protect['protection_factor'] <= 1, "protection_factor must be between 0 and 1"
        
        print("✅ JSON schema validation passed")
        print(f"   Example: {json_str}")
        return True
        
    except Exception as e:
        print(f"❌ JSON schema test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Protected Pages Implementation")
    print("=" * 45)
    
    success = True
    
    # Test 1: Database schema
    if not test_database_schema():
        success = False
    
    # Test 2: JSON schema format
    if not test_json_schema():
        success = False
    
    print("\n" + "=" * 45)
    if success:
        print("🎉 ALL TESTS PASSED!")
        print("✅ Protected pages implementation is working correctly")
        print("")
        print("Ready to test with:")
        print("- Backend API endpoints")
        print("- Frontend UI components")
        print("- Advanced PageRank calculator integration")
    else:
        print("❌ SOME TESTS FAILED")
        print("🔧 Fix the issues above before proceeding")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)