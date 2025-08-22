from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.project import Project
from app.repositories.base import ProjectRepository

class SQLiteProjectRepository(ProjectRepository):
    def __init__(self, db: Session):
        self.db = db
    
    async def create(self, name: str, domain: str) -> Project:
        project = Project(name=name, domain=domain)
        self.db.add(project)
        self.db.commit()
        self.db.refresh(project)
        return project
    
    async def get_by_id(self, project_id: int) -> Optional[Project]:
        return self.db.query(Project).filter(Project.id == project_id).first()
    
    async def get_all(self) -> List[Project]:
        return self.db.query(Project).all()
    
    async def update_total_pages(self, project_id: int, count: int) -> None:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.total_pages = count
            self.db.commit()
    
    async def update_page_types(self, project_id: int, page_types: List[str]) -> None:
        import json
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.page_types = json.dumps(page_types)
            self.db.commit()
    
    async def update_name(self, project_id: int, name: str) -> None:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if project:
            project.name = name
            self.db.commit()
    
    async def delete(self, project_id: int) -> None:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if project:
            self.db.delete(project)
            self.db.commit()