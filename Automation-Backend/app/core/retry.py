from abc import ABC, abstractmethod
import time

# 1. THE STRATEGY INTERFACE
class RetryStrategy(ABC):
    @abstractmethod
    def execute_with_retry(self, func, *args, **kwargs):
        pass

# 2. CONCRETE STRATEGY 1: NO RETRY
class NoRetry(RetryStrategy):
    def execute_with_retry(self, func, *args, **kwargs):
        return func(*args, **kwargs)

# 3. CONCRETE STRATEGY 2: EXPONENTIAL BACKOFF
class ExponentialBackoffRetry(RetryStrategy):
    def __init__(self, max_attempts=3, base_delay=1):
        self.max_attempts = max_attempts
        self.base_delay = base_delay

    def execute_with_retry(self, func, *args, **kwargs):
        for attempt in range(self.max_attempts):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if attempt == self.max_attempts - 1:
                    raise e # Give up and throw the error
                
                # Calculate delay: 1s, 2s, 4s, etc.
                delay = self.base_delay * (2 ** attempt)
                print(f"⚠️ Attempt {attempt + 1} failed. Retrying in {delay} seconds...")
                time.sleep(delay)
