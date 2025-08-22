from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class Page(Base):
    __tablename__ = "pages"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    url = Column(String, nullable=False)
    type = Column(String)  # 'product', 'category', 'blog', 'other'
    category = Column(String)  # For grouping (ex: /electronics/)
    current_pagerank = Column(Float, default=0.0)
    title = Column(String)  # Page title for semantic analysis
    extracteur_1 = Column(String)  # Content extracted for semantic analysis
    
    # Relations
    project = relationship("Project", back_populates="pages")
    outgoing_links = relationship("Link", foreign_keys="Link.from_page_id", back_populates="from_page")
    incoming_links = relationship("Link", foreign_keys="Link.to_page_id", back_populates="to_page")
    gsc_data = relationship("GSCData", back_populates="page")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('project_id', 'url', name='unique_project_url'),
    )