import os
import stripe
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Workflow

router = APIRouter()

class CheckoutRequest(BaseModel):
    workflow_id: int

@router.post("/create-checkout-session")
async def create_checkout_session(data: CheckoutRequest, db: Session = Depends(get_db)):
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # CRITICAL: Must check is_active to prevent paying for deleted workflows
    workflow = db.query(Workflow).filter(
        Workflow.id == data.workflow_id,
        Workflow.is_active == True
    ).first()
    
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found or inactive")

    FIXED_PRICE_CENTS = 500 
    
    try:
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {'name': f"Workflow: {workflow.name}"},
                    'unit_amount': FIXED_PRICE_CENTS, 
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f"{frontend_url}/?payment=success",
            cancel_url=f"{frontend_url}/?payment=canceled",
            client_reference_id=str(workflow.id),
        )
        return {"url": session.url}
    except Exception as e:
        print(f"STRIPE ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not start checkout. Please try again.")
