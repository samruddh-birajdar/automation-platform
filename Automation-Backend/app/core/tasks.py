import os
import redis
import uuid
from app.core.celery_app import celery_app
from app.core.engine import AutomationEngine
from app.database import SessionLocal
from app.models.models import Event
from app.core.state import RunningState, CompletedState, FailedState

# Initialize Redis client
redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

# LUA SCRIPT: Safely release the lock ONLY if the token matches
RELEASE_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

@celery_app.task(name="process_event")
def process_event_task(event_id: int, workflow_definition: dict, event_payload: dict):
    # 1. Generate a unique token for this worker
    lock_token = str(uuid.uuid4())
    lock_key = f"lock:event:{event_id}"
    
    # 2. Try to acquire the lock (nx=True means only if it doesn't exist, px=30000 is 30 seconds)
    acquired = redis_client.set(lock_key, lock_token, nx=True, px=30000)
    
    if not acquired:
        print(f"🔒 [Worker] Event {event_id} is already being processed by another worker. Skipping.")
        return

    print(f"👷 [Worker] Picked up event {event_id} for processing... (Lock acquired)")
    db = SessionLocal()
    
    try:
        RunningState().handle(event_id, db)
        
        engine = AutomationEngine()
        success, data = engine.run_workflow(workflow_definition, event_payload)
        
        event = db.query(Event).filter(Event.id == event_id).first()
        
        if success:
            CompletedState().handle(event_id, db)
            event.result_data = data
            print(f"✅ [Worker] Event {event_id} completed successfully.")
        else:
            FailedState().handle(event_id, db)
            event.error_log = data.get("error")
            print(f"❌ [Worker] Event {event_id} failed.")
            
        db.commit()
            
    except Exception as e:
        FailedState().handle(event_id, db)
        event = db.query(Event).filter(Event.id == event_id).first()
        if event:
            event.error_log = str(e)
            db.commit()
        print(f"💥 [Worker] Critical error on event {event_id}: {str(e)}")
    finally:
        # 3. Safely release the lock using the Lua script
        # This ensures we don't delete a lock that expired and was acquired by another worker
        redis_client.eval(RELEASE_SCRIPT, 1, lock_key, lock_token)
        db.close()

# --- SCHEDULER TASK ---
@celery_app.task(name="app.core.tasks.scheduled_health_check")
def scheduled_health_check():
    print("⏰ [Scheduler] Running scheduled health check task...")
    # In a real app, this could be checking for stale workflows
    # or triggering a daily report.
