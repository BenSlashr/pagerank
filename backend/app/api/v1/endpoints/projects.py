from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import tempfile
import os
import json

from app.db.session import get_db
from app.api.deps import get_project_repo, get_page_repo, get_import_service, get_link_repo, get_gsc_repo
from app.api.v1.schemas.project import ProjectResponse, ImportRequest, ImportResponse
from app.api.v1.schemas.page import PageResponse
from app.repositories.sqlite import SQLiteProjectRepository, SQLitePageRepository, SQLiteLinkRepository
from app.services.import_service import ImportService
from app.core.pagerank.networkx_impl import NetworkXPageRankCalculator
from app.core.config import settings

router = APIRouter()

async def convert_project_to_response(project, page_repo=None) -> ProjectResponse:
    """Convert project model to response with parsed page_types and PageRank status"""
    page_types = None
    if project.page_types:
        try:
            page_types = json.loads(project.page_types)
        except (json.JSONDecodeError, TypeError):
            page_types = None
    
    # Calculate PageRank status
    pagerank_status = "unknown"
    if page_repo:
        try:
            # Count pages with calculated PageRank (> 0)
            pages_with_pagerank = await page_repo.count_pages_with_pagerank(project.id)
            total_pages = project.total_pages or 0
            
            if total_pages == 0:
                pagerank_status = "empty"
            elif pages_with_pagerank == 0:
                pagerank_status = "not_calculated"
            elif pages_with_pagerank == total_pages:
                pagerank_status = "calculated"
            else:
                pagerank_status = "partially_calculated"
        except Exception:
            pagerank_status = "not_calculated"
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        domain=project.domain,
        total_pages=project.total_pages,
        page_types=page_types,
        pagerank_status=pagerank_status,
        created_at=project.created_at
    )

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    project_repo: SQLiteProjectRepository = Depends(get_project_repo)
):
    """List all projects"""
    projects = await project_repo.get_all()
    return [await convert_project_to_response(project) for project in projects]

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    project_repo: SQLiteProjectRepository = Depends(get_project_repo)
):
    """Get project by ID"""
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return await convert_project_to_response(project)

@router.get("/{project_id}/pages", response_model=List[PageResponse])
async def get_project_pages(
    project_id: int,
    page_repo: SQLitePageRepository = Depends(get_page_repo)
):
    """Get all pages for a project"""
    pages = await page_repo.get_by_project(project_id)
    return pages

@router.post("/import-multi", response_model=ImportResponse)
async def import_multi_csv(
    project_name: str = Form(...),
    files: List[UploadFile] = File(...),
    import_service: ImportService = Depends(get_import_service)
):
    """Import multiple Screaming Frog CSV files with automatic detection"""
    
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="At least one CSV file is required")
    
    if len(files) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 files allowed")
    
    # Validate all files are CSV
    for file in files:
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail=f"File {file.filename} must be a CSV")
    
    temp_files = []
    try:
        # Save all files temporarily
        for file in files:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as temp_file:
                content = await file.read()
                temp_file.write(content)
                temp_files.append({
                    'name': file.filename,
                    'path': temp_file.name,
                    'size': len(content)
                })
        
        # Import with automatic file detection
        result = await import_service.import_multi_screaming_frog_csv(project_name, temp_files)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temporary files
        for temp_file in temp_files:
            try:
                os.unlink(temp_file['path'])
            except:
                pass

