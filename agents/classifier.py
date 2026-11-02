"""
AI Inbound Email Reply Classifier.
Analyzes prospect replies to outbound email pitches using structured Pydantic schemas:
- Classifies sentiment (INTERESTED, NOT_INTERESTED, OUT_OF_OFFICE, REFERRAL, QUESTION).
- Extracts referral contacts if mentioned.
- Formulates recommended action for the sales representative.
"""

from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage
from config import get_llm

class ReplySentiment(str, Enum):
    INTERESTED = "INTERESTED"
    NOT_INTERESTED = "NOT_INTERESTED"
    OUT_OF_OFFICE = "OUT_OF_OFFICE"
    REFERRAL = "REFERRAL"
    QUESTION = "QUESTION"

class InboundReplyAnalysis(BaseModel):
    sentiment: ReplySentiment = Field(description="Primary intent/sentiment of the prospect's reply")
    is_positive_intent: bool = Field(description="True if prospect is open to talking or requested more information")
    summary: str = Field(description="One-sentence executive summary of the reply")
    recommended_action: str = Field(description="Specific recommended next step for the sales rep")
    referral_contact: Optional[str] = Field(default=None, description="Referred colleague name or email if mentioned")

CLASSIFIER_SYSTEM_PROMPT = """You are an Enterprise B2B Sales Operations Specialist.
Your job is to objectively analyze inbound email replies from prospective buyers.

Categories:
- INTERESTED: Prospect wants to chat, asked for a demo, times to meet, or pricing.
- NOT_INTERESTED: Explicit rejection, unsubscribes, budget freeze, or competitor lock-in.
- OUT_OF_OFFICE: Automated auto-responder with return date.
- REFERRAL: Prospect directs you to a colleague (e.g. "Talk to Sarah at sarah@company.com").
- QUESTION: Prospect asks clarifying technical or security questions.

Rules:
- Be strict on positive intent: Only mark is_positive_intent=True if there is genuine interest or a referral.
- Always provide an actionable recommended_action for the human sales team.
"""

def classify_inbound_reply(reply_text: str, original_pitch: str="") -> Dict[str, Any]:
    """Classifies an inbound prospect email reply using structured Groq LLM output."""
    llm = get_llm(temperature=0.1)
    structured_llm = llm.with_structured_output(InboundReplyAnalysis)

    user_prompt= f"""Inbound Email Reply from Prospect:
    ---
    {reply_text}
    ---

    Original Outbound Pitch Sent (if available):
    ---
    {original_pitch or "Not provided"}
    ---

    Analyze this prospect reply:
    """
    response: InboundReplyAnalysis = structured_llm.invoke([
        SystemMessage(content=CLASSIFIER_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt),
    ])

    return response.model_dump()
    