from sqlalchemy import Column, Integer, DateTime
from sqlalchemy.sql import func
from app.db.base import Base

class TimestampMixin:
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())