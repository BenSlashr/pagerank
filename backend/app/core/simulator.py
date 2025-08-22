from typing import Dict, List, Tuple, Any
import logging
from app.core.pagerank.calculator import PageRankCalculator
from app.core.pagerank.advanced_impl import AdvancedPageRankCalculator
from app.core.rules.engine import RuleEngine
from app.core.rules.multi_rule import MultiRule
from app.repositories.base import PageRepository, LinkRepository, SimulationRepository
from app.services.semantic_service import SemanticService
from app.core.config import settings

logger = logging.getLogger(__name__)

class PageRankSimulator:
    """Core orchestrator for PageRank simulations"""
    
    def __init__(self,
                 page_repo: PageRepository,
                 link_repo: LinkRepository,
                 simulation_repo: SimulationRepository,
                 pagerank_calculator: PageRankCalculator):
        self.page_repo = page_repo
        self.link_repo = link_repo
        self.simulation_repo = simulation_repo
        self.pagerank_calculator = pagerank_calculator
        self.rule_engine = RuleEngine()
    
    async def run_simulation(self, 
                           project_id: int, 
                           simulation_name: str,
                           rule_name: str, 
                           rule_config: Dict) -> Dict:
        """Run a complete PageRank simulation"""
        
        # Create simulation record
        simulation = await self.simulation_repo.create(
            project_id, simulation_name, {
                "rule_name": rule_name,
                "rule_config": rule_config
            }
        )
        
        try:
            await self.simulation_repo.update_status(simulation.id, "running")
            
            # Load current pages and links
            pages = await self.page_repo.get_by_project(project_id)
            links = await self.link_repo.get_by_project(project_id)
            
            if not pages:
                raise ValueError("No pages found for this project")
            
            # Convert links to tuples
            existing_links = [(link.from_page_id, link.to_page_id) for link in links]
            
            # Calculate current PageRank if not already calculated
            await self._ensure_current_pagerank(pages, existing_links)
            
            # Apply rule to generate new links
            rule = self.rule_engine.create_rule(rule_name, rule_config)
            new_links = self.rule_engine.apply_rule(rule, pages, existing_links)
            
            # Handle link removal for menu/footer modifications
            if hasattr(rule, 'is_removal_rule') and rule.is_removal_rule():
                # Remove specified links instead of adding them
                links_to_remove = set(new_links)
                all_links = [link for link in existing_links if link not in links_to_remove]
                new_links = []  # No new links, only removals
            else:
                # Normal behavior: add new links
                all_links = existing_links + new_links
            
            # Create link weights based on position
            position_weights = {}
            if hasattr(rule, 'get_link_weight_multiplier'):
                position_weight = rule.get_link_weight_multiplier()
                # Apply position weight to new links only
                for link in new_links:
                    position_weights[link] = position_weight
                # Existing links keep default weight of 1.0
                for link in existing_links:
                    position_weights[link] = 1.0
            else:
                # Default position weights for all links
                for link in all_links:
                    position_weights[link] = 1.0
            
            # Apply semantic analysis by default (realistic PageRank)
            final_weights = position_weights
            if not rule_config.get('legacy_uniform_weights', False):
                logger.info("Calculating semantic weights for realistic PageRank simulation...")
                semantic_service = SemanticService(self.page_repo)
                
                similarity_threshold = rule_config.get('semantic_threshold', 0.4)
                semantic_weights = await semantic_service.calculate_semantic_weights(
                    pages, all_links, similarity_threshold
                )
                
                # Combine position and semantic weights (50/50) - Default Google-like behavior
                final_weights = semantic_service.combine_weights(
                    position_weights, semantic_weights
                )
                logger.info(f"Applied semantic relevance to {len([w for w in semantic_weights.values() if w > 0])} relevant links")
            else:
                logger.info("Using legacy uniform weights (academic mode - ignoring semantic relevance)")
            
            new_pagerank = await self.pagerank_calculator.calculate(
                pages, all_links,
                damping=settings.PAGERANK_DAMPING,
                max_iter=settings.PAGERANK_MAX_ITER,
                tolerance=settings.PAGERANK_TOLERANCE,
                link_weights=final_weights
            )
            
            # Prepare results
            results = []
            for page in pages:
                page_id = page.id
                current_pr = page.current_pagerank
                new_pr = new_pagerank.get(page_id, current_pr)
                delta = new_pr - current_pr
                
                results.append({
                    "page_id": page_id,
                    "new_pagerank": new_pr,
                    "pagerank_delta": delta
                })
            
            # Save results
            await self.simulation_repo.save_results(simulation.id, results)
            await self.simulation_repo.update_status(simulation.id, "completed")
            
            # Prepare summary
            summary = self._create_simulation_summary(
                pages, results, new_links, rule.get_description()
            )
            
            return {
                "simulation_id": simulation.id,
                "status": "completed",
                "summary": summary,
                "new_links_count": len(new_links)
            }
            
        except Exception as e:
            await self.simulation_repo.update_status(simulation.id, "failed")
            raise ValueError(f"Simulation failed: {str(e)}")
    
    async def _ensure_current_pagerank(self, pages: List[Any], links: List[Tuple[int, int]]):
        """Calculate initial PageRank if pages don't have scores"""
        needs_calculation = any(page.current_pagerank == 0.0 for page in pages)
        
        if needs_calculation:
            current_pagerank = await self.pagerank_calculator.calculate(
                pages, links,
                damping=settings.PAGERANK_DAMPING,
                max_iter=settings.PAGERANK_MAX_ITER,
                tolerance=settings.PAGERANK_TOLERANCE
            )
            
            # Update pages with calculated PageRank
            for page in pages:
                if page.current_pagerank == 0.0:
                    new_pr = current_pagerank.get(page.id, 1.0 / len(pages))
                    await self.page_repo.update_pagerank(page.id, new_pr)
                    page.current_pagerank = new_pr
    
    def _create_simulation_summary(self, 
                                  pages: List[Any], 
                                  results: List[Dict],
                                  new_links: List[Tuple[int, int]],
                                  rule_description: str) -> Dict:
        """Create a summary of simulation results"""
        
        deltas = [r["pagerank_delta"] for r in results]
        positive_changes = [d for d in deltas if d > 0]
        negative_changes = [d for d in deltas if d < 0]
        
        return {
            "rule_description": rule_description,
            "total_pages": len(pages),
            "new_links_added": len(new_links),
            "pages_with_positive_change": len(positive_changes),
            "pages_with_negative_change": len(negative_changes),
            "pages_unchanged": len(deltas) - len(positive_changes) - len(negative_changes),
            "average_delta": sum(deltas) / len(deltas) if deltas else 0,
            "max_positive_delta": max(positive_changes) if positive_changes else 0,
            "max_negative_delta": min(negative_changes) if negative_changes else 0,
            "total_pagerank_redistribution": sum(abs(d) for d in deltas)
        }
    
    async def get_simulation_results(self, simulation_id: int) -> Dict:
        """Get detailed results for a simulation"""
        simulation = await self.simulation_repo.get_by_id(simulation_id)
        if not simulation:
            raise ValueError("Simulation not found")
        
        # Get pages for additional context
        pages = await self.page_repo.get_by_project(simulation.project_id)
        page_lookup = {page.id: page for page in pages}
        
        # Format results with page details
        detailed_results = []
        for result in simulation.results:
            page = page_lookup.get(result.page_id)
            if page:
                detailed_results.append({
                    "page_id": result.page_id,
                    "url": page.url,
                    "type": page.type,
                    "category": page.category,
                    "current_pagerank": page.current_pagerank,
                    "new_pagerank": result.new_pagerank,
                    "pagerank_delta": result.pagerank_delta,
                    "percent_change": (result.pagerank_delta / page.current_pagerank * 100) if page.current_pagerank > 0 else 0
                })
        
        # Convert old format rules_config to new format if needed
        rules_data = simulation.rules_config
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
        page_boosts = getattr(simulation, 'page_boosts', []) or []
        
        # Handle protected_pages (ensure it exists and is valid)
        protected_pages = getattr(simulation, 'protected_pages', []) or []

        return {
            "simulation": {
                "id": simulation.id,
                "name": simulation.name,
                "status": simulation.status,
                "project_id": simulation.project_id,  # Added for GSC data fetching
                "rules": rules,
                "page_boosts": page_boosts,
                "protected_pages": protected_pages,
                "created_at": simulation.created_at
            },
            "results": detailed_results
        }
    
    async def run_multi_rule_simulation(self, 
                                       project_id: int, 
                                       simulation_name: str,
                                       rules_config: List[Dict],
                                       page_boosts: List[Dict] = None,
                                       protected_pages: List[Dict] = None) -> Dict:
        """Run a simulation with multiple rules applied cumulatively"""
        
        # Create simulation record with multiple rules, page boosts, and protected pages
        simulation = await self.simulation_repo.create(
            project_id, simulation_name, rules_config, page_boosts, protected_pages
        )
        
        try:
            await self.simulation_repo.update_status(simulation.id, "running")
            
            # Load current pages and links
            pages = await self.page_repo.get_by_project(project_id)
            links = await self.link_repo.get_by_project(project_id)
            
            if not pages:
                raise ValueError("No pages found for this project")
            
            # Convert links to tuples
            existing_links = [(link.from_page_id, link.to_page_id) for link in links]
            
            # Ensure all pages have current PageRank
            await self._ensure_current_pagerank(pages, existing_links)
            
            # Create multi-rule and apply it
            multi_rule = MultiRule(rules_config)
            new_links = multi_rule.generate_links(pages, existing_links)
            
            # DEBUG: Log link generation results
            logger.info(f"🔗 Link generation results:")
            logger.info(f"   📊 Existing links: {len(existing_links)}")
            logger.info(f"   ✨ New links generated: {len(new_links)}")
            logger.info(f"   📝 Rules applied: {len(rules_config)}")
            if len(new_links) == 0:
                logger.warning(f"⚠️  NO NEW LINKS GENERATED! This will result in identical PageRank")
            
            # Combine existing and new links
            all_links = existing_links + new_links
            
            # Calculate semantic weights if enabled
            semantic_weights = {}
            final_weights = None
            
            if settings.USE_SEMANTIC_WEIGHTS and hasattr(self, 'semantic_service') and self.semantic_service:
                semantic_weights = await self.semantic_service.calculate_semantic_weights(
                    new_links, pages
                )
                final_weights = self._merge_link_weights({}, semantic_weights)
                logger.info(f"Applied semantic relevance to {len([w for w in semantic_weights.values() if w > 0])} relevant links")
            else:
                logger.info("Using legacy uniform weights (academic mode - ignoring semantic relevance)")
            
            # Use Advanced PageRank calculator with Protect & Boost functionality
            advanced_calculator = AdvancedPageRankCalculator(
                damping=settings.PAGERANK_DAMPING,
                tolerance=settings.PAGERANK_TOLERANCE,
                max_iter=settings.PAGERANK_MAX_ITER
            )
            
            # Convert page_boosts to the new format (boost_factor -> target_factor)
            boosted_pages = {}
            if page_boosts:
                logger.info(f"Converting {len(page_boosts)} page boosts to advanced format")
                for boost in page_boosts:
                    url = boost.get('url')
                    boost_factor = boost.get('boost_factor', 1.0)
                    # Convert boost_factor to target_factor (boost wants to reach X times baseline)
                    boosted_pages[url] = boost_factor
            
            # Convert protected_pages to the format expected by AdvancedPageRankCalculator
            protected_pages_dict = {}
            if protected_pages:
                logger.info(f"Converting {len(protected_pages)} protected pages to advanced format")
                # Create URL to page mapping for quick lookup
                url_to_page = {page.url: page for page in pages}
                
                for protect in protected_pages:
                    url = protect.get('url')
                    protection_factor = protect.get('protection_factor', 0.05)
                    
                    # Handle automatic protection (negative values mean percentage loss limit)
                    if protection_factor < 0:
                        # protection_factor = -0.02 means "don't lose more than 2%"
                        loss_limit = abs(protection_factor)
                        page = url_to_page.get(url)
                        
                        if page and page.current_pagerank > 0:
                            # Calculate minimum threshold: current_pagerank * (1 - loss_limit)
                            min_threshold = page.current_pagerank * (1 - loss_limit)
                            protected_pages_dict[url] = min_threshold
                            logger.info(f"Auto-protect {url}: current={page.current_pagerank:.4f}, min={min_threshold:.4f} (-{loss_limit*100:.1f}%)")
                        else:
                            logger.warning(f"Cannot auto-protect {url}: page not found or zero PageRank")
                    else:
                        # Manual protection with absolute threshold
                        protected_pages_dict[url] = protection_factor
            
            # Calculate PageRank with advanced features
            new_pagerank = await advanced_calculator.calculate(
                pages, all_links,
                damping=settings.PAGERANK_DAMPING,
                max_iter=settings.PAGERANK_MAX_ITER,
                tolerance=settings.PAGERANK_TOLERANCE,
                link_weights=final_weights,
                # Advanced parameters
                protected_pages=protected_pages_dict,
                boosted_pages=boosted_pages,
                eta_protect=0.05,  # Default protection budget
                eta_boost=0.08     # Default boost budget
            )
            
            # Prepare results
            results = []
            for page in pages:
                page_id = page.id
                current_pr = page.current_pagerank
                new_pr = new_pagerank.get(page_id, current_pr)
                delta = new_pr - current_pr
                
                results.append({
                    "page_id": page_id,
                    "new_pagerank": new_pr,
                    "pagerank_delta": delta
                })
            
            # Save results
            await self.simulation_repo.save_results(simulation.id, results)
            await self.simulation_repo.update_status(simulation.id, "completed")
            
            # Prepare summary
            summary = self._create_simulation_summary(
                pages, results, new_links, multi_rule.get_description()
            )
            
            return {
                "simulation_id": simulation.id,
                "status": "completed",
                "summary": summary,
                "new_links_count": len(new_links)
            }
            
        except Exception as e:
            await self.simulation_repo.update_status(simulation.id, "failed")
            raise ValueError(f"Multi-rule simulation failed: {str(e)}")
    
    async def preview_multi_rule_links(self, 
                                      pages: List[Any], 
                                      existing_links: List[Tuple[int, int]],
                                      rules_config: List[Dict]) -> List[Tuple[int, int]]:
        """Preview links that would be generated by multiple rules"""
        
        # Create multi-rule and apply it
        multi_rule = MultiRule(rules_config)
        new_links = multi_rule.generate_links(pages, existing_links)
        
        return new_links