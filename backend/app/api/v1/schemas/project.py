from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    domain: str

class ProjectResponse(BaseModel):
    id: int
    name: str
    domain: str
    total_pages: int
    page_types: Optional[List[str]] = None
    pagerank_status: str = "not_calculated"  # "not_calculated", "calculated", "partially_calculated", "empty", "unknown"
    created_at: datetime
    
    class Config:
        from_attributes = True

class ImportRequest(BaseModel):
    project_name: str

class ImportResponse(BaseModel):
    project_id: int
    project_name: str
    domain: str
    pages_imported: int
    links_imported: int