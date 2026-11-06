import logging
logging.basicConfig(level=logging.INFO)
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, Depends
from app.database import SessionLocal, engine, Base, get_db
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.models import models
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from app.api.webhooks import router as webhook_router
from app.api.workflows import router as workflow_router
from app.api.events import router as event_router
from app.api.stripe_webhook import router as stripe_router
from app.api.checkout import router as checkout_router

Base.metadata.create_all(bind=engine)

# 1. Create app FIRST
app = FastAPI(title="Automation Backend")

# 2. Add Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Include routers
app.include_router(webhook_router)
app.include_router(workflow_router, prefix="/api/workflows", tags=["Workflows"])
app.include_router(event_router, prefix="/api/events", tags=["Events"])
app.include_router(stripe_router, prefix="/webhook", tags=["Stripe"])
app.include_router(checkout_router, prefix="/api/checkout", tags=["Checkout"])
# ✅ CORRECT ORDER
app.include_router(stripe_router, prefix="/webhook", tags=["Stripe"])
app.include_router(webhook_router) 

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Automation Backend is running"}