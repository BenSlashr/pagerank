from fastapi import APIRouter
from app.api.v1.endpoints import projects, simulations, export

api_router = APIRouter()

api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(simulations.router, prefix="", tags=["simulations"])  
api_router.include_router(export.router, prefix="/export", tags=["export"])