from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.v1 import api_router
from app.db.base import engine, Base
from app.models import *  # Import all models to register them
from logging_config import setup_logging
import os

# Setup logging for large dataset processing
setup_logging()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PageRank Simulator API",
    description="API for simulating internal PageRank modifications",
    version="1.0.0",
    # Remove default timeouts for large dataset processing
    timeout=None,
    # Configure for reverse proxy deployment
    root_path="/pagerank"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://ndd.fr"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Serve static files (built frontend)
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    # Serve frontend for all non-API routes
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # If it's an API route, let FastAPI handle it normally
        if full_path.startswith("api/"):
            return {"message": "API route"}
        
        # Try to serve the specific file first
        file_path = os.path.join(static_dir, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        
        # Fallback to index.html for client-side routing
        index_file = os.path.join(static_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        
        return {"message": "PageRank Simulator API", "version": "1.0.0"}

@app.get("/")
async def root():
    # Serve frontend index.html if available
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"message": "PageRank Simulator API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}