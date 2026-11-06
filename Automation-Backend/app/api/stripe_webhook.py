import os
import logging
import stripe
from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.models.models import Event, Workflow
from app.core.observers import WorkflowExecutionObserver

router = APIRouter()
engine_observer = WorkflowExecutionObserver()

# Use logging instead of print for production
logger = logging.getLogger(__name__)

@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not endpoint_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature header")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    existing = db.query(Event).filter(Event.stripe_event_id == event['id']).first()
    if existing:
        return {"status": "ignored", "message": "Event already processed"}

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Check payment status FIRST
        if session.get('payment_status') != 'paid':
            return {"status": "ignored", "message": "Payment not completed"}
        
        ref = session.get('client_reference_id')
        if not ref or not str(ref).isdigit():
            return {"status": "ignored", "message": "No valid workflow reference"}
        
        workflow_id = int(ref)
        
        # Look up workflow WITHOUT filtering by is_active
        workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            logger.error(f"CRITICAL: Paid for nonexistent workflow {workflow_id}, event {event['id']}")
            return {"status": "ignored", "message": "Workflow not found"}

        # If workflow is inactive, save a failure ledger for the refund trail
        status = "pending" if workflow.is_active else "failed"
        error = None if workflow.is_active else "Workflow inactive at payment time. Refund needed."

        new_event = Event(
            workflow_id=workflow_id, 
            event_type="stripe_payment",
            stripe_event_id=event['id'],
            payload=event.to_dict(),
            status=status,
            error_log=error
        )
        try:
            db.add(new_event)
            db.commit()
            db.refresh(new_event)
        except IntegrityError:
            db.rollback()
            return {"status": "ignored", "message": "Event already processed (race condition)"}

        # Only trigger the engine if the workflow is active
        if workflow.is_active:
            event_data = {
                "id": new_event.id,
                "workflow_id": new_event.workflow_id,
                "payload": new_event.payload,
                "status": new_event.status
            }
            try:
                engine_observer.update(event_data, workflow.definition)
            except Exception as e:
                new_event.status = "failed"
                new_event.error_log = f"Failed to queue task: {str(e)}"
                db.commit()
        else:
            logger.warning(f"Payment received for INACTIVE workflow {workflow_id}. Refund needed.")

    return {"status": "success", "message": "Stripe event received"}
