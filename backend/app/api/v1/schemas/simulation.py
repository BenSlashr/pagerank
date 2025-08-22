from pydantic import BaseModel
from typing import Dict, List, Any, Optional
from datetime import datetime

class LinkingRule(BaseModel):
    """Single linking rule configuration"""
    source_types: List[str] = []  # Page types to link from (empty = all)
    source_categories: List[str] = []  # Categories to link from (empty = all)
    target_types: List[str] = []  # Page types to link to (empty = all)
    target_categories: List[str] = []  # Categories to link to (empty = all)
    selection_method: str = "category"  # category, semantic, random, pagerank
    links_per_page: int = 3
    bidirectional: bool = False
    avoid_self_links: bool = True

class PageBoost(BaseModel):
    """Configuration for boosting specific pages"""
    url: str
    boost_factor: float  # Multiplier for PageRank (e.g., 2.0 = double the PageRank)

class PageProtect(BaseModel):
    """Configuration for protecting specific pages"""
    url: str
    protection_factor: float  # Minimum PageRank threshold to maintain (e.g., 0.05 = 5% minimum)

class SimulationCreate(BaseModel):
    name: str
    rules: List[LinkingRule]  # Multiple rules that will be applied cumulatively
    page_boosts: List[PageBoost] = []  # Optional URL-specific boosts
    protected_pages: List[PageProtect] = []  # Optional page protection

class SimulationResponse(BaseModel):
    id: int
    name: str
    status: str
    project_id: int  # Added for GSC data fetching
    rules: List[LinkingRule]  # Multiple rules instead of single rule_config
    page_boosts: List[PageBoost] = []  # URL-specific boosts
    protected_pages: List[PageProtect] = []  # Page protection
    created_at: datetime
    
    class Config:
        from_attributes = True

class SimulationResult(BaseModel):
    page_id: int
    url: str
    type: Optional[str]
    category: Optional[str]
    current_pagerank: float
    new_pagerank: float
    pagerank_delta: float
    percent_change: float

class SimulationDetails(BaseModel):
    simulation: SimulationResponse
    results: List[SimulationResult]

class RuleInfo(BaseModel):
    name: str
    class_name: str
    description: str
    module: str

class PreviewRequest(BaseModel):
    rules: List[LinkingRule]  # Preview multiple rules
    preview_count: int = 5

class PreviewLink(BaseModel):
    from_url: str
    to_url: str
    from_type: Optional[str]
    to_type: Optional[str]
    from_category: Optional[str]
    to_category: Optional[str]

class PreviewResponse(BaseModel):
    rules_applied: int  # Number of rules processed
    total_new_links: int
    preview_links: List[PreviewLink]
    truncated: bool