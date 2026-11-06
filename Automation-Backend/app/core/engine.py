from app.core.factory import StepFactory
from app.core.retry import ExponentialBackoffRetry

class AutomationEngine:
    def __init__(self, retry_strategy=None):
        self.retry_strategy = retry_strategy or ExponentialBackoffRetry(max_attempts=3)

    def run_workflow(self, workflow_definition: dict, event_payload: dict):
        print(f"\n🚀 [Engine] Starting workflow execution...")
        
        steps_config = workflow_definition.get("steps", [])
        if not steps_config:
            return True, {"message": "No steps to execute"}

        results = []
        for index, step_config in enumerate(steps_config):
            step_type = step_config.get("type")
            print(f"\n--- Executing Step {index + 1}: {step_type} ---")
            
            try:
                step_instance = StepFactory.create_step(step_type, step_config)
                result = self.retry_strategy.execute_with_retry(step_instance.execute, event_payload)
                results.append(result)
                print(f"✅ [Engine] Step {index + 1} result: {result}")
                
            except Exception as e:
                print(f"❌ [Engine] Step {index + 1} failed permanently: {str(e)}")
                # Return False and the error message
                return False, {"error": str(e), "failed_step": step_type}

        # Return True and the list of results
        return True, {"results": results}
