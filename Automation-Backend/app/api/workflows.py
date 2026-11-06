from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import Workflow
from app.schemas.workflow import WorkflowCreate, WorkflowResponse

router = APIRouter()

@router.post("/", response_model=WorkflowResponse)
def create_workflow(workflow_in: WorkflowCreate, db: Session = Depends(get_db)):
    definition = {"steps": [step.model_dump() for step in workflow_in.steps]}
    new_workflow = Workflow(
        name=workflow_in.name,
        description=workflow_in.description,
        definition=definition
    )
    db.add(new_workflow)
    db.commit()
    db.refresh(new_workflow)
    return new_workflow

@router.get("/", response_model=List[WorkflowResponse])
def get_workflows(db: Session = Depends(get_db)):
    # Only show active workflows
    return db.query(Workflow).filter(Workflow.is_active == True).all()

@router.get("/{workflow_id}", response_model=WorkflowResponse)
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow

@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: int, db: Session = Depends(get_db)):
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")
    
    # Soft delete: Never destroy the payment ledger!
    workflow.is_active = False
    db.commit()
    return {"message": "Workflow deactivated successfully"}
