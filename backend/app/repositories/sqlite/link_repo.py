from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.link import Link
from app.repositories.base import LinkRepository

class SQLiteLinkRepository(LinkRepository):
    def __init__(self, db: Session):
        self.db = db
    
    async def get_by_project(self, project_id: int) -> List[Link]:
        return self.db.query(Link).filter(Link.project_id == project_id).all()
    
    async def bulk_insert(self, links: List[Dict]) -> None:
        if not links:
            return
            
        # Handle potential duplicates gracefully
        try:
            link_objects = [Link(**link_data) for link_data in links]
            self.db.bulk_save_objects(link_objects)
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            # If bulk insert fails due to unique constraints, insert one by one
            successful_inserts = 0
            for link_data in links:
                try:
                    # Check if link already exists
                    existing = self.db.query(Link).filter(
                        Link.from_page_id == link_data['from_page_id'],
                        Link.to_page_id == link_data['to_page_id']
                    ).first()
                    
                    if not existing:
                        link = Link(**link_data)
                        self.db.add(link)
                        self.db.commit()
                        successful_inserts += 1
                except Exception:
                    self.db.rollback()
                    continue
            
            print(f"Successfully inserted {successful_inserts} new links out of {len(links)} total")
    
    async def delete_by_project(self, project_id: int) -> None:
        self.db.query(Link).filter(Link.project_id == project_id).delete()
        self.db.commit()