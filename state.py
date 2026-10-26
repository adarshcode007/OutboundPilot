"""
Domain State Schema for Autonomous Outbound SDR Multi-Agent Pipeline.

Enterprise Pattern:
- Explicit State Fields: Structured attributes (research_summary, icp_fit_score, email_draft)
  ensure clean context handoffs without relying on unstructured message parsing.
- Annotated Reducers: the `messages` channel uses langgraph's 'add_messages' reducer to maintain
  an ausit trail across all agent transitions.
- Type Safety: Literal typing for routing ('next_step') and status gates ('approved_status')
"""

from typing import TypedDict, Annotated, Literal, Optional
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

class MultiAgentSDRState(TypedDict):
    """Unified state tracking & SDR campaign lifecycle."""

    # Audit trail & conversation context across nodes
    messages: Annotated[list[BaseMessage], add_messages]

    # Ingestion / Target Prospect Metadata
    target_company: str
    target_role: str
    target_contact_name: str
    target_contact_email: str

    # Intelligence gathering artifacts (Populated by Researcher)
    research_summary: str

    # ICP Qualification Artifacts (Populated by ICP Analyst)
    icp_fit_score: int                    # Score from 1 to 10
    icp_rationale: str                    # Explanation for why the company qualified or was rejected

    # Outbound Pitch Artifacts (Populated by Copywriter)
    email_draft: str                      # Tailored 3-paragraph executive proposal

    # Orchestration & Control Flow (Governed by Supervisor)
    next_step: Literal["researcher", "analyst", "copywriter", "evaluator", "dispatcher", "FINISH"]

    # Human-in-the-Loop (HITL)
    approval_status: Literal["PENDING", "APPROVED", "REJECTED"]

    # Evaluator Guardrail Artifacts (Populated by Evaluator Node)
    eval_score: int                       # Quality score 1 to 10
    eval_verdict: str                     # "PASS" or "NEEDS_REVISION"
    eval_critique: str                    # Judge feedback
    eval_attempts: int                    # Loop counter to prevent infinite revision loops


