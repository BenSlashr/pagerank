from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from app.models.simulation import Simulation, SimulationResult
from app.repositories.base import SimulationRepository

class SQLiteSimulationRepository(SimulationRepository):
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, project_id: int, name: str, rules_config: List[Dict], page_boosts: List[Dict] = None, protected_pages: List[Dict] = None) -> Simulation:
        simulation = Simulation(
            project_id=project_id,
            name=name,
            rules_config=rules_config,
            page_boosts=page_boosts or [],
            protected_pages=protected_pages or []
        )
        self.db.add(simulation)
        self.db.commit()
        self.db.refresh(simulation)
        return simulation
    
    async def get_by_id(self, simulation_id: int) -> Optional[Simulation]:
        return self.db.query(Simulation).filter(Simulation.id == simulation_id).first()
    
    async def get_by_project(self, project_id: int) -> List[Simulation]:
        return self.db.query(Simulation).filter(Simulation.project_id == project_id).all()
    
    async def update_status(self, simulation_id: int, status: str) -> None:
        simulation = self.db.query(Simulation).filter(Simulation.id == simulation_id).first()
        if simulation:
            simulation.status = status
            self.db.commit()
    
    async def save_results(self, simulation_id: int, results: List[Dict]) -> None:
        result_objects = [
            SimulationResult(simulation_id=simulation_id, **result_data) 
            for result_data in results
        ]
        self.db.bulk_save_objects(result_objects)
        self.db.commit()