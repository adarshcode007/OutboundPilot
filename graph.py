"""
StateGraph Assembly & Orchestration Engine for Outbound SDR Pipeline.
Enterprise Pattern:
- Cyclic Handoff Hub: Workers return control to the supervisor after execution.
- Conditional Edge Routing: Router inspects state['next_step'] to branch execution.
- Parameterized Compilation: Supports optional checkpointers and interrupt gates
  to prepare for Human-in-the-Loop governance (Milestone 6).
"""

from typing import Optional
from langgraph.graph import StateGraph, START, END
from langchain_core.messages import AIMessage

from state import MultiAgentSDRState
from tools import send_outbound_email
from agents.supervisor import supervisor_node
from agents.researcher import researcher_node
from agents.analyst import analyst_node
from agents.copywriter import copywriter_node
from agents.evaluator import evaluator_node

def dispatcher_node(state: MultiAgentSDRState) -> dict:
    """Outbound Dispatcher Node.
    
    Executes the high-stakes side-effect (email dispatch) once approved.
    Extracts the subject and body from the draft, sends the email, and logs state.
    """
    to_email = state.get("target_contact_email", "")
    draft = state.get("email_draft", "")
    company = state.get("target_company", "")

    # Parse subject line and body from the copywriter's draft
    subject = f"AI Infrastructure Partnership with {company}"
    body = draft

    lines = [line.strip() for line in draft.splitlines() if line.strip()]
    for line in lines:
        if line.lower().startswith("subject:") or line.lower().startswith("**subject:**"):
            subject = line.split(":",1)[1].replace("*","").strip()

            # Remove subject line from body
            body = "\n".join(lines[1:]).strip()
            break
    
    # Execute transactional tool
    dispatch_receipt = send_outbound_email.invoke({
        "to_email": to_email,
        "subject": subject,
        "body": body
    })

    return {
        "approval_status": "APPROVED",
        "next_step": "FINISH",
        "messages": [
            AIMessage(content=f"[Dispatcher]: Outbound campaign executed.\n{dispatch_receipt}")
        ]
    }

def supervisor_router(state: MultiAgentSDRState) -> str:
    """Conditional edge router: Reads state['next_step'] and directs execution."""
    step = state.get("next_step", "FINISH")
    if step == "FINISH":
        return END
    return step

def build_sdr_graph(checkpointer=None, interrupt_before: Optional[list] = None):
    """Build and compile the LangGraph StateGraph workflow.
    
    Args:
        checkpointer: Optional persistence checkpointer (e.g., MemorySaver).
        interrupt_before: List of node names to pause execution before (e.g. ['dispatcher']).
        
    Returns:
        Compiled StateGraph runnable.
    """
    # 1. Initialize StateGraph with our domain schema
    workflow = StateGraph(MultiAgentSDRState)

    # 2. Register all agent and worker nodes
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("analyst", analyst_node)
    workflow.add_node("copywriter", copywriter_node)
    workflow.add_node("evaluator", evaluator_node)
    workflow.add_node("dispatcher", dispatcher_node)

    # 3. Define Entry Edge: Start at the Supervisor
    workflow.add_edge(START, "supervisor")

    # 4. Conditional routing out of the Supervisor
    workflow.add_conditional_edges(
        "supervisor",
        supervisor_router,
        {
            "researcher": "researcher",
            "analyst": "analyst",
            "copywriter": "copywriter",
            "evaluator": "evaluator",
            "dispatcher": "dispatcher",
            END: END,
        }
    )

    # 5. Cyclic return edges: Workers ALWAYS hand back to Supervisor
    workflow.add_edge("researcher", "supervisor")
    workflow.add_edge("analyst", "supervisor")
    workflow.add_edge("copywriter", "supervisor")
    workflow.add_edge("evaluator", "supervisor")

    # 6. Dispatcher terminates the pipeline
    workflow.add_edge("dispatcher", END)

    # 7. Compile the graph
    return workflow.compile(
        checkpointer=checkpointer,
        interrupt_before=interrupt_before,
    )