@router.post("/import", response_model=ImportResponse)
async def import_csv(
    project_name: str = Form(...),
    file: UploadFile = File(...),
    import_service: ImportService = Depends(get_import_service)
):
    """Import Screaming Frog CSV file"""
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name
    
    try:
        # Import the CSV
        result = await import_service.import_screaming_frog_csv(project_name, temp_path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.unlink(temp_path)

@router.post("/{project_id}/calculate-pagerank")
async def calculate_pagerank(
    project_id: int,
    project_repo: SQLiteProjectRepository = Depends(get_project_repo),
    page_repo: SQLitePageRepository = Depends(get_page_repo),
    link_repo: SQLiteLinkRepository = Depends(get_link_repo)
):
    """Calculate/recalculate PageRank for a project"""
    
    # Verify project exists
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get all pages and links for this project
    pages = await page_repo.get_by_project(project_id)
    links = await link_repo.get_by_project(project_id)
    
    if not pages:
        raise HTTPException(status_code=400, detail="No pages found for project")
    
    # Convert links to tuples
    link_tuples = [(link.from_page_id, link.to_page_id) for link in links]
    
    # Convert pages to dict format
    pages_data = [
        {
            'id': page.id,
            'url': page.url,
            'type': page.type,
            'category': page.category
        } 
        for page in pages
    ]
    
    # Calculate PageRank
    calculator = NetworkXPageRankCalculator()
    pagerank_scores = await calculator.calculate(
        pages_data, 
        link_tuples,
        damping=settings.PAGERANK_DAMPING
    )
    
    # Get graph stats
    graph_stats = calculator.get_graph_stats(pages_data, link_tuples)
    
    # Prepare bulk updates for much better performance
    print(f"🔄 Preparing bulk update for {len(pages)} pages...")
    
    updates = []
    for page in pages:
        new_pagerank = pagerank_scores.get(page.id, 0.0)
        updates.append({
            'page_id': page.id,
            'pagerank': new_pagerank
        })
    
    # Execute bulk update - much faster than individual updates
    print(f"🚀 Starting bulk PageRank update...")
    await page_repo.bulk_update_pagerank(updates)
    
    updated_count = len(updates)
    
    return {
        "project_id": project_id,
        "pages_updated": updated_count,
        "total_links": len(link_tuples),
        "graph_stats": graph_stats,
        "pagerank_range": {
            "min": min(pagerank_scores.values()) if pagerank_scores else 0,
            "max": max(pagerank_scores.values()) if pagerank_scores else 0,
            "total": sum(pagerank_scores.values()) if pagerank_scores else 0
        }
    }

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: dict,
    project_repo: SQLiteProjectRepository = Depends(get_project_repo)
):
    """Update project details"""
    
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update allowed fields
    if "name" in project_data:
        await project_repo.update_name(project_id, project_data["name"])
    
    # Get updated project
    updated_project = await project_repo.get_by_id(project_id)
    return updated_project

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    project_repo: SQLiteProjectRepository = Depends(get_project_repo),
    page_repo: SQLitePageRepository = Depends(get_page_repo),
    link_repo: SQLiteLinkRepository = Depends(get_link_repo)
):
    """Delete project and all associated data"""
    
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete associated data in correct order
    await link_repo.delete_by_project(project_id)
    await page_repo.delete_by_project(project_id)
    await project_repo.delete(project_id)
    
    return {"message": f"Project {project_id} deleted successfully"}

@router.post("/{project_id}/import-gsc", response_model=dict)
async def import_gsc_data(
    project_id: int,
    file: UploadFile = File(...),
    period_start: str = Form(None),
    period_end: str = Form(None),
    project_repo: SQLiteProjectRepository = Depends(get_project_repo),
    gsc_repo = Depends(get_gsc_repo)
):
    """Import Google Search Console CSV data for a project"""
    
    # Verify project exists
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as temp_file:
        content = await file.read()
        temp_file.write(content)
        temp_path = temp_file.name
    
    try:
        # Import GSC data
        result = await gsc_repo.import_gsc_csv(
            project_id=project_id, 
            csv_path=temp_path,
            period_start=period_start,
            period_end=period_end
        )
        
        return {
            "project_id": project_id,
            "imported_rows": result["imported_rows"],
            "matched_pages": result["matched_pages"],
            "unmatched_urls": result["unmatched_urls"],
            "import_date": result["import_date"],
            "message": f"Successfully imported {result['imported_rows']} GSC records for project {project.name}"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"GSC import failed: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.unlink(temp_path)

@router.get("/{project_id}/gsc-data")
async def get_gsc_data(
    project_id: int,
    project_repo: SQLiteProjectRepository = Depends(get_project_repo),
    gsc_repo = Depends(get_gsc_repo)
):
    """Get GSC data for a project"""
    
    # Verify project exists
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get GSC data
    gsc_data = await gsc_repo.get_by_project(project_id)
    
    # Calculate summary stats
    total_impressions = sum(row.impressions for row in gsc_data)
    total_clicks = sum(row.clicks for row in gsc_data)
    avg_ctr = sum(row.ctr for row in gsc_data) / len(gsc_data) if gsc_data else 0
    avg_position = sum(row.position for row in gsc_data) / len(gsc_data) if gsc_data else 0
    
    return {
        "project_id": project_id,
        "total_urls": len(gsc_data),
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "average_ctr": avg_ctr,
        "average_position": avg_position,
        "data": [
            {
                "url": row.url,
                "impressions": row.impressions,
                "clicks": row.clicks,
                "ctr": row.ctr,
                "position": row.position,
                "page_id": row.page_id,
                "import_date": row.import_date.isoformat() if row.import_date else None
            }
            for row in gsc_data
        ]
    }

@router.get("/{project_id}/gsc-pagerank-analysis")
async def get_gsc_pagerank_analysis(
    project_id: int,
    project_repo: SQLiteProjectRepository = Depends(get_project_repo),
    gsc_repo = Depends(get_gsc_repo)
):
    """Get combined GSC + PageRank analysis with actionable insights"""
    
    # Verify project exists
    project = await project_repo.get_by_id(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get combined analysis
    analysis = await gsc_repo.get_gsc_pagerank_analysis(project_id)
    
    return {
        "project_id": project_id,
        "project_name": project.name,
        **analysis
    }

