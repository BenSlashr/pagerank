import numpy as np
import logging
import time
import asyncio
from typing import Dict, List, Tuple, Optional, Set, Any
from scipy import sparse
from scipy.sparse.linalg import norm

from app.core.pagerank.calculator import PageRankCalculator

logger = logging.getLogger(__name__)

class AdvancedPageRankCalculator(PageRankCalculator):
    """
    Advanced PageRank calculator with Protect & Boost functionality.
    
    Implements mathematically rigorous:
    - Protected pages (floor constraints with water-filling projection)
    - Boosted pages (conditional teleportation)
    - Outflow capping (prevent leakage)
    - Link reweighting (bounded SEO-realistic adjustments)
    
    All within a single unified iteration loop maintaining ∑PR=1
    """
    
    def __init__(self, 
                 damping: float = 0.85,
                 tolerance: float = 1e-8,
                 max_iter: int = 1000,
                 performance_threshold_minutes: float = 15.0):
        """
        Initialize advanced PageRank calculator.
        
        Args:
            damping: Damping factor (d)
            tolerance: Convergence threshold  
            max_iter: Maximum iterations
            performance_threshold_minutes: If estimated > this, use fast approximations
        """
        self.damping = damping
        self.tolerance = tolerance
        self.max_iter = max_iter
        self.performance_threshold = performance_threshold_minutes * 60  # seconds
        
    async def calculate(self, 
                       pages: List[Any], 
                       links: List[Tuple[int, int]],
                       damping: float = None,
                       max_iter: int = None,
                       tolerance: float = None,
                       link_weights: Dict[Tuple[int, int], float] = None,
                       # New advanced parameters
                       protected_pages: Dict[str, float] = None,  # {url: floor_factor}
                       boosted_pages: Dict[str, float] = None,    # {url: target_factor}  
                       eta_protect: float = 0.05,    # Protection budget
                       eta_boost: float = 0.03,      # Boost budget
                       alpha_cap: Dict[str, float] = None,  # {url: outflow_cap}
                       **kwargs) -> Dict[int, float]:
        """
        Calculate PageRank with advanced Protect & Boost features.
        
        Args:
            pages: List of page objects
            links: List of (from_id, to_id) tuples
            protected_pages: {url: floor_factor} - pages to protect at floor_factor * baseline
            boosted_pages: {url: target_factor} - pages to boost toward target_factor * baseline  
            eta_protect: Budget allocation for protection (0-1)
            eta_boost: Budget allocation for boost (0-1)
            alpha_cap: {url: cap_factor} - outflow caps (0-1)
        """
        # Use provided params or defaults
        damping = damping or self.damping
        max_iter = max_iter or self.max_iter
        tolerance = tolerance or self.tolerance
        
        # Validate budgets
        if eta_protect + eta_boost > 1.0:
            logger.warning(f"Budget overflow: eta_protect({eta_protect}) + eta_boost({eta_boost}) > 1.0")
            eta_protect = min(eta_protect, 0.4)
            eta_boost = min(eta_boost, 0.6 - eta_protect)
        
        logger.info(f"🚀 Starting Advanced PageRank: Protection({eta_protect:.3f}) + Boost({eta_boost:.3f})")
        
        start_time = time.time()
        n_pages = len(pages)
        n_links = len(links)
        
        # Estimate computation time and choose strategy
        estimated_time = self._estimate_computation_time(n_pages, n_links)
        use_fast_mode = estimated_time > self.performance_threshold
        
        if use_fast_mode:
            logger.info(f"⚡ Using fast approximations (estimated: {estimated_time/60:.1f}min > {self.performance_threshold/60:.1f}min)")
        else:
            logger.info(f"🎯 Using exact algorithms (estimated: {estimated_time/60:.1f}min)")
            
        # Convert to working format
        page_data = self._prepare_page_data(pages, protected_pages, boosted_pages, alpha_cap)
        
        # Get baseline PageRank for reference
        baseline_pr = await self._calculate_baseline_pagerank(page_data, links, damping, link_weights)
        
        # Run advanced algorithm
        if use_fast_mode:
            result = await self._calculate_fast(page_data, links, baseline_pr, damping, 
                                              eta_protect, eta_boost, tolerance, max_iter)
        else:
            result = await self._calculate_exact(page_data, links, baseline_pr, damping,
                                               eta_protect, eta_boost, tolerance, max_iter)
        
        total_time = time.time() - start_time
        logger.info(f"🏁 Advanced PageRank completed: {total_time:.2f}s")
        
        return result
    
    def _estimate_computation_time(self, n_pages: int, n_links: int) -> float:
        """Estimate computation time based on graph size"""
        # Rough heuristic based on typical performance
        base_time = 0.1  # seconds
        page_factor = n_pages * 0.00001  # ~10μs per page per iteration
        link_factor = n_links * 0.000001  # ~1μs per link per iteration  
        iterations = min(100, self.max_iter)  # Typical convergence
        
        return base_time + (page_factor + link_factor) * iterations
    
    def _prepare_page_data(self, pages, protected_pages, boosted_pages, alpha_cap):
        """Convert input data to working format"""
        page_data = {
            'pages': pages,
            'id_to_url': {},
            'url_to_id': {},
            'protected_ids': set(),
            'boosted_ids': set(), 
            'floor_values': {},
            'target_values': {},
            'outflow_caps': {}
        }
        
        # Build mappings
        for page in pages:
            page_id = page.id if hasattr(page, 'id') else page['id']
            page_url = page.url if hasattr(page, 'url') else page['url']
            
            page_data['id_to_url'][page_id] = page_url
            page_data['url_to_id'][page_url] = page_id
        
        # Process protected pages
        if protected_pages:
            for url, floor_factor in protected_pages.items():
                if url in page_data['url_to_id']:
                    page_id = page_data['url_to_id'][url]
                    page_data['protected_ids'].add(page_id)
                    page_data['floor_values'][page_id] = floor_factor
        
        # Process boosted pages  
        if boosted_pages:
            for url, target_factor in boosted_pages.items():
                if url in page_data['url_to_id']:
                    page_id = page_data['url_to_id'][url]
                    page_data['boosted_ids'].add(page_id)
                    page_data['target_values'][page_id] = target_factor
        
        # Process outflow caps
        if alpha_cap:
            for url, cap_factor in alpha_cap.items():
                if url in page_data['url_to_id']:
                    page_id = page_data['url_to_id'][url]
                    page_data['outflow_caps'][page_id] = cap_factor
        
        logger.info(f"📊 Page data: {len(page_data['protected_ids'])} protected, "
                   f"{len(page_data['boosted_ids'])} boosted, "
                   f"{len(page_data['outflow_caps'])} capped")
        
        return page_data
    
    async def _calculate_baseline_pagerank(self, page_data, links, damping, link_weights):
        """Calculate baseline PageRank for reference"""
        # Use standard NetworkX calculation as baseline
        from app.core.pagerank.networkx_impl import NetworkXPageRankCalculator
        
        baseline_calc = NetworkXPageRankCalculator()
        baseline_pr = await baseline_calc.calculate(
            page_data['pages'], links, damping=damping, 
            tolerance=self.tolerance, link_weights=link_weights
        )
        
        logger.info("✅ Baseline PageRank calculated")
        return baseline_pr
    
    async def _calculate_exact(self, page_data, links, baseline_pr, damping, 
                              eta_protect, eta_boost, tolerance, max_iter):
        """Exact algorithm with full mathematical rigor"""
        logger.info("🎯 Running exact Protect & Boost algorithm")
        
        # TODO: Implement exact algorithm
        # For now, delegate to fast mode
        return await self._calculate_fast(page_data, links, baseline_pr, damping,
                                        eta_protect, eta_boost, tolerance, max_iter)
    
    def _water_filling_projection(self, p: np.ndarray, floors: np.ndarray, 
                                  ceilings: np.ndarray = None) -> np.ndarray:
        """
        Project vector p onto simplex with floor and ceiling constraints.
        
        Implements water-filling algorithm to maintain ∑p=1 while respecting:
        - floors[i] ≤ p[i] ≤ ceilings[i] for all i
        
        Args:
            p: Input vector to project
            floors: Floor constraints (0 if no constraint) 
            ceilings: Ceiling constraints (∞ if no constraint)
            
        Returns:
            Projected vector satisfying constraints and ∑p=1
        """
        n = len(p)
        if ceilings is None:
            ceilings = np.full(n, np.inf)
        
        # Step 1: Apply floor constraints
        p_floored = np.maximum(p, floors)
        
        # Step 2: Check if we need ceiling constraints
        p_capped = np.minimum(p_floored, ceilings)
        
        # Step 3: Water-filling to restore ∑p=1
        current_sum = np.sum(p_capped)
        deficit = 1.0 - current_sum
        
        if abs(deficit) < 1e-10:
            return p_capped  # Already normalized
        
        # Find pages that can absorb/release the deficit
        # (not saturated at floor or ceiling)
        can_adjust = (p_capped > floors) & (p_capped < ceilings)
        n_adjustable = np.sum(can_adjust)
        
        if n_adjustable == 0:
            # All pages saturated - normalize proportionally within bounds
            logger.warning("Water-filling: all pages saturated, proportional adjustment")
            return p_capped / current_sum
        
        if deficit > 0:
            # Need to add mass - distribute to non-ceiling pages
            available_capacity = np.sum(ceilings[can_adjust] - p_capped[can_adjust])
            if available_capacity < deficit:
                # Not enough capacity - distribute proportionally
                adjustment = (ceilings[can_adjust] - p_capped[can_adjust]) * (deficit / available_capacity)
            else:
                # Distribute evenly among adjustable pages
                adjustment = np.full(n_adjustable, deficit / n_adjustable)
            
            p_capped[can_adjust] += adjustment
            
        else:
            # deficit < 0: Need to remove mass
            available_capacity = np.sum(p_capped[can_adjust] - floors[can_adjust])
            if available_capacity < -deficit:
                # Not enough to remove - take proportionally  
                adjustment = -(p_capped[can_adjust] - floors[can_adjust]) * (-deficit / available_capacity)
            else:
                # Remove evenly from adjustable pages
                adjustment = np.full(n_adjustable, deficit / n_adjustable)
                
            p_capped[can_adjust] += adjustment
        
        # Final bounds check and normalization
        p_final = np.clip(p_capped, floors, ceilings)
        p_final = p_final / np.sum(p_final)  # Force normalization
        
        return p_final

    def _build_transition_matrix(self, page_data, links, link_weights=None, apply_caps=False):
        """Build sparse transition matrix with optional outflow caps"""
        n_pages = len(page_data['pages'])
        page_ids = [page.id if hasattr(page, 'id') else page['id'] for page in page_data['pages']]
        id_to_idx = {page_id: idx for idx, page_id in enumerate(page_ids)}
        
        # Build adjacency matrix
        rows, cols, weights = [], [], []
        for from_id, to_id in links:
            if from_id in id_to_idx and to_id in id_to_idx:
                from_idx = id_to_idx[from_id]
                to_idx = id_to_idx[to_id]
                weight = link_weights.get((from_id, to_id), 1.0) if link_weights else 1.0
                
                rows.append(from_idx)
                cols.append(to_idx)
                weights.append(weight)
        
        # Create sparse adjacency matrix
        A = sparse.csr_matrix((weights, (rows, cols)), shape=(n_pages, n_pages))
        
        # Apply outflow caps if requested
        if apply_caps and page_data['outflow_caps']:
            for page_id, cap_factor in page_data['outflow_caps'].items():
                if page_id in id_to_idx:
                    idx = id_to_idx[page_id]
                    # Reduce outgoing weights by cap_factor, add self-loop for remainder
                    row_data = A.getrow(idx).toarray().flatten()
                    if np.sum(row_data) > 0:
                        row_data *= cap_factor
                        row_data[idx] += (1.0 - cap_factor)  # Add self-loop
                        A[idx, :] = row_data
        
        # Normalize to make column-stochastic (columns sum to 1)
        out_degrees = np.array(A.sum(axis=1)).flatten()
        out_degrees[out_degrees == 0] = 1  # Handle dangling nodes
        D_inv = sparse.diags(1.0 / out_degrees)
        M = A.T @ D_inv  # Transpose for column-stochastic
        
        return M, id_to_idx
    
    def _compute_teleportation_vector(self, page_data, p_current, baseline_vec, 
                                    eta_protect, eta_boost, id_to_idx):
        """Compute conditional teleportation vector with 2 pockets"""
        n_pages = len(p_current)
        
        # Base teleportation (uniform)
        v_base = np.ones(n_pages) / n_pages
        
        # Protection pocket (conditional)
        v_protect = np.zeros(n_pages)
        protect_budget_used = 0.0
        protect_needs = []
        
        for page_id in page_data['protected_ids']:
            if page_id in id_to_idx:
                idx = id_to_idx[page_id]
                floor_factor = page_data['floor_values'][page_id]
                floor_value = floor_factor * baseline_vec[idx]
                
                if p_current[idx] < floor_value:
                    need = floor_value - p_current[idx]
                    protect_needs.append((idx, need))
        
        # Distribute protection budget proportionally to needs
        if protect_needs and eta_protect > 0:
            total_need = sum(need for _, need in protect_needs)
            budget_per_unit = eta_protect / total_need if total_need > 0 else 0
            
            for idx, need in protect_needs:
                allocation = min(need * budget_per_unit, eta_protect - protect_budget_used)
                v_protect[idx] = allocation
                protect_budget_used += allocation
        
        # Boost pocket (conditional)
        v_boost = np.zeros(n_pages)
        boost_budget_used = 0.0
        boost_needs = []
        
        for page_id in page_data['boosted_ids']:
            if page_id in id_to_idx:
                idx = id_to_idx[page_id]
                target_factor = page_data['target_values'][page_id]
                target_value = target_factor * baseline_vec[idx]
                
                if p_current[idx] < target_value:
                    need = target_value - p_current[idx]
                    boost_needs.append((idx, need))
        
        # Distribute boost budget proportionally to needs
        if boost_needs and eta_boost > 0:
            total_need = sum(need for _, need in boost_needs)
            budget_per_unit = eta_boost / total_need if total_need > 0 else 0
            
            for idx, need in boost_needs:
                allocation = min(need * budget_per_unit, eta_boost - boost_budget_used)
                v_boost[idx] = allocation
                boost_budget_used += allocation
        
        # Combine teleportation vectors
        unused_protect = eta_protect - protect_budget_used
        unused_boost = eta_boost - boost_budget_used
        base_weight = 1.0 - eta_protect - eta_boost + unused_protect + unused_boost
        
        v_final = base_weight * v_base + v_protect + v_boost
        v_final = v_final / np.sum(v_final)  # Normalize
        
        return v_final, protect_budget_used, boost_budget_used

    async def _calculate_fast(self, page_data, links, baseline_pr, damping,
                             eta_protect, eta_boost, tolerance, max_iter):
        """Fast approximation algorithm with conditional teleportation"""
        logger.info("⚡ Running fast Protect & Boost algorithm with conditional teleportation")
        
        # Setup working data
        n_pages = len(page_data['pages'])
        page_ids = [page.id if hasattr(page, 'id') else page['id'] for page in page_data['pages']]
        
        # Build transition matrix
        M, id_to_idx = self._build_transition_matrix(page_data, links, apply_caps=True)
        
        # Initialize vectors
        p = np.array([baseline_pr.get(page_id, 1.0/n_pages) for page_id in page_ids])
        baseline_vec = p.copy()
        
        # Setup constraints for projection
        floors = np.zeros(n_pages)
        ceilings = np.full(n_pages, np.inf)
        
        for page_id in page_data['protected_ids']:
            if page_id in id_to_idx:
                idx = id_to_idx[page_id]
                floor_factor = page_data['floor_values'][page_id]
                floors[idx] = floor_factor * baseline_vec[idx]
        
        for page_id in page_data['boosted_ids']:
            if page_id in id_to_idx:
                idx = id_to_idx[page_id]
                target_factor = page_data['target_values'][page_id]
                ceilings[idx] = 2.0 * target_factor * baseline_vec[idx]
        
        logger.info(f"🔄 Starting iterative algorithm: damping={damping}, max_iter={max_iter}")
        
        # Main iteration loop
        total_protect_used = 0.0
        total_boost_used = 0.0
        
        for iteration in range(max_iter):
            p_old = p.copy()
            
            # Step 1: Standard PageRank step
            v, protect_used, boost_used = self._compute_teleportation_vector(
                page_data, p, baseline_vec, eta_protect, eta_boost, id_to_idx
            )
            
            # p' = d * M^T * p + (1-d) * v
            p_new = damping * M.dot(p) + (1 - damping) * v
            
            # Step 2: Apply water-filling projection
            p = self._water_filling_projection(p_new, floors, ceilings)
            
            # Track budget usage
            total_protect_used = protect_used
            total_boost_used = boost_used
            
            # Check convergence
            if iteration % 10 == 0:
                diff = np.linalg.norm(p - p_old, ord=1)
                if iteration % 50 == 0 or diff < tolerance:
                    logger.info(f"   🔄 Iter {iteration}: L1_diff={diff:.8f}, "
                              f"protect={protect_used:.4f}, boost={boost_used:.4f}")
                
                if diff < tolerance:
                    logger.info(f"✅ Converged after {iteration} iterations")
                    break
                
                # Brief async yield for large iterations
                if iteration % 100 == 0:
                    await asyncio.sleep(0.001)
        
        # Convert back to dict format
        result = {page_ids[i]: p[i] for i in range(n_pages)}
        
        # Log final results
        mass_protected = np.sum([p[id_to_idx[pid]] for pid in page_data['protected_ids'] if pid in id_to_idx])
        mass_boosted = np.sum([p[id_to_idx[pid]] for pid in page_data['boosted_ids'] if pid in id_to_idx])
        
        logger.info(f"✅ Algorithm complete: {mass_protected:.4f} mass protected, {mass_boosted:.4f} mass boosted")
        logger.info(f"✅ Budgets used: {total_protect_used:.4f}/{eta_protect:.4f} protect, "
                   f"{total_boost_used:.4f}/{eta_boost:.4f} boost")
        logger.info(f"✅ Sum check: {sum(result.values()):.8f} (should be 1.0)")
        
        return result