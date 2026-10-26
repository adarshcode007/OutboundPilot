"""FastAPI Enterprise Backend for Outbound SDR Multi-Agent Pipeline.

REST API Endpoints:
1. POST /api/campaign/start          - Trigger autonomous intelligence & pause at HITL gate
2. GET  /api/campaign/{thread_id}    - Query campaign state & review package for Frontend
3. POST /api/campaign/{thread_id}/action - Submit Human Review (Approve, Re-draft, Reject)
4. GET  /api/campaigns               - List all historical campaigns from PostgreSQL
"""

import os
import uuid
from typing import Optional, Literal
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from psycopg_pool import ConnectionPool
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, SystemMessage

from graph import build_sdr_graph
from config import get_llm
from agents.copywriter import COPYWRITER_SYSTEM_PROMPT
from agents.evaluator import evaluate_email_draft

load_dotenv()

app = FastAPI(
    title="Autonomous Outbound SDR API",
    description="Enterprise Multi-Agent Pipeline with PostgreSQL Checkpointing & HITL Review",
    version="1.0.0",
)

# Enable CORS for frontend applications (React, Next.js, Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Checkpointer (Docker PostgreSQL with MemorySaver fallback)
POSTGRES_URI = os.getenv("POSTGRES_URI", "").strip()
pool = None
checkpointer = None

if POSTGRES_URI:
    try:
        pool = ConnectionPool(conninfo=POSTGRES_URI, max_size=20, kwargs={"autocommit": True})
        checkpointer = PostgresSaver(pool)
        checkpointer.setup()
        print(">> [API] Connected to Docker PostgreSQL checkpointer.")
    except Exception as e:
        print(f">> [API] Postgres connection failed ({e}). Falling back to MemorySaver.")
        checkpointer = MemorySaver()
else:
    checkpointer = MemorySaver()

# Build the compiled StateGraph with the interrupt gate before dispatcher
sdr_graph = build_sdr_graph(
    checkpointer=checkpointer,
    interrupt_before=["dispatcher"],
)


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class CampaignStartRequest(BaseModel):
    company: str = Field(..., example="Stripe")
    role: str = Field(default="Head of Engineering", example="VP of Engineering")
    contact_name: str = Field(..., example="David")
    contact_email: str = Field(..., example="david@stripe.com")


class HumanActionRequest(BaseModel):
    action: Literal["APPROVE", "REDRAFT", "REJECT"] = Field(
        ..., description="Action to take at the HITL review gate"
    )
    edited_draft: Optional[str] = Field(
        default=None, description="Optional manual edits to the email text before approving"
    )
    critique: Optional[str] = Field(
        default=None, description="Natural language feedback for AI Copywriter if action is REDRAFT"
    )


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Autonomous B2B Digital SDR Workforce API",
        "endpoints": {
            "start_campaign": "POST /api/campaign/start",
            "get_state": "GET /api/campaign/{thread_id}",
            "human_action": "POST /api/campaign/{thread_id}/action",
            "list_campaigns": "GET /api/campaigns",
            "docs": "/docs",
        },
    }


@app.post("/api/campaign/start", status_code=202)
def start_campaign(payload: CampaignStartRequest, background_tasks: BackgroundTasks):
    """Endpoint 1: Trigger autonomous intelligence gathering.
    
    Runs Researcher -> Analyst -> Copywriter -> Evaluator.
    Automatically pauses at the HITL gate before email dispatch.
    """
    thread_id = f"camp_{uuid.uuid4().hex[:8]}"
    thread_config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "messages": [HumanMessage(content=f"Launch outbound campaign for {payload.contact_name} at {payload.company}")],
        "target_company": payload.company,
        "target_role": payload.role,
        "target_contact_name": payload.contact_name,
        "target_contact_email": payload.contact_email,
        "research_summary": "",
        "icp_fit_score": 0,
        "icp_rationale": "",
        "email_draft": "",
        "next_step": "researcher",
        "approval_status": "PENDING",
    }

    # Execute graph up to the interrupt_before=["dispatcher"] gate
    def run_graph():
        sdr_graph.invoke(initial_state, config=thread_config)

    background_tasks.add_task(run_graph)

    return {
        "thread_id": thread_id,
        "status": "PROCESSING",
        "message": f"Autonomous campaign started for {payload.company}. Check status at /api/campaign/{thread_id}",
    }


