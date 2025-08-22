from typing import Generator
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.repositories.sqlite import (
    SQLiteProjectRepository,
    SQLitePageRepository,
    SQLiteLinkRepository, 
    SQLiteSimulationRepository
)
from app.repositories.gsc_repository import SQLiteGSCRepository
from app.services.import_service import ImportService
from app.services.simulation_service import SimulationService

def get_project_repo(db: Session = Depends(get_db)) -> SQLiteProjectRepository:
    return SQLiteProjectRepository(db)

def get_page_repo(db: Session = Depends(get_db)) -> SQLitePageRepository:
    return SQLitePageRepository(db)

def get_link_repo(db: Session = Depends(get_db)) -> SQLiteLinkRepository:
    return SQLiteLinkRepository(db)

def get_simulation_repo(db: Session = Depends(get_db)) -> SQLiteSimulationRepository:
    return SQLiteSimulationRepository(db)

def get_gsc_repo(db: Session = Depends(get_db)) -> SQLiteGSCRepository:
    return SQLiteGSCRepository(db)

def get_import_service(
    db: Session = Depends(get_db)
) -> ImportService:
    project_repo = SQLiteProjectRepository(db)
    page_repo = SQLitePageRepository(db)
    link_repo = SQLiteLinkRepository(db)
    
    return ImportService(project_repo, page_repo, link_repo)

def get_simulation_service(
    db: Session = Depends(get_db)
) -> SimulationService:
    project_repo = SQLiteProjectRepository(db)
    page_repo = SQLitePageRepository(db)
    link_repo = SQLiteLinkRepository(db)
    simulation_repo = SQLiteSimulationRepository(db)
    
    return SimulationService(project_repo, page_repo, link_repo, simulation_repo)