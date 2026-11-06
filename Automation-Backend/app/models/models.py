from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.database import Base

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    status = Column(String, default="active")
    definition = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    event_type = Column(String, nullable=False) 
    stripe_event_id = Column(String, unique=True, nullable=True) # UNIQUE CONSTRAINT
    payload = Column(JSON, nullable=False) 
    status = Column(String, default="pending") 
    error_log = Column(String, nullable=True)
    result_data = Column(JSON, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    workflow = relationship("Workflow", backref="events")
