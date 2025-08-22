from abc import ABC, abstractmethod
from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session

class BaseRepository(ABC):
    def __init__(self, db: Session):
        self.db = db

class ProjectRepository(ABC):
    @abstractmethod
    async def create(self, name: str, domain: str) -> Any: pass
    
    @abstractmethod
    async def get_by_id(self, project_id: int) -> Optional[Any]: pass
    
    @abstractmethod
    async def get_all(self) -> List[Any]: pass
    
    @abstractmethod
    async def update_total_pages(self, project_id: int, count: int) -> None: pass
    
    @abstractmethod
    async def update_page_types(self, project_id: int, page_types: List[str]) -> None: pass

class PageRepository(ABC):
    @abstractmethod
    async def get_by_project(self, project_id: int) -> List[Any]: pass
    
    @abstractmethod
    async def bulk_insert(self, pages: List[Dict]) -> None: pass
    
    @abstractmethod
    async def update_pagerank(self, page_id: int, pagerank: float) -> None: pass
    
    @abstractmethod
    async def bulk_update_pagerank(self, updates: List[Dict]) -> None: pass
    
    @abstractmethod
    async def get_by_url(self, project_id: int, url: str) -> Optional[Any]: pass

class LinkRepository(ABC):
    @abstractmethod
    async def get_by_project(self, project_id: int) -> List[Any]: pass
    
    @abstractmethod
    async def bulk_insert(self, links: List[Dict]) -> None: pass
    
    @abstractmethod
    async def delete_by_project(self, project_id: int) -> None: pass

class SimulationRepository(ABC):
    @abstractmethod
    async def create(self, project_id: int, name: str, rules_config: List[Dict], page_boosts: List[Dict] = None, protected_pages: List[Dict] = None) -> Any: pass
    
    @abstractmethod
    async def get_by_id(self, simulation_id: int) -> Optional[Any]: pass
    
    @abstractmethod
    async def get_by_project(self, project_id: int) -> List[Any]: pass
    
    @abstractmethod
    async def update_status(self, simulation_id: int, status: str) -> None: pass
    
    @abstractmethod
    async def save_results(self, simulation_id: int, results: List[Dict]) -> None: pass