@app.get("/api/campaign/{thread_id}")
def get_campaign_state(thread_id: str):
    """Endpoint 2: Fetch campaign state snapshot for the Frontend UI.
    
    Returns the research brief, ICP score, AI quality seal, and email draft.
    """
    thread_config = {"configurable": {"thread_id": thread_id}}
    snapshot = sdr_graph.get_state(thread_config)

    if not snapshot or not snapshot.values:
        raise HTTPException(status_code=404, detail=f"No campaign found for thread_id '{thread_id}'")

    is_paused_at_gate = snapshot.next == ("dispatcher",)
    icp_score = snapshot.values.get("icp_fit_score", 0)

    # Determine UI campaign status
    if icp_score > 0 and icp_score < 5:
        ui_status = "DISQUALIFIED"
    elif is_paused_at_gate:
        ui_status = "AWAITING_HUMAN_REVIEW"
    elif snapshot.values.get("approval_status") == "APPROVED":
        ui_status = "DISPATCHED"
    elif snapshot.values.get("approval_status") == "REJECTED":
        ui_status = "REJECTED"
    else:
        ui_status = "IN_PROGRESS"

    return {
        "thread_id": thread_id,
        "ui_status": ui_status,
        "is_paused_at_gate": is_paused_at_gate,
        "target_company": snapshot.values.get("target_company"),
        "target_contact_name": snapshot.values.get("target_contact_name"),
        "target_contact_email": snapshot.values.get("target_contact_email"),
        "research_summary": snapshot.values.get("research_summary"),
        "icp_fit_score": icp_score,
        "icp_rationale": snapshot.values.get("icp_rationale"),
        "email_draft": snapshot.values.get("email_draft"),
        "eval_score": snapshot.values.get("eval_score"),
        "eval_verdict": snapshot.values.get("eval_verdict"),
        "eval_critique": snapshot.values.get("eval_critique"),
        "approval_status": snapshot.values.get("approval_status"),
    }


@app.post("/api/campaign/{thread_id}/action")
def submit_human_action(thread_id: str, payload: HumanActionRequest):
    """Endpoint 3: Submit human review feedback (Approve, Re-draft, Reject).
    
    - APPROVE: Optionally applies manual edits, resumes graph into Dispatcher, and sends email.
    - REDRAFT: Takes user critique, prompts AI Copywriter to re-write, and updates PostgreSQL.
    - REJECT: Marks campaign rejected in state and does NOT dispatch email.
    """
    thread_config = {"configurable": {"thread_id": thread_id}}
    snapshot = sdr_graph.get_state(thread_config)

    if not snapshot or not snapshot.values:
        raise HTTPException(status_code=404, detail=f"Campaign '{thread_id}' not found")

    company = snapshot.values.get("target_company", "")
    current_draft = snapshot.values.get("email_draft", "")
    research = snapshot.values.get("research_summary", "")

    # 1. ACTION: APPROVE & DISPATCH
    if payload.action == "APPROVE":
        if payload.edited_draft and payload.edited_draft.strip():
            sdr_graph.update_state(thread_config, {"email_draft": payload.edited_draft.strip()})

        # Resume graph execution (invoking None triggers the pending dispatcher node)
        final_state = sdr_graph.invoke(None, config=thread_config)
        receipt = final_state["messages"][-1].content if final_state["messages"] else "Dispatched."

        return {
            "status": "DISPATCHED",
            "message": "Campaign approved and outbound email dispatched.",
            "receipt": receipt,
        }

    # 2. ACTION: AGENTIC RE-DRAFT (Human Feedback Loop)
    elif payload.action == "REDRAFT":
        if not payload.critique or not payload.critique.strip():
            raise HTTPException(status_code=400, detail="Critique instructions are required for REDRAFT action")

        # Invoke Copywriter with human critique
        llm = get_llm(temperature=0.3)
        revision_prompt = f"""Target Company: {company}
Current Draft:
{current_draft}

Sales Manager Critique:
{payload.critique}

Rewrite the 3-paragraph executive cold outreach email incorporating the manager's critique:"""

        new_draft_resp = llm.invoke([
            SystemMessage(content=COPYWRITER_SYSTEM_PROMPT),
            HumanMessage(content=revision_prompt),
        ])
        new_draft = new_draft_resp.content.strip()

        # Run automated judge on the revised draft
        eval_result = evaluate_email_draft(research, new_draft)

        # Update state in PostgreSQL checkpointer
        sdr_graph.update_state(
            thread_config,
            {
                "email_draft": new_draft,
                "eval_score": eval_result.overall_score,
                "eval_verdict": eval_result.verdict,
                "eval_critique": eval_result.critique,
            },
        )

        return {
            "status": "REVISED",
            "message": "AI Copywriter revised the draft based on your critique.",
            "revised_draft": new_draft,
            "eval_score": eval_result.overall_score,
            "eval_verdict": eval_result.verdict,
            "eval_critique": eval_result.critique,
        }

    # 3. ACTION: REJECT LEAD
    elif payload.action == "REJECT":
        sdr_graph.update_state(
            thread_config,
            {"approval_status": "REJECTED", "next_step": "FINISH"},
        )
        return {
            "status": "REJECTED",
            "message": "Campaign marked as REJECTED. Email was not sent.",
        }


@app.get("/api/campaigns")
def list_all_campaigns():
    """List all campaign thread IDs stored in PostgreSQL."""
    if not pool:
        return {"campaigns": []}

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT thread_id, count(*) as steps
                FROM checkpoints
                GROUP BY thread_id
                ORDER BY steps DESC;
                """
            )
            rows = cur.fetchall()
            return {
                "total_campaigns": len(rows),
                "campaigns": [{"thread_id": r[0], "total_steps": r[1]} for r in rows],
            }
