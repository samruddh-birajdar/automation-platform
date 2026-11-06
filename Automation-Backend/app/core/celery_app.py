import os
from dotenv import load_dotenv
from celery import Celery

load_dotenv()

celery_app = Celery(
    "automation_worker",
    broker=os.getenv("REDIS_URL", "redis://redis:6379/0"),  # ← redis, not localhost
    backend=os.getenv("REDIS_URL", "redis://redis:6379/0"), # ← redis, not localhost
    include=["app.core.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)