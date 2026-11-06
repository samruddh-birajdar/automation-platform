from dotenv import load_dotenv
load_dotenv()

import os
import logging
logging.basicConfig(level=logging.INFO)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import models

# Import routers
from app.api.webhooks import router as webhook_router
from app.api.workflows import router as workflow_router
from app.api.events import router as event_router
from app.api.stripe_webhook import router as stripe_router
from app.api.checkout import router as checkout_router

# Create tables
Base.metadata.create_all(bind=engine)

# Create app
app = FastAPI(title="Automation Backend")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (each ONCE)
app.include_router(webhook_router)
app.include_router(workflow_router, prefix="/api/workflows", tags=["Workflows"])
app.include_router(event_router, prefix="/api/events", tags=["Events"])
app.include_router(stripe_router, prefix="/webhook", tags=["Stripe"])
app.include_router(checkout_router, prefix="/api/checkout", tags=["Checkout"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Automation Backend is running"}
