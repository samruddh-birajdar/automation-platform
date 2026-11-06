from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class StepSchema(BaseModel):
    type: str
    class Config:
        extra = "allow"
        json_schema_extra = {
            "example": {"type": "ai", "prompt": "Translate this"}
        }

class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[StepSchema]

class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    definition: Dict[str, Any]

    class Config:
        from_attributes = True
