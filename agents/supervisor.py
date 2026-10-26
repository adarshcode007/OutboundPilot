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
1. If 'research_summary' is missing or empty -> Route to 'researcher'.
2. If 'research_summary' is present but 'icp_fit_score' is 0 or unassigned -> Route to 'analyst'.
3. If 'icp_fit_score' is assigned:
   - If 'icp_fit_score' < 5: The account is DISQUALIFIED. Route to 'FINISH' immediately.
   - If 'icp_fit_score' >= 5 and 'email_draft' is empty: Route to 'copywriter'.
4. If 'email_draft' is present and not yet dispatched: Route to 'dispatcher'.
5. If the campaign is complete: Route to 'FINISH'.
Output your decision strictly adhering to the CampaignDecision schema.
"""

class CampaignDecision(BaseModel):
    """Pydantic schema enforcing structured routing decisions."""
    next_step: Literal["researcher", "analyst", "copywriter", "dispatcher", "FINISH"] = Field(
        description="The next worker node to execute or FINISH to terminate the campaign"
    )
    reasoning: str = Field(
        description="Brief 1-sentence business rationale for this routing decision."
    )

def supervisor_node(state: MultiAgentSDRState) -> dict:
    """Supervisor node that evaluates campaign progress and outputs the next action."""
    company = state.get("target_company", "Unknown")
    has_research = bool(state.get("research_summary", "").strip())
    icp_score = state.get("icp_fit_score", 0)
    has_draft = bool(state.get("email_draft", "").strip())
    status = state.get("approval_status", "PENDING")

    llm = get_llm(temperature=0.0)
    structured_llm = llm.with_structured_output(CampaignDecision)

    state_snapshot = f"""Campaign State Snapshot:
- Target Company: {company}
- Has Research Summary: {has_research}
- ICP Fit Score: {icp_score}/10
- Has Email Draft: {has_draft}
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