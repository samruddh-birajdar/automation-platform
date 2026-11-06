from app.core.steps import WorkflowStep, HttpRequestStep, AiGenerationStep

class StepFactory:
    @staticmethod
    def create_step(step_type: str, config: dict) -> WorkflowStep:
        """
        The Factory Method. 
        It takes a string and returns the correct class instance.
        """
        if step_type == "http":
            return HttpRequestStep(config)
        elif step_type == "ai":
            return AiGenerationStep(config)
        else:
            raise ValueError(f"Unknown step type: {step_type}")