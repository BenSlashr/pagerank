import networkx as nx
import numpy as np
import logging
import time
import asyncio
from typing import Dict, List, Tuple
from app.core.pagerank.calculator import PageRankCalculator

logger = logging.getLogger(__name__)

class NetworkXPageRankCalculator(PageRankCalculator):
    """NetworkX implementation of PageRank calculator"""
    
    async def calculate(self, 
                       pages: List[Dict], 
                       links: List[Tuple[int, int]],
                       damping: float = 0.85,
                       max_iter: int = 100,  # Optimized default
                       tolerance: float = 1e-4,  # Relaxed tolerance
                       link_weights: Dict[Tuple[int, int], float] = None) -> Dict[int, float]:
        """Optimized PageRank calculation for large datasets with chunked processing"""
        
        start_time = time.time()
        num_pages = len(pages)
        num_links = len(links)
        
        logger.info(f"🚀 Starting optimized PageRank calculation")
        logger.info(f"   📊 Dataset: {num_pages:,} pages, {num_links:,} links")
        
        # Determine strategy based on size
        if num_pages > 50000 or num_links > 500000:
            return await self._calculate_large_dataset(pages, links, damping, max_iter, tolerance, link_weights)
        else:
            return await self._calculate_standard(pages, links, damping, max_iter, tolerance, link_weights)
    
    async def _calculate_large_dataset(self, pages, links, damping, max_iter, tolerance, link_weights):
        """Optimized calculation for very large datasets"""
        
        logger.info("🔧 Using large dataset optimization strategy")
        
        # Use sparse matrix approach for memory efficiency
        return await self._calculate_with_sparse_matrix(pages, links, damping, max_iter, tolerance, link_weights)
    
    async def _calculate_standard(self, pages, links, damping, max_iter, tolerance, link_weights):
        """Standard NetworkX calculation with optimizations"""
        
        start_time = time.time()
        page_ids = [page['id'] if isinstance(page, dict) else page.id for page in pages]
        
        logger.info("📈 Building graph structure...")
        G = nx.DiGraph()
        G.add_nodes_from(page_ids)
        
        # Add edges with progress tracking (and weights if provided)
        batch_size = 100000
        for i in range(0, len(links), batch_size):
            batch = links[i:i + batch_size]
            if link_weights:
                # Add edges with weights
                weighted_edges = [(from_id, to_id, {'weight': link_weights.get((from_id, to_id), 1.0)}) 
                                 for from_id, to_id in batch]
                G.add_edges_from(weighted_edges)
            else:
                G.add_edges_from(batch)
            
            progress = min(i + batch_size, len(links))
            if len(links) > 10000:  # Only log for substantial datasets
                logger.info(f"   ⚡ Progress: {progress:,}/{len(links):,} links ({progress/len(links)*100:.1f}%)")
            
            # Yield control periodically for large datasets
            if i % (batch_size * 5) == 0:
                await asyncio.sleep(0.001)  # Brief pause
        
        graph_time = time.time() - start_time
        logger.info(f"📊 Graph construction: {graph_time:.2f}s")
        
        # Calculate PageRank with optimizations
        logger.info("🧮 Computing PageRank scores...")
        calc_start = time.time()
        
        try:
            # Use power iteration with optimized parameters
            pagerank_scores = nx.pagerank(
                G, 
                alpha=damping,
                max_iter=max_iter,
                tol=tolerance,
                nstart=None,  # Let NetworkX optimize starting values
                weight='weight' if link_weights else None
            )
            
            calc_time = time.time() - calc_start
            logger.info(f"✅ PageRank completed: {calc_time:.2f}s")
            
        except nx.NetworkXError as e:
            if len(links) == 0:
                logger.info("⚠️  No links found, using uniform distribution")
                pagerank_scores = {page_id: 1.0 / len(page_ids) for page_id in page_ids}
            else:
                logger.error(f"❌ PageRank failed: {str(e)}")
                raise ValueError(f"PageRank calculation failed: {str(e)}")
        
        # Log performance statistics
        total_time = time.time() - start_time
        if pagerank_scores:
            values = list(pagerank_scores.values())
            logger.info(f"📈 Results: Min={min(values):.8f}, Max={max(values):.8f}, Avg={np.mean(values):.8f}")
        
        logger.info(f"🏁 Total time: {total_time:.2f}s ({len(page_ids)/total_time:.0f} pages/sec)")
        
        return pagerank_scores
    
    async def _calculate_with_sparse_matrix(self, pages, links, damping, max_iter, tolerance, link_weights):
        """Memory-efficient calculation using sparse matrices for huge datasets"""
        
        logger.info("🔧 Using sparse matrix implementation for memory efficiency")
        
        try:
            from scipy import sparse
            from scipy.sparse.linalg import norm
        except ImportError:
            logger.warning("⚠️  SciPy not available, falling back to standard method")
            return await self._calculate_standard(pages, links, damping, max_iter, tolerance)
        
        start_time = time.time()
        page_ids = [page['id'] if isinstance(page, dict) else page.id for page in pages]
        n = len(page_ids)
        
        # Create mapping from page_id to index
        id_to_idx = {page_id: idx for idx, page_id in enumerate(page_ids)}
        
        # Build sparse adjacency matrix
        logger.info("🏗️  Building sparse adjacency matrix...")
        
        rows, cols, weights = [], [], []
        for from_id, to_id in links:
            if from_id in id_to_idx and to_id in id_to_idx:
                rows.append(id_to_idx[from_id])
                cols.append(id_to_idx[to_id])
                # Use provided weight or default to 1.0
                weight = link_weights.get((from_id, to_id), 1.0) if link_weights else 1.0
                weights.append(weight)
        
        # Create sparse matrix with weights
        A = sparse.csr_matrix((weights, (rows, cols)), shape=(n, n))
        
        # Normalize by out-degree (column stochastic)
        out_degrees = np.array(A.sum(axis=1)).flatten()
        out_degrees[out_degrees == 0] = 1  # Handle dangling nodes
        
        # Create transition matrix
        D_inv = sparse.diags(1.0 / out_degrees)
        M = A.T @ D_inv
        
        logger.info(f"📊 Sparse matrix: {n:,}×{n:,}, {len(rows):,} non-zeros")
        
        # Power iteration
        logger.info("🔄 Running power iteration...")
        
        v = np.ones(n) / n  # Initial uniform distribution
        teleport = (1 - damping) / n
        
        for iteration in range(max_iter):
            v_old = v.copy()
            
            # PageRank update: v = damping * M @ v + teleport
            v = damping * M.dot(v) + teleport
            
            # Check convergence
            if iteration % 10 == 0:  # Check every 10 iterations
                diff = norm(v - v_old, ord=1)
                logger.info(f"   🔄 Iteration {iteration}: convergence = {diff:.8f}")
                
                if diff < tolerance:
                    logger.info(f"✅ Converged after {iteration} iterations")
                    break
                
                # Yield control periodically
                await asyncio.sleep(0.001)
        
        # Convert back to dictionary
        pagerank_scores = {page_ids[i]: v[i] for i in range(n)}
        
        total_time = time.time() - start_time
        logger.info(f"🏁 Sparse calculation completed: {total_time:.2f}s")
        
        return pagerank_scores
    
    def get_graph_stats(self, pages: List[Dict], links: List[Tuple[int, int]]) -> Dict:
        """Get basic graph statistics"""
        G = nx.DiGraph()
        page_ids = [page['id'] if isinstance(page, dict) else page.id for page in pages]
        G.add_nodes_from(page_ids)
        G.add_edges_from(links)
        
        return {
            "num_nodes": G.number_of_nodes(),
            "num_edges": G.number_of_edges(),
            "num_strongly_connected_components": nx.number_strongly_connected_components(G),
            "num_weakly_connected_components": nx.number_weakly_connected_components(G),
            "is_strongly_connected": nx.is_strongly_connected(G),
            "density": nx.density(G)
        }