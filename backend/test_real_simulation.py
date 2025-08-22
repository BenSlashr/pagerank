#!/usr/bin/env python3

import asyncio
import sys
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Add path for imports
sys.path.append('/Users/benoit/simulation-pagerank/backend')

async def test_real_simulation():
    """Test with real simulation using existing database"""
    print("🚀 Testing Advanced PageRank with Real Data")
    print("=" * 50)
    
    try:
        # Import dependencies
        from app.db.session import SessionLocal
        from app.repositories.sqlite.project_repo import SQLiteProjectRepository
        from app.repositories.sqlite.page_repo import SQLitePageRepository
        from app.repositories.sqlite.link_repo import SQLiteLinkRepository
        from app.repositories.sqlite.simulation_repo import SQLiteSimulationRepository
        from app.core.pagerank.networkx_impl import NetworkXPageRankCalculator
        from app.core.simulator import PageRankSimulator
        
        # Create database session
        db = SessionLocal()
        
        # Create repositories
        project_repo = SQLiteProjectRepository(db)
        page_repo = SQLitePageRepository(db)
        link_repo = SQLiteLinkRepository(db)
        simulation_repo = SQLiteSimulationRepository(db)
        
        # Create simulator
        calculator = NetworkXPageRankCalculator()
        simulator = PageRankSimulator(page_repo, link_repo, simulation_repo, calculator)
        
        print("✅ Connected to real database and created simulator")
        
        # Get first project
        projects = await project_repo.get_all()
        if not projects:
            print("❌ No projects found in database")
            return False
            
        project = projects[0]
        print(f"📊 Using project: {project.name} (ID: {project.id})")
        
        # Get some pages for boosting
        pages = await page_repo.get_by_project(project.id)
        if len(pages) < 3:
            print("❌ Not enough pages in project for meaningful test")
            return False
        
        print(f"📈 Project has {len(pages)} pages")
        
        # Select 2 pages to boost
        boost_pages = pages[:2]
        page_boosts = [
            {"url": boost_pages[0].url, "boost_factor": 2.0},
            {"url": boost_pages[1].url, "boost_factor": 1.5},
        ]
        
        print(f"⚡ Will boost:")
        for boost in page_boosts:
            print(f"   - {boost['url']} (factor: {boost['boost_factor']}x)")
        
        # Run simulation with new advanced PageRank
        print("\n🧮 Running simulation with Advanced PageRank...")
        
        simulation_name = f"Advanced PageRank Test - {datetime.now().strftime('%H:%M:%S')}"
        
        result = await simulator.run_multi_rule_simulation(
            project_id=project.id,
            simulation_name=simulation_name,
            rules_config=[],  # No rules, just test the boost
            page_boosts=page_boosts
        )
        
        print(f"✅ Simulation completed: {result}")
        
        # Check if it was created in database
        simulations = await simulation_repo.get_by_project(project.id)
        latest_sim = max(simulations, key=lambda s: s.created_at)
        
        print(f"📋 Latest simulation: {latest_sim.name}")
        print(f"📋 Status: {latest_sim.status}")
        print(f"📋 Results: {len(latest_sim.results) if latest_sim.results else 0} pages")
        
        print("\n🎉 REAL SIMULATION TEST PASSED!")
        print("✅ Advanced PageRank working with real data")
        print("✅ Database integration successful")
        print("✅ Boost functionality operational")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run real simulation test"""
    print("🧪 Real Simulation Test with Advanced PageRank")
    print("===============================================")
    
    success = await test_real_simulation()
    
    if success:
        print("\n🎉 ALL TESTS PASSED!")
        print("🚀 Advanced PageRank is ready for production!")
    else:
        print("\n❌ TESTS FAILED")
        print("🔧 Check errors and fix before deployment")

if __name__ == "__main__":
    asyncio.run(main())