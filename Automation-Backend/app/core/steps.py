from abc import ABC, abstractmethod
import httpx
import os
import ipaddress
import socket
from urllib.parse import urlparse
from openai import OpenAI

def is_safe_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ('http', 'https'): return False
        hostname = parsed.hostname
        if not hostname: return False
        ip = socket.gethostbyname(hostname)
        ip_obj = ipaddress.ip_address(ip)
        if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
            return False
        return True
    except Exception:
        return False

class WorkflowStep(ABC):
    @abstractmethod
    def execute(self, payload: dict):
        pass

class HttpRequestStep(WorkflowStep):
    def __init__(self, config: dict):
        self.url = config.get("url", "https://api.example.com")
        self.method = config.get("method", "POST").upper()

    def execute(self, payload: dict):
        if not is_safe_url(self.url):
            raise Exception(f"SSRF Blocked: Unsafe URL {self.url}")
        print(f"🌐 [HttpRequestStep] {self.method} request to {self.url}")
        try:
            with httpx.Client(timeout=10.0) as client:
                if self.method == "GET":
                    response = client.get(self.url, params=payload)
                else:
                    response = client.post(self.url, json=payload)
                response.raise_for_status() 
                return {"status": "success", "step": "http", "status_code": response.status_code}
        except Exception as e:
            raise Exception(f"HTTP Request failed: {str(e)}")

class AiGenerationStep(WorkflowStep):
    def __init__(self, config: dict):
        self.prompt = config.get("prompt", "Summarize this data")
        self.api_key = os.getenv("GROQ_API_KEY")

    def execute(self, payload: dict):
        print(f"🤖 [AiGenerationStep] Calling Groq with prompt: '{self.prompt}'")
        
        if not self.api_key:
            raise Exception("GROQ_API_KEY not found in environment variables")

        try:
            # Point the OpenAI client to Groq's ultra-fast endpoint
            client = OpenAI(
                api_key=self.api_key,
                base_url="https://api.groq.com/openai/v1"
            )
            
            full_prompt = f"{self.prompt}\n\nData to process:\n{payload}"
            
            response = client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[{"role": "user", "content": full_prompt}]
            )
            
            result_text = response.choices[0].message.content
            print(f"✅ [AiGenerationStep] Groq responded.")
            return {"status": "success", "step": "ai", "result": result_text}
            
        except Exception as e:
            raise Exception(f"Groq API failed: {str(e)}")
