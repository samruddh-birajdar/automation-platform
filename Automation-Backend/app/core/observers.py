from abc import ABC, abstractmethod
from app.core.tasks import process_event_task

class EventObserver(ABC):
    @abstractmethod
    def update(self, event_data: dict, workflow_definition: dict):
        pass

class WorkflowExecutionObserver(EventObserver):
    def update(self, event_data: dict, workflow_definition: dict):
        print(f"🔔 [Observer] Event {event_data.get('id')} received. Sending to Celery...")
        
        # Instead of running the engine synchronously, we send it to the background worker!
        process_event_task.delay(
            event_id=event_data.get('id'),
            workflow_definition=workflow_definition,
            event_payload=event_data.get('payload')
        )
