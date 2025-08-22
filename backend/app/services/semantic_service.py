from typing import List, Dict, Optional, Tuple
import hashlib
import numpy as np
import logging
from sentence_transformers import SentenceTransformer
from app.models.page import Page
from app.repositories.base import PageRepository
import sqlite3
from app.core.config import settings
import os

logger = logging.getLogger(__name__)

class SemanticService:
    """Service for semantic similarity calculation using sentence transformers"""
    
    def __init__(self, page_repo: PageRepository, db_path: str = None):
        self.model: Optional[SentenceTransformer] = None
        self.page_repo = page_repo
        self.db_path = db_path or settings.DATABASE_URL.replace("sqlite:///", "")
        
    async def load_model(self):
        """Lazy loading of the sentence transformer model"""
        if self.model is None:
            logger.info("Loading semantic model nomic-ai/nomic-embed-text-v2-moe...")
            try:
                self.model = SentenceTransformer('nomic-ai/nomic-embed-text-v2-moe')
                logger.info("Semantic model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load semantic model: {e}")
                raise
    
    def extract_content(self, page: Page) -> str:
        """Extract relevant content from a page for semantic analysis"""
        content_parts = []
        
        # Add title if available
        if hasattr(page, 'title') and page.title:
            content_parts.append(page.title)
        
        # Add content from "Extracteur 1" column (stored in a custom field)
        if hasattr(page, 'extracteur_1') and page.extracteur_1:
            content_parts.append(page.extracteur_1[:1000])  # Limit to 1000 chars
        elif hasattr(page, 'content') and page.content:
            # Fallback to content field if extracteur_1 not available
            content_parts.append(page.content[:500])  # Shorter fallback
        
        # Join all content parts
        content = " ".join(content_parts).strip()
        
        # If still no content, use URL as fallback
        if not content and hasattr(page, 'url'):
            # Extract meaningful parts from URL
            url_parts = page.url.replace('/', ' ').replace('-', ' ').replace('_', ' ')
            content = url_parts
        
        return content if content else "no content available"
    
    def _get_content_hash(self, content: str) -> str:
        """Generate MD5 hash of content for caching"""
        return hashlib.md5(content.encode('utf-8')).hexdigest()
    
    async def _get_cached_embedding(self, page_id: int, content_hash: str) -> Optional[np.ndarray]:
        """Get cached embedding from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT embedding FROM page_embeddings 
                WHERE page_id = ? AND content_hash = ?
            """, (page_id, content_hash))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                # Convert BLOB back to numpy array
                return np.frombuffer(result[0], dtype=np.float32)
            
            return None
        except Exception as e:
            logger.error(f"Error retrieving cached embedding: {e}")
            return None
    
    async def _save_embedding(self, page_id: int, content_hash: str, embedding: np.ndarray):
        """Save embedding to database cache"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Convert numpy array to bytes
            embedding_bytes = embedding.tobytes()
            
            cursor.execute("""
                INSERT OR REPLACE INTO page_embeddings 
                (page_id, content_hash, embedding) 
                VALUES (?, ?, ?)
            """, (page_id, content_hash, embedding_bytes))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Error saving embedding to cache: {e}")
    
    async def get_embedding(self, page: Page) -> np.ndarray:
        """Get or compute embedding for a page"""
        # Extract content and generate hash
        content = self.extract_content(page)
        content_hash = self._get_content_hash(content)
        
        # Check cache first
        cached_embedding = await self._get_cached_embedding(page.id, content_hash)
        if cached_embedding is not None:
            return cached_embedding
        
        # Load model if needed
        await self.load_model()
        
        # Compute new embedding
        try:
            embedding = self.model.encode([content])[0]
            
            # Save to cache
            await self._save_embedding(page.id, content_hash, embedding)
            
            return embedding
        except Exception as e:
            logger.error(f"Error computing embedding for page {page.id}: {e}")
            # Return zero vector as fallback
            return np.zeros(768)  # Standard embedding size
    
    async def get_embeddings_batch(self, pages: List[Page], batch_size: int = 50) -> Dict[int, np.ndarray]:
        """Get embeddings for multiple pages in batches"""
        embeddings = {}
        
        # Process in batches to avoid memory issues
        for i in range(0, len(pages), batch_size):
            batch = pages[i:i + batch_size]
            logger.info(f"Processing embedding batch {i//batch_size + 1}/{(len(pages) + batch_size - 1)//batch_size}")
            
            for page in batch:
                try:
                    embeddings[page.id] = await self.get_embedding(page)
                except Exception as e:
                    logger.error(f"Error processing page {page.id}: {e}")
                    embeddings[page.id] = np.zeros(768)  # Fallback
        
        return embeddings
    
    def calculate_similarity(self, embedding_a: np.ndarray, embedding_b: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            # Handle zero vectors
            norm_a = np.linalg.norm(embedding_a)
            norm_b = np.linalg.norm(embedding_b)
            
            if norm_a == 0 or norm_b == 0:
                return 0.0
            
            # Cosine similarity
            similarity = np.dot(embedding_a, embedding_b) / (norm_a * norm_b)
            
            # Ensure result is between 0 and 1
            return max(0.0, min(1.0, float(similarity)))
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    async def calculate_semantic_weights(
        self, 
        pages: List[Page], 
        links: List[Tuple[int, int]], 
        similarity_threshold: float = 0.4
    ) -> Dict[Tuple[int, int], float]:
        """Calculate semantic weights for all links based on page similarity"""
        
        # Get embeddings for all pages
        logger.info(f"Calculating embeddings for {len(pages)} pages...")
        embeddings = await self.get_embeddings_batch(pages)
        
        # Create page ID to embedding mapping
        page_embeddings = {page.id: embeddings.get(page.id, np.zeros(768)) for page in pages}
        
        # Calculate semantic weights for all links
        logger.info(f"Calculating semantic weights for {len(links)} links...")
        weights = {}
        
        for source_id, target_id in links:
            if source_id in page_embeddings and target_id in page_embeddings:
                similarity = self.calculate_similarity(
                    page_embeddings[source_id],
                    page_embeddings[target_id]
                )
                
                # Apply threshold: 0 if below threshold, similarity value if above
                if similarity >= similarity_threshold:
                    semantic_score = similarity
                else:
                    semantic_score = 0.0
                
                weights[(source_id, target_id)] = semantic_score
            else:
                # Default to 0 if embeddings not found
                weights[(source_id, target_id)] = 0.0
        
        logger.info(f"Computed semantic weights for {len(weights)} links")
        return weights
    
    def combine_weights(
        self, 
        position_weights: Dict[Tuple[int, int], float], 
        semantic_weights: Dict[Tuple[int, int], float]
    ) -> Dict[Tuple[int, int], float]:
        """Combine position and semantic weights using 50/50 formula"""
        combined = {}
        
        # Get all links from both weight dictionaries
        all_links = set(position_weights.keys()) | set(semantic_weights.keys())
        
        for link in all_links:
            pos_weight = position_weights.get(link, 1.0)  # Default position weight
            sem_weight = semantic_weights.get(link, 0.0)  # Default semantic weight
            
            # Apply 50/50 formula: (position_weight + semantic_score) / 2
            combined_weight = (pos_weight + sem_weight) / 2.0
            combined[link] = combined_weight
        
        return combined