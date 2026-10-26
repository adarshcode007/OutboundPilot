"""Automated Compliance & Anti-Hallucination Evaluator (LLM-as-a-Judge).
Enterprise Pattern:
- Actor-Critic Architecture: Evaluates generated copy before human review.
- Factual Grounding: Verifies that every claim in the pitch is backed by the research brief.
- Deliverability Protection: Flags spam-trigger words to protect domain sender reputation.
"""

from langchain_core.messages import content
from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from state import MultiAgentSDRState
from config import get_llm

EVALUATOR_SYSTEM_PROMPT = """You are an Enterprise AI Email Quality & Compliance Judge.
Your job is to objectively score cold outbound email pitches before human review.

Evaluation Criteria:
1. Factual Grounding (1-10): Are all statements and assumptions ABOUT THE TARGET COMPANY (their initiatives, hiring priorities, and challenges) strictly grounded in the research brief? (Descriptions of our own product capabilities are permitted).
2. Deliverability & Tone (1-10): Is the tone professional, consultative, and low-friction? (Penalize aggressive claims, spam buzzwords, and all-caps guarantees).
3. Length: Is the pitch concise and under 120 words?

Overall Score (1-10):
- 7-10: High quality, grounded in verified prospect context. (Verdict: PASS)
- 1-6: False claims about the prospect or spammy tone. (Verdict: NEEDS_REVISION)
"""


class EmailEvaluation(BaseModel):
    """Pydantic schema for automated pitch evaluation."""
    grounding_score: int = Field(description="Score 1-10 on factual accuracy against the research brief", ge=1, le=10)
    deliverability_score: int = Field(description="Score 1-10 on tone and spam risk", ge=1, le=10)
    overall_score: int = Field(description="Overall pitch quality score 1-10", ge=1, le=10)
    verdict: Literal["PASS", "NEEDS_REVISION"] = Field(description="PASS if overall >= 7, else NEEDS_REVISION")
    critique: str = Field(description="Specific feedback for improvements if any")

def evaluate_email_draft(research_brief: str, email_draft: str) -> EmailEvaluation:
    """Run LLM-as-a-Judge evaluation on an email draft."""
    llm = get_llm(temperature=0.1)
    structured_llm = llm.with_structured_output(EmailEvaluation)

    prompt = f"""Verified Research Brief:
            {research_brief}
            Drafted Email Proposal:
            {email_draft}
            Evaluate this pitch against the research brief:"""
    
    result: EmailEvaluation = structured_llm.invoke([
        SystemMessage(content=EVALUATOR_SYSTEM_PROMPT),
        HumanMessage(content=prompt)
    ])
    return result


def evaluator_node(state: MultiAgentSDRState) -> dict:
    """Worker node that objectively judges draft quality before human review."""
    research = state.get("research_summary", "")
    draft = state.get("email_draft", "")
    attempts = state.get("eval_attempts", 0) + 1

    evaluation: EmailEvaluation = evaluate_email_draft(research, draft)

    return {
        "eval_score": evaluation.overall_score,
        "eval_verdict": evaluation.verdict,
        "eval_critique": evaluation.critique,
        "messages": [
            AIMessage(
                content=f"[AI Judge]: Score {evaluation.overall_score}/10 ({evaluation.verdict}).\nCritique: {evaluation.critique}\n" 
            )
        ]
    }
