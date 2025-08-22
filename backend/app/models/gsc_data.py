from sqlalchemy import Column, Integer, String, Float, ForeignKey, UniqueConstraint, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime

class GSCData(Base):
    __tablename__ = "gsc_data"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    page_id = Column(Integer, ForeignKey("pages.id"), nullable=True)  # Peut être null si la page n'existe pas dans notre base
    url = Column(String, nullable=False)  # URL from GSC (might not match exactly with our pages)
    
    # GSC Metrics
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)  # Click-through rate as percentage
    position = Column(Float, default=0.0)  # Average position in search results
    
    # Import metadata
    import_date = Column(DateTime, default=datetime.utcnow)
    period_start = Column(DateTime, nullable=True)  # GSC data period start
    period_end = Column(DateTime, nullable=True)    # GSC data period end
    
    # Relations
    project = relationship("Project", back_populates="gsc_data")
    page = relationship("Page", back_populates="gsc_data")
    
    # Constraints - one GSC record per URL per project per import
    __table_args__ = (
        UniqueConstraint('project_id', 'url', 'import_date', name='unique_project_url_import'),
    )