from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.base import TimestampMixin

class Project(Base, TimestampMixin):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    domain = Column(String, nullable=False)
    total_pages = Column(Integer, default=0)
    page_types = Column(String, nullable=True)  # JSON string of available page types
    
    # Relations
    pages = relationship("Page", back_populates="project", cascade="all, delete-orphan")
    simulations = relationship("Simulation", back_populates="project", cascade="all, delete-orphan")
    gsc_data = relationship("GSCData", back_populates="project", cascade="all, delete-orphan")