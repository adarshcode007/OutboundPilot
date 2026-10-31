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
load_dotenv()

from psycopg_pool import ConnectionPool
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, SystemMessage

from graph import build_sdr_graph
from config import get_llm
from agents.copywriter import COPYWRITER_SYSTEM_PROMPT
from agents.evaluator import evaluate_email_draft

import time
from prioritizer import prioritize_leads_batch
from queue_manager import (
    init_queue_schema,
    insert_leads_batch,
    get_daily_quota_stats,
    list_queued_leads,
    get_lead_by_id,
    update_lead_status,
)

from scheduler import scheduler

app = FastAPI(
    title="Autonomous Outbound SDR API",
    description="Enterprise Multi-Agent Pipeline with PostgreSQL Checkpointing & HITL Review",
    version="1.0.0",
)

# Initialize PostgreSQL Lead Queue table
try:
    init_queue_schema()
    print(">> [API] Initialized PostgreSQL lead_queue schema.")
except Exception as e:
    print(f">> [API] Failed to initialize lead_queue ({e}).")

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Enable CORS for frontend applications (React, Next.js, Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static assets from built React frontend
if os.path.exists("frontend/dist/assets"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
if os.path.exists("frontend/dist"):
    app.mount("/app", StaticFiles(directory="frontend/dist", html=True), name="frontend_dist")
elif os.path.exists("frontend"):
    app.mount("/app", StaticFiles(directory="frontend", html=True), name="frontend")

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

class LeadBatchUploadRequest(BaseModel):
    leads: list[dict] = Field(..., description="List of raw lead dictionaries from CSV")

class ProcessSelectedLeadsRequest(BaseModel):
    lead_ids: list[str] = Field(..., description="Array of lead UUIDs to process")

# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    if os.path.exists("frontend/index.html"):
        return FileResponse("frontend/index.html")
    return {
        "status": "online",
        "service": "Autonomous B2B Digital SDR Workforce API",
        "docs": "/docs",
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

# Milestone 10 & 11: Lead Queue, Smart Prioritization & Quota Endpoints
@app.post("/api/leads/upload")
def upload_leads_batch(payload: LeadBatchUploadRequest):
    """Uploads, scores via Regex (0 tokens), and queues leads in PostgreSQL."""
    if not payload.leads:
        raise HTTPException(status_code=400, detail="No leads provided.")

    # 1. Score leads using deterministic regex heuristics (Milestone 9)
    scored_leads = prioritize_leads_batch(payload.leads)

    # 2. Insert into PostgreSQL queue
    batch_id = insert_leads_batch(scored_leads)

    return {
        "status": "SUCCESS",
        "batch_id": batch_id,
        "total_uploaded": len(scored_leads),
        "leads": scored_leads,
    }

@app.get("/api/leads")
def get_leads_queue(status: Optional[str] = None, limit: int = 100):
    """Retrieves queued leads sorted by priority along with daily quota stats."""
    quota_stats = get_daily_quota_stats()
    leads = list_queued_leads(status=status, limit=limit)
    return {
        "quota": quota_stats,
        "total_leads": len(leads),
        "leads": leads,
    }

@app.post("/api/leads/process-selected")
def process_selected_leads(payload: ProcessSelectedLeadsRequest, background_tasks: BackgroundTasks):
    """Processes selected leads sequentially with Groq quota protection."""
    quota_stats = get_daily_quota_stats()
    remaining = quota_stats["remaining_today"]

    if len(payload.lead_ids) > remaining:
        raise HTTPException(status_code=429, detail=f"Requested {len(payload.lead_ids)} leads, but only {remaining} remaining in today's quota ({quota_stats['daily_limit']} max/day).")
    
    def run_batch():
        for lead_id in payload.lead_ids:
            lead = get_lead_by_id(lead_id)
            if not lead or lead["status"] in ["DRAFTED", "APPROVED", "DISPATCHED"]:
                continue

            # Mark in progress
            update_lead_status(lead_id, status="PROCESSING")
            thread_id = f"camp_{uuid.uuid4().hex[:8]}"
            thread_config = {"configurable": {"thread_id": thread_id}}
            initial_state = {
                "messages": [HumanMessage(content=f"Launch outbound campaign for {lead['contact_name']} at {lead['company']}")],
                "target_company": lead["company"],
                "target_role": lead.get("role", "Target Role"),
                "target_contact_name": lead.get("contact_name", "Target"),
                "target_contact_email": lead.get("contact_email", "target@company.com"),
                "research_summary": "",
                "icp_fit_score": 0,
                "icp_rationale": "",
                "email_draft": "",
                "next_step": "researcher",
                "approval_status": "PENDING",
            }

            try:
                # Runs upto HITL review gate (interrupt_before=["dispatcher"])
                sdr_graph.invoke(initial_state, config=thread_config)
                snapshot = sdr_graph.get_state(thread_config)
                values = snapshot.values

                is_disqualified = values.get("icp_fit_score", 0) < 5
                final_status = "DISQUALIFIED" if is_disqualified else "DRAFTED"

                update_lead_status(
                    lead_id=lead_id,
                    status=final_status,
                    thread_id=thread_id,
                    research_summary=values.get("research_summary"),
                    icp_fit_score=values.get("icp_fit_score"),
                    icp_rationale=values.get("icp_rationale"),
                    email_draft=values.get("email_draft"),
                    eval_score=values.get("eval_score"),
                    eval_verdict=values.get("eval_verdict"),
                    eval_critique=values.get("eval_critique")
                )
            except Exception as e:
                print(f">> [Batch Error] Lead {lead_id} failed: {e}")
                update_lead_status(lead_id, status="FAILED")
            
            # 2-second rate-limiting throttle between leads to protect Groq TPM
            time.sleep(2.0)
    background_tasks.add_task(run_batch)

    return {
        "status": "ACCEPTED",
        "message": f"Processing {len(payload.lead_ids)} leads in background with rate-limiting.",
        "remaining_today": remaining - len(payload.lead_ids),
    }

@app.post("/api/leads/cron-trigger")
def trigger_daily_cron(background_tasks: BackgroundTasks):
    """Simulates daily 8:00 AM cron drip, auto-picking top priority queued leads up to quota."""
    quota_stats = get_daily_quota_stats()
    remaining = quota_stats["remaining_today"]

    if remaining <= 0:
        return {
            "status": "SKIPPED",
            "message": "Today's quota already exhausted. Rescheduling for tomorrow.",
            "quota": quota_stats,
        }
    
    queued_leads = list_queued_leads(status="QUEUED", limit=remaining)
    lead_ids = [l["id"] for l in queued_leads]

    if not lead_ids:
        return {"status": "IDLE", "message": "No unexecuted leads in queue."}
    
    # Delegate to process_selected_leads
    req = ProcessSelectedLeadsRequest(lead_ids=lead_ids)
    return process_selected_leads(req, background_tasks)


# Autonomous Background Scheduler Lifecycle & Control Endpoints

@app.on_event("startup")
async def startup_scheduler():
    """Starts the background 8:00 AM cron daemon when FastAPI boots."""
    scheduler.start()
    print(">> [FastAPI] Background SDR Scheduler daemon started.")

@app.on_event("shutdown")
async def shutdown_scheduler():
    """Stops the background scheduler when FastAPI shuts down."""
    scheduler.stop()
    print(">> [FastAPI] Background SDR Scheduler daemon stopped.")

@app.get("/api/scheduler/status")
def get_scheduler_status():
    """Returns the live status, schedule time, and next estimated run."""
    return scheduler.get_status()

@app.post('/api/scheduler/run-now')
async def run_scheduler_now(background_tasks: BackgroundTasks):
    """Force-triggers the autonomous morning drip immediately in the background."""
    if scheduler.is_processing:
        return {"status": "BUSY", "message": "Scheduler is already running a drip batch."}
    
    background_tasks.add_task(scheduler.execute_drip, force=True)
    return {
        "status": "ACCEPTED",
        "message": "Immediate morning drip launched in background.",
    }