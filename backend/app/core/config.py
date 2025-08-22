from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/pagerank.db"
    MAX_PAGES_IMPORT: int = 500000  # Increased for large sites (50k+ pages)
    PAGERANK_DAMPING: float = 0.85
    PAGERANK_MAX_ITER: int = 200  # Increased iterations for large graphs
    PAGERANK_TOLERANCE: float = 1e-6
    USE_SEMANTIC_WEIGHTS: bool = False  # Disabled by default
    
    class Config:
        env_file = ".env"

settings = Settings()