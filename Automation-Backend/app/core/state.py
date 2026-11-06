from sqlalchemy.orm import Session
from app.models.models import Event
from datetime import datetime, timezone

# THE STATE INTERFACE
class EventState:
    def handle(self, event_id: int, db: Session):
        pass

# CONCRETE STATES
class PendingState(EventState):
    def handle(self, event_id: int, db: Session):
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.status = "pending"
            db.commit()

class RunningState(EventState):
    def handle(self, event_id: int, db: Session):
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.status = "running"
            db.commit()

class CompletedState(EventState):
    def handle(self, event_id: int, db: Session):
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.status = "completed"
            event.processed_at = datetime.now(timezone.utc)
            db.commit()

class FailedState(EventState):
    def handle(self, event_id: int, db: Session):
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.status = "failed"
            db.commit()
