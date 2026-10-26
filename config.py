"""Centralized LLM & Runtime Configuration for Outbound SDR Agentic Pipeline.

Enterprise Pattern:
- Centralized Model Factory: Avoids hardcoded LLM configurations across agent nodes.
- Controlled Temperature: Routing and analysis require low temperatures (0.0 - 0.2)
  for deterministic outputs, while copywriting may use moderate temperature.
- Fail-Fast Environment Validation: Detects missing API keys before graph execution.
"""

import os
from typing import Optional
from dotenv import load_dotenv
from langchain_groq import ChatGroq

# Load environment variables from .env file
load_dotenv()


def get_groq_api_key() -> str:
    """Retrieve and validate the Groq API key."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "GROQ_API_KEY is not set or empty.\n"
            "Please add your Groq API key to the .env file in the project root:\n"
            "  GROQ_API_KEY=gsk_..."
        )
    return api_key


def get_llm(
    temperature: float = 0.1,
    model_name: Optional[str] = None,
    max_retries: int = 2,
    timeout: float = 30.0,
) -> ChatGroq:
    """Enterprise LLM Factory for Groq-hosted models.
    
    Args:
        temperature: Controls randomness (0.0 for strict deterministic routing/scoring).
        model_name: Model identifier (defaults to GROQ_MODEL in env or 'openai/gpt-oss-20b').
        max_retries: Number of retries on transient network/rate-limit errors.
        timeout: Request timeout in seconds.
        
    Returns:
        Configured ChatGroq instance.
    """
    api_key = get_groq_api_key()
    selected_model = model_name or os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    
    return ChatGroq(
        groq_api_key=api_key,
        model_name=selected_model,
        temperature=temperature,
        max_retries=max_retries,
        timeout=timeout,
    )
