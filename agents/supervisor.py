"""Campaign Supervisor & Routing Engine.
Enterprise Pattern:
- Structured Output Routing: Enforces a strict Pydantic contract (CampaignDecision)
  preventing routing hallucinations or malformed state transitions.
- Early Disqualification Guardrails: Terminates pipeline early if ICP score < 5,
  saving LLM tokens and human review time.
- State Reconciliation: Inspects domain artifacts (research_summary, icp_fit_score,
  email_draft) to make deterministic next-hop decisions.
"""

from langgraph.typing import ContextT
from langchain_core.prompts import structured
from typing import Literal
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from config import get_llm
from state import MultiAgentSDRState

SUPERVISOR_SYSTEM_PROMPT = """You are the Campaign Supervisor for an Autonomous Outbound SDR Workforce.
Your job is to inspect the campaign state, evaluate progress against business rules, and route to the correct next worker.

Routing Rules:
1. If 'research_summary' is missing -> Route to 'researcher'.
2. If 'research_summary' is present but 'icp_fit_score' is 0 -> Route to 'analyst'.
3. If 'icp_fit_score' < 5: Disqualified lead -> Route to 'FINISH'.
4. If 'icp_fit_score' >= 5 and 'email_draft' is empty -> Route to 'copywriter'.
5. If 'email_draft' is present and 'eval_verdict' is empty -> Route to 'evaluator'.
6. If 'eval_verdict' == 'NEEDS_REVISION' and 'eval_attempts' < 2 -> Route to 'copywriter'.
7. If 'eval_verdict' == 'PASS' or 'eval_attempts' >= 2 -> Route to 'dispatcher'.
8. If campaign is complete -> Route to 'FINISH'.

Output your decision strictly adhering to the CampaignDecision schema.
"""

class CampaignDecision(BaseModel):
    next_step: Literal["researcher", "analyst", "copywriter", "evaluator", "dispatcher", "FINISH"] = Field(
        description="The next worker node to execute or FINISH to terminate the campaign"
    )
    reasoning: str = Field(description="1-sentence business rationale for this routing decision.")


def supervisor_node(state: MultiAgentSDRState) -> dict:
    """Supervisor node that evaluates campaign progress and outputs the next action."""
    company = state.get("target_company", "Unknown")
    has_research = bool(state.get("research_summary", "").strip())
    icp_score = state.get("icp_fit_score", 0)
    has_draft = bool(state.get("email_draft", "").strip())
    status = state.get("approval_status", "PENDING")

    llm = get_llm(temperature=0.0)
    structured_llm = llm.with_structured_output(CampaignDecision)

    eval_verdict = state.get("eval_verdict", "")
    eval_attempts = state.get("eval_attempts", 0)

    state_snapshot = f"""Campaign State Snapshot:
- Target Company: {company}
- Has Research Summary: {has_research}
- ICP Fit Score: {icp_score}/10
- Has Email Draft: {has_draft}
- Evaluation Verdict: {eval_verdict} (Attempts: {eval_attempts})
- Approval Status: {status}
"""

    decision: CampaignDecision = structured_llm.invoke([
        SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT),
        HumanMessage(content=f"{state_snapshot}\nDetermine the next step:"),
    ])

    return {
        "next_step": decision.next_step,
        "messages": [
            AIMessage(
                content=f"[Supervisor]: Routing to '{decision.next_step}'. Reason: {decision.reasoning}"
            )
        ]
    }