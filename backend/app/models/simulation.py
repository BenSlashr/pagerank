from sqlalchemy import Column, Integer, String, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.models.base import TimestampMixin

class Simulation(Base, TimestampMixin):
    __tablename__ = "simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    name = Column(String, nullable=False)
    rules_config = Column(JSON, nullable=False)  # List of LinkingRule configurations
    page_boosts = Column(JSON, default=lambda: [])  # List of PageBoost configurations
    protected_pages = Column(JSON, default=lambda: [])  # List of PageProtect configurations
    status = Column(String, default="pending")  # pending, running, completed, failed
    
    # Relations
    project = relationship("Project", back_populates="simulations")
    results = relationship("SimulationResult", back_populates="simulation", cascade="all, delete-orphan")

class SimulationResult(Base):
    __tablename__ = "simulation_results"
    
    id = Column(Integer, primary_key=True, index=True)
    simulation_id = Column(Integer, ForeignKey("simulations.id"), nullable=False)
    page_id = Column(Integer, ForeignKey("pages.id"), nullable=False)
    new_pagerank = Column(Float, nullable=False)
    pagerank_delta = Column(Float, nullable=False)  # Difference with original
    
    # Relations
    simulation = relationship("Simulation", back_populates="results")
    page = relationship("Page")