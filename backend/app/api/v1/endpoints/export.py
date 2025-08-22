from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
import csv
import io
from typing import List

from app.db.session import get_db
from app.api.deps import get_simulation_repo, get_page_repo, get_link_repo
from app.repositories.sqlite import SQLiteSimulationRepository, SQLitePageRepository, SQLiteLinkRepository

router = APIRouter()

@router.get("/simulations/{simulation_id}/export/csv")
async def export_simulation_csv(
    simulation_id: int,
    simulation_repo: SQLiteSimulationRepository = Depends(get_simulation_repo),
    page_repo: SQLitePageRepository = Depends(get_page_repo),
    db: Session = Depends(get_db)
):
    """Export simulation results as CSV"""
    
    simulation = await simulation_repo.get_by_id(simulation_id)
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    if simulation.status != "completed":
        raise HTTPException(status_code=400, detail="Simulation not completed")
    
    # Get pages for additional context
    pages = await page_repo.get_by_project(simulation.project_id)
    page_lookup = {page.id: page for page in pages}
    
    # Create CSV output
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'URL',
        'Page Type',
        'Category', 
        'Current PageRank',
        'New PageRank',
        'PageRank Delta',
        'Percent Change'
    ])
    
    # Write data rows
    for result in simulation.results:
        page = page_lookup.get(result.page_id)
        if page:
            percent_change = (result.pagerank_delta / page.current_pagerank * 100) if page.current_pagerank > 0 else 0
            
            writer.writerow([
                page.url,
                page.type or 'other',
                page.category or '',
                f"{page.current_pagerank:.8f}",
                f"{result.new_pagerank:.8f}",
                f"{result.pagerank_delta:.8f}",
                f"{percent_change:.2f}%"
            ])
    
    # Set headers for file download
    csv_content = output.getvalue()
    output.close()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=simulation_{simulation_id}_results.csv"
        }
    )

@router.get("/simulations/{simulation_id}/export/implementation-plan")
async def export_implementation_plan(
    simulation_id: int,
    simulation_repo: SQLiteSimulationRepository = Depends(get_simulation_repo),
    page_repo: SQLitePageRepository = Depends(get_page_repo),
    link_repo: SQLiteLinkRepository = Depends(get_link_repo),
    db: Session = Depends(get_db)
):
    """Export implementation plan - actual links to add (source -> destination)"""
    
    simulation = await simulation_repo.get_by_id(simulation_id)
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    if simulation.status != "completed":
        raise HTTPException(status_code=400, detail="Simulation not completed")
    
    # Import the simulator to regenerate links
    from app.core.rules.multi_rule import MultiRule
    
    # Get pages and existing links
    pages = await page_repo.get_by_project(simulation.project_id)
    links = await link_repo.get_by_project(simulation.project_id)
    
    page_lookup = {page.id: page for page in pages}
    existing_links = [(link.from_page_id, link.to_page_id) for link in links]
    
    # Recreate the same multi-rule used in the simulation
    rules_config = simulation.rules_config
    
    # Handle both old single rule format and new list format
    if isinstance(rules_config, dict) and 'rule_name' in rules_config:
        # Old format - convert to new format
        old_config = rules_config.get('rule_config', {})
        converted_rule = {
            "source_types": [],
            "source_categories": [],
            "target_types": [],
            "target_categories": [],
            "selection_method": "category",
            "links_per_page": old_config.get('links_count', 3),
            "bidirectional": old_config.get('bidirectional', False),
            "avoid_self_links": True
        }
        rules_config = [converted_rule]
    elif not isinstance(rules_config, list):
        rules_config = []
    
    # Generate the same links the simulation created
    multi_rule = MultiRule(rules_config)
    new_links = multi_rule.generate_links(pages, existing_links)
    
    # Create CSV output
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'Action',
        'From URL',
        'To URL',
        'From Page Type',
        'To Page Type',
        'Implementation Notes'
    ])
    
    # Write actual links to add
    if not new_links:
        # If no new links were generated, add an informational row
        writer.writerow([
            'INFO',
            'No new links generated',
            'The simulation rules did not generate any new links',
            'N/A',
            'N/A',
            f'Simulation used {len(rules_config)} rules but generated no new links. This may be because the selected pages already have optimal linking or the rule criteria are too restrictive.'
        ])
    else:
        for from_page_id, to_page_id in new_links:
            from_page = page_lookup.get(from_page_id)
            to_page = page_lookup.get(to_page_id)
            
            if from_page and to_page:
                writer.writerow([
                    'ADD_LINK',
                    from_page.url,
                    to_page.url,
                    from_page.type or 'other',
                    to_page.type or 'other',
                    f'Add internal link from {from_page.type or "page"} to {to_page.type or "page"}'
                ])
    
    csv_content = output.getvalue()
    output.close()
    
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=simulation_{simulation_id}_links_to_add.csv"
        }
    )