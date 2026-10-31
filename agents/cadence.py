"""
Multi-Touch Outbound Cadence Generator Agent.
Generates an automated 3-touch follow-up cadence (Day 1, Day 3, Day 7)
grounded in verified company research and initial pitch context.
"""

from langchain_core.messages import content
from typing import Dict, Any
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from config import get_llm

CADENCE_SYSTEM_PROMPT = """You are an Enterprise B2B Outbound Sales Director.
Your task is to generate a high-converting, consultative 3-touch outbound email cadence.

Cadence Architecture:
1. Touch 1 (Day 1 - The Contextual Hook):
    - Reference the prospect's verified initiatives or growth priorities.
   - Introduce the core value proposition concisely.
   - Low-friction ask (< 100 words).
2. Touch 2 (Day 3 - The Value-Add Bump):
   - Acknowledge previous outreach without sounding pushy or desperate.
   - Introduce a relevant case study, specific technical metric, or integration capability.
   - Ultra-short (< 75 words).
3. Touch 3 (Day 7 - The Polite Breakup):
   - Graceful, professional sign-off ("Closing the loop").
   - Offer a zero-commitment resource or leave the door open for future timing.
   - Brief and respectful (< 50 words).

Rules:
- Professional, consultative B2B tone (never sound like a generic automated marketing blast).
- Ensure each touch has a clear Subject Line and concise Body.
"""

class CadenceTouch(BaseModel):
    step: int = Field(description="Sequence step number (1, 2, or 3)")
    day_offset: int = Field(description="Days from campaign start (e.g. 1, 3, or 7)")
    subject: str = Field(description="Email subject line")
    body: str = Field(description="Email body text")
    intent: str = Field(description="Strategic intent of this touch (e.g. 'Initial Hook', 'Social Proof Bump', 'Graceful Breakup')")

class CadencePlan(BaseModel):
    target_company: str
    target_contact: str
    target_role: str
    touch_1: CadenceTouch
    touch_2: CadenceTouch
    touch_3: CadenceTouch

def generate_outbound_cadence(
    company: str,
    contact_name: str,
    role: str,
    research_summary: str,
    initial_draft: str = "",
) -> Dict[str, Any]:
    """Generates a complete 3-touch cadence using structured LLM output."""
    llm = get_llm(temperature=0.2)
    structured_llm = llm.with_structured_output(CadencePlan)

    user_prompt = f"""Target Company: {company}
    Target Contact: {contact_name} ({role})

    Verified Research Intelligence: {research_summary}
    Initial Pitch Reference (if available): {initial_draft or "None provided"}

    Generate the 3-touch outreach sequence (Touch 1 on Day 1, Touch 2 on Day 3, Touch 3 on Day 7):
    """
    response: CadencePlan = structured_llm.invoke([
        SystemMessage(content=CADENCE_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ])
    return response.model_dump()