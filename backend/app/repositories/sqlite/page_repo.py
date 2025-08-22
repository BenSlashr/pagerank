from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from app.models.page import Page
from app.repositories.base import PageRepository

class SQLitePageRepository(PageRepository):
    def __init__(self, db: Session):
        self.db = db
    
    async def get_by_project(self, project_id: int) -> List[Page]:
        return self.db.query(Page).filter(Page.project_id == project_id).all()
    
    async def bulk_insert(self, pages: List[Dict]) -> None:
        if not pages:
            return
            
        # Use INSERT OR IGNORE to handle potential duplicates based on unique URL
        from sqlalchemy import text
        
        # For SQLite, use INSERT OR IGNORE for duplicate handling
        try:
            page_objects = [Page(**page_data) for page_data in pages]
            self.db.bulk_save_objects(page_objects)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            # If bulk insert fails due to duplicates, insert one by one with error handling
            for page_data in pages:
                try:
                    existing = self.db.query(Page).filter(
                        Page.project_id == page_data['project_id'],
                        Page.url == page_data['url']
                    ).first()
                    
                    if not existing:
                        page = Page(**page_data)
                        self.db.add(page)
                        self.db.commit()
                except Exception:
                    self.db.rollback()
                    continue
    
    async def update_pagerank(self, page_id: int, pagerank: float) -> None:
        page = self.db.query(Page).filter(Page.id == page_id).first()
        if page:
            page.current_pagerank = pagerank
            self.db.commit()
    
    async def bulk_update_pagerank(self, updates: List[Dict]) -> None:
        """Bulk update PageRank scores efficiently"""
        if not updates:
            return
        
        try:
            # Use raw SQL for efficiency - much faster than ORM
            from sqlalchemy import text
            
            # Prepare batch update
            batch_size = 500
            total_updated = 0
            
            for i in range(0, len(updates), batch_size):
                batch = updates[i:i + batch_size]
                
                # Create WHEN clauses for batch update
                when_clauses = []
                page_ids = []
                
                for update in batch:
                    when_clauses.append(f"WHEN {update['page_id']} THEN {update['pagerank']}")
                    page_ids.append(str(update['page_id']))
                
                # Execute batch update with CASE statement
                sql = f"""
                UPDATE pages 
                SET current_pagerank = CASE id 
                    {' '.join(when_clauses)}
                    ELSE current_pagerank 
                END 
                WHERE id IN ({','.join(page_ids)})
                """
                
                self.db.execute(text(sql))
                total_updated += len(batch)
                
                print(f"   ✅ Batch updated {total_updated}/{len(updates)} pages")
            
            self.db.commit()
            print(f"   🎉 Bulk update completed: {total_updated} pages")
            
        except Exception as e:
            self.db.rollback()
            print(f"   ❌ Bulk update failed: {str(e)}")
            raise
    
    async def get_by_url(self, project_id: int, url: str) -> Optional[Page]:
        return self.db.query(Page).filter(
            Page.project_id == project_id,
            Page.url == url
        ).first()
    
    async def delete_by_project(self, project_id: int) -> None:
        self.db.query(Page).filter(Page.project_id == project_id).delete()
        self.db.commit()