from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import Dict, Any
from app.database import get_db
from app.models.models import Event, Workflow
from app.core.observers import WorkflowExecutionObserver

router = APIRouter()
engine_observer = WorkflowExecutionObserver()

@router.post("/webhook/{workflow_id}")
async def receive_webhook(
    workflow_id: int, 
    payload: Dict[str, Any] = Body(...), 
    db: Session = Depends(get_db)
):
    # 1. Save the event to the database
    new_event = Event(
        workflow_id=workflow_id,
        event_type="webhook",
        payload=payload,
        status="pending"
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    # 2. Fetch the workflow definition
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
         return {"status": "error", "message": "Workflow not found"}

    # 3. Notify the Observer
    event_data = {
        "id": new_event.id,
        "workflow_id": new_event.workflow_id,
        "payload": new_event.payload,
        "status": new_event.status
    }
    
    engine_observer.update(event_data, workflow.definition)

    return {"status": "received", "event_id": new_event.id}
