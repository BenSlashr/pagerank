from fastapi import APIRouter, Depends, HTTPException
from typing import List

from app.api.deps import get_simulation_service
from app.api.v1.schemas.simulation import (
    SimulationCreate, SimulationResponse, SimulationDetails, 
    RuleInfo, PreviewRequest, PreviewResponse
)
from app.services.simulation_service import SimulationService

router = APIRouter()

@router.get("/rules", response_model=List[RuleInfo])
async def get_available_rules(
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """Get list of available linking rules"""
    return await simulation_service.get_available_rules()

@router.post("/projects/{project_id}/simulations", response_model=dict)
async def create_simulation(
    project_id: int,
    simulation_data: SimulationCreate,
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """Create and run a new simulation with multiple rules"""
    try:
        result = await simulation_service.create_simulation(
            project_id,
            simulation_data.name,
            simulation_data.rules,
            simulation_data.page_boosts,
            simulation_data.protected_pages
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.get("/projects/{project_id}/simulations", response_model=List[SimulationResponse])
async def list_simulations(
    project_id: int,
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """List all simulations for a project"""
    return await simulation_service.list_simulations(project_id)

@router.get("/simulations/{simulation_id}", response_model=SimulationDetails)
async def get_simulation(
    simulation_id: int,
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """Get simulation details and results"""
    try:
        return await simulation_service.get_simulation(simulation_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/projects/{project_id}/preview", response_model=PreviewResponse)
async def preview_rules(
    project_id: int,
    preview_data: PreviewRequest,
    simulation_service: SimulationService = Depends(get_simulation_service)
):
    """Preview what links multiple rules would generate"""
    try:
        return await simulation_service.preview_rules(
            project_id,
            preview_data.rules,
            preview_data.preview_count
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")