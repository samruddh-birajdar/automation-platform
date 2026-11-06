import os
from dotenv import load_dotenv
from celery import Celery
from celery.schedules import crontab

load_dotenv()

celery_app = Celery(
    "automation_worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0",
    include=["app.core.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # --- CELERY BEAT SCHEDULE ---
    beat_schedule={
        'run-every-10-seconds': {
            'task': 'app.core.tasks.scheduled_health_check',
            'schedule': 10.0, # Every 10 seconds
        },
    },
)
