from pydantic import BaseModel
from typing import Optional

class PageResponse(BaseModel):
    id: int
    project_id: int
    url: str
    type: Optional[str]
    category: Optional[str]
    current_pagerank: float
    
    class Config:
        from_attributes = True