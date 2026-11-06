from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.database import get_db
from app.models.models import Event

router = APIRouter()

class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    workflow_id: int
    event_type: str
    status: Optional[str]
    error_log: Optional[str]
    result_data: Optional[Any]
    created_at: datetime
    # NOTE: payload is intentionally excluded to prevent PII leaks

@router.get("/", response_model=List[EventResponse])
def get_all_events(db: Session = Depends(get_db)):
    return db.query(Event).order_by(Event.created_at.desc()).limit(50).all()
