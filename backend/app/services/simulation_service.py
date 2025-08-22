from typing import Dict, List
from app.core.simulator import PageRankSimulator
from app.repositories.base import PageRepository, LinkRepository, SimulationRepository, ProjectRepository
from app.core.pagerank.networkx_impl import NetworkXPageRankCalculator
from app.api.v1.schemas.simulation import LinkingRule, PageBoost, PageProtect

class SimulationService:
    """Service layer for simulation operations"""
    
    def __init__(self,
                 project_repo: ProjectRepository,
                 page_repo: PageRepository, 
                 link_repo: LinkRepository,
                 simulation_repo: SimulationRepository):
        self.project_repo = project_repo
        self.page_repo = page_repo
        self.link_repo = link_repo
        self.simulation_repo = simulation_repo
        
        # Initialize simulator with NetworkX calculator
        self.simulator = PageRankSimulator(
            page_repo, link_repo, simulation_repo,
            NetworkXPageRankCalculator()
        )
    
    async def create_simulation(self,
                               project_id: int,
                               simulation_name: str,
                               rules: List[LinkingRule],
                               page_boosts: List[PageBoost] = None,
                               protected_pages: List[PageProtect] = None) -> Dict:
        """Create and run a new simulation with multiple rules"""
        
        # Validate project exists
        project = await self.project_repo.get_by_id(project_id)
        if not project:
            raise ValueError("Project not found")
        
        # Convert LinkingRule objects to dict format for the simulator
        rules_config = [rule.model_dump() for rule in rules]
        
        # Convert PageBoost objects to dict format if provided
        page_boosts_config = []
        if page_boosts:
            page_boosts_config = [boost.model_dump() for boost in page_boosts]
        
        # Convert PageProtect objects to dict format if provided
        protected_pages_config = []
        if protected_pages:
            protected_pages_config = [protect.model_dump() for protect in protected_pages]
        
        # Run simulation using the multi-rule approach with page boosts and protection
        result = await self.simulator.run_multi_rule_simulation(
            project_id, simulation_name, rules_config, page_boosts_config, protected_pages_config
        )
        
        return result
    
    async def get_simulation(self, simulation_id: int) -> Dict:
        """Get simulation details and results"""
        return await self.simulator.get_simulation_results(simulation_id)
    
    async def list_simulations(self, project_id: int) -> List[Dict]:
        """List all simulations for a project"""
        simulations = await self.simulation_repo.get_by_project(project_id)
        
        result = []
        for sim in simulations:
            # Convert old format rules_config to new LinkingRule format
            rules_data = sim.rules_config
            
            # Handle both old single rule format and new list format
            if isinstance(rules_data, dict) and 'rule_name' in rules_data:
                # Old format - single rule with rule_name and rule_config
                old_config = rules_data.get('rule_config', {})
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
                rules = [converted_rule]
            elif isinstance(rules_data, list):
                # New format - already a list
                rules = rules_data
            else:
                # Fallback for unknown format
                rules = []
            
            # Handle page_boosts (ensure it exists and is valid)
            page_boosts = getattr(sim, 'page_boosts', []) or []
            
            # Handle protected_pages (ensure it exists and is valid)
            protected_pages = getattr(sim, 'protected_pages', []) or []
            
            result.append({
                "id": sim.id,
                "name": sim.name,
                "status": sim.status,
                "project_id": project_id,  # Add missing project_id field
                "rules": rules,
                "page_boosts": page_boosts,
                "protected_pages": protected_pages,
                "created_at": sim.created_at
            })
        
        return result
    
    async def get_available_rules(self) -> List[Dict]:
        """Get list of available linking rules"""
        return self.simulator.rule_engine.get_available_rules()
    
    async def preview_rules(self,
                           project_id: int,
                           rules: List[LinkingRule],
                           preview_count: int = 5) -> Dict:
        """Preview what links multiple rules would generate (limited sample)"""
        
        # Load pages and links
        pages = await self.page_repo.get_by_project(project_id)
        links = await self.link_repo.get_by_project(project_id)
        
        if not pages:
            raise ValueError("No pages found for this project")
        
        existing_links = [(link.from_page_id, link.to_page_id) for link in links]
        
        # Convert LinkingRule objects to dict format
        rules_config = [rule.model_dump() for rule in rules]
        
        # Apply multi-rule to generate links
        new_links = await self.simulator.preview_multi_rule_links(
            pages, existing_links, rules_config
        )
        
        # Create page lookup for preview
        page_lookup = {page.id: page for page in pages}
        
        # Format preview
        preview_links = []
        for i, (from_id, to_id) in enumerate(new_links[:preview_count]):
            from_page = page_lookup.get(from_id)
            to_page = page_lookup.get(to_id)
            
            if from_page and to_page:
                preview_links.append({
                    "from_url": from_page.url,
                    "to_url": to_page.url,
                    "from_type": from_page.type,
                    "to_type": to_page.type,
                    "from_category": from_page.category,
                    "to_category": to_page.category
                })
        
        return {
            "rules_applied": len(rules),
            "total_new_links": len(new_links),
            "preview_links": preview_links,
            "truncated": len(new_links) > preview_count
        }