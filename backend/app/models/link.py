from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint, String
from sqlalchemy.orm import relationship
from app.db.base import Base

class Link(Base):
    __tablename__ = "links"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    from_page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
    to_page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
    link_type = Column(String(50), default="content")  # content, menu, footer, sidebar
    
    # Relations
    from_page = relationship("Page", foreign_keys=[from_page_id], back_populates="outgoing_links")
    to_page = relationship("Page", foreign_keys=[to_page_id], back_populates="incoming_links")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('from_page_id', 'to_page_id', name='unique_link'),
    )