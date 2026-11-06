"""FastAPI Enterprise Backend for Outbound SDR Multi-Agent Pipeline.

REST API Endpoints:
1. POST /api/campaign/start          - Trigger autonomous intelligence & pause at HITL gate
2. GET  /api/campaign/{thread_id}    - Query campaign state & review package for Frontend
3. POST /api/campaign/{thread_id}/action - Submit Human Review (Approve, Re-draft, Reject)
4. GET  /api/campaigns               - List all historical campaigns from PostgreSQL
"""

from notifier import send_slack_dispatch_alert
from dispatcher import dispatch_outbound_email
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
    insert_single_lead,
    get_lead_by_thread_id,
    get_daily_quota_stats,
    list_queued_leads,
    get_lead_by_id,
    update_lead_status,
    save_lead_cadence,
    get_lead_cadence,
    record_inbound_reply,
    get_analytics_summary,
)

from scheduler import scheduler
from agents.cadence import generate_outbound_cadence
from agents.classifier import classify_inbound_reply
from notifier import send_slack_reply_alert

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
    lead_id: Optional[str] = Field(
        default=None, description="Optional UUID of the lead in lead_queue"
    )
    recipient_email: Optional[str] = Field(
        default=None, description="Optional recipient email address"
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
    
    Unified workflow for Single Lead Ingestion:
    1. Enforces daily quota limit.
    2. Computes regex priority scores & tags (0 Groq tokens).
    3. Inserts into PostgreSQL lead_queue table (decrements daily quota & creates lead_id).
    4. Runs Researcher -> Analyst -> Copywriter -> Evaluator.
    5. Saves state back into lead_queue (enables 3-touch cadence generation).
    """
    quota_stats = get_daily_quota_stats()
    if quota_stats["remaining_today"] <= 0:
        raise HTTPException(
            status_code=429,
            detail=f"Daily quota of {quota_stats['daily_limit']} leads reached for today. Reset at midnight."
        )

    thread_id = f"camp_{uuid.uuid4().hex[:8]}"
    thread_config = {"configurable": {"thread_id": thread_id}}

    # 1. Prioritize & score using regex heuristics (0 Groq tokens)
    lead_dict = {
        "company": payload.company,
        "role": payload.role,
        "contact_name": payload.contact_name,
        "contact_email": payload.contact_email,
    }
    scored_leads = prioritize_leads_batch([lead_dict])
    scored_lead = scored_leads[0] if scored_leads else lead_dict

    # 2. Insert into lead_queue table (counts toward daily quota and allows cadence)
    lead_id = insert_single_lead(scored_lead, thread_id=thread_id, status="PROCESSING")

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
        try:
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
                eval_critique=values.get("eval_critique"),
                contact_email=payload.contact_email,
            )
        except Exception as e:
            print(f">> [Single Lead Error] Lead {lead_id} failed: {e}")
            update_lead_status(lead_id=lead_id, status="FAILED")

    background_tasks.add_task(run_graph)

    return {
        "thread_id": thread_id,
        "lead_id": lead_id,
        "status": "PROCESSING",
        "message": f"Autonomous campaign started for {payload.company}. Check status at /api/campaign/{thread_id}",
    }


@app.get("/api/campaign/{thread_id}")
def get_campaign_state(thread_id: str):
    """Endpoint 2: Fetch campaign state snapshot for the Frontend UI.
    
    Returns the research brief, ICP score, AI quality seal, email draft, and cadence.
    """
    thread_config = {"configurable": {"thread_id": thread_id}}
    snapshot = sdr_graph.get_state(thread_config)
    lead = get_lead_by_thread_id(thread_id)

    if not snapshot or not snapshot.values:
        if lead:
            return {
                "thread_id": thread_id,
                "lead_id": lead["id"],
                "ui_status": lead["status"],
                "is_paused_at_gate": lead["status"] == "DRAFTED",
                "target_company": lead.get("company"),
                "target_contact_name": lead.get("contact_name"),
                "target_contact_email": lead.get("contact_email"),
                "research_summary": lead.get("research_summary"),
                "icp_fit_score": lead.get("icp_fit_score", 0),
                "icp_rationale": lead.get("icp_rationale"),
                "email_draft": lead.get("email_draft"),
                "eval_score": lead.get("eval_score"),
                "eval_verdict": lead.get("eval_verdict"),
                "eval_critique": lead.get("eval_critique"),
                "approval_status": lead.get("status"),
                "cadence": lead.get("cadence"),
            }
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
        "lead_id": lead["id"] if lead else None,
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
        "cadence": lead.get("cadence") if lead else None,
    }


@app.post("/api/campaign/{thread_id}/action")
def submit_human_action(thread_id: str, payload: HumanActionRequest):
    """Endpoint 3: Submit human review feedback (Approve, Re-draft, Reject).
    
    - APPROVE: Applies manual edits, resumes graph/dispatches email, and marks lead as APPROVED in lead_queue.
    - REDRAFT: Takes user critique, prompts AI Copywriter to re-write, and updates PostgreSQL.
    - REJECT: Marks campaign and lead as REJECTED in PostgreSQL.
    """
    thread_config = {"configurable": {"thread_id": thread_id}}
    snapshot = sdr_graph.get_state(thread_config)

    # Resolve lead from database if lead_id provided or by thread_id
    lead = None
    if payload.lead_id:
        lead = get_lead_by_id(payload.lead_id)
    if not lead and thread_id and pool:
        try:
            with pool.connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id FROM lead_queue WHERE thread_id = %s LIMIT 1", (thread_id,))
                    row = cur.fetchone()
                    if row:
                        lead = get_lead_by_id(str(row[0]))
        except Exception:
            pass

    has_graph_state = bool(snapshot and snapshot.values)
    if not has_graph_state and not lead:
        raise HTTPException(status_code=404, detail=f"Campaign '{thread_id}' or lead not found")

    company = snapshot.values.get("target_company", "") if has_graph_state else (lead.get("company", "") if lead else "")
    current_draft = snapshot.values.get("email_draft", "") if has_graph_state else (lead.get("email_draft", "") if lead else "")
    research = snapshot.values.get("research_summary", "") if has_graph_state else (lead.get("research_summary", "") if lead else "")

    # 1. ACTION: APPROVE & DISPATCH
    if payload.action == "APPROVE":
        final_draft = payload.edited_draft.strip() if (payload.edited_draft and payload.edited_draft.strip()) else current_draft

        # Resolve recipient email (payload override -> lead_queue -> graph state)
        to_email = (
            (payload.recipient_email or "").strip()
            or (lead.get("contact_email") if lead else "")
            or (snapshot.values.get("target_contact_email") if has_graph_state else "")
            or ""
        ).strip()

        # Guard: Reject missing or placeholder addresses
        if not to_email or to_email in ["target@company.com", "test@example.com"]:
            raise HTTPException(
                status_code=400,
                detail="Cannot dispatch: Lead has no valid recipient email. Please enter a valid recipient email address in the briefing deck."
            )

        if has_graph_state:
            state_updates = {"email_draft": final_draft, "target_contact_email": to_email}
            sdr_graph.update_state(thread_config, state_updates)
            final_state = sdr_graph.invoke(None, config=thread_config)
            receipt = final_state["messages"][-1].content if final_state["messages"] else "Dispatched."
        else:
            # Direct dispatch via production outbound dispatcher
            receipt_info = dispatch_outbound_email(
                to_email=to_email,
                subject=f"Connecting with {company}",
                body=final_draft,
                lead_id=str(lead["id"]) if lead else None,
                thread_id=thread_id,
                company=company,
                contact_name=lead.get("contact_name") if lead else None,
                role=lead.get("role") if lead else None,
                icp_score=lead.get("icp_fit_score") if lead else None,
                eval_score=lead.get("eval_score") if lead else None,
            )
            receipt = receipt_info.get("detail", "Dispatched.")
            if receipt_info.get("status") in ["FAILED", "BOUNCED", "BLOCKED"]:
                raise HTTPException(status_code=400, detail=f"Dispatch failed: {receipt}")

        # Always persist lead_queue status as APPROVED and save confirmed recipient email
        if lead:
            update_lead_status(
                lead_id=str(lead["id"]),
                status="APPROVED",
                email_draft=final_draft,
                contact_email=to_email,
            )

        return {
            "status": "DISPATCHED",
            "message": f"Campaign for {company} approved and outbound email dispatched to {to_email}.",
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

        # Update state in PostgreSQL checkpointer if graph exists
        if has_graph_state:
            sdr_graph.update_state(
                thread_config,
                {
                    "email_draft": new_draft,
                    "eval_score": eval_result.overall_score,
                    "eval_verdict": eval_result.verdict,
                    "eval_critique": eval_result.critique,
                },
            )

        # Always persist revised draft into lead_queue
        if lead:
            update_lead_status(
                lead_id=str(lead["id"]),
                status="DRAFTED",
                email_draft=new_draft,
                eval_score=eval_result.overall_score,
                eval_verdict=eval_result.verdict,
                eval_critique=eval_result.critique,
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
        if has_graph_state:
            sdr_graph.update_state(
                thread_config,
                {"approval_status": "REJECTED", "next_step": "FINISH"},
            )
        if lead:
            update_lead_status(
                lead_id=str(lead["id"]),
                status="REJECTED",
            )
        return {
            "status": "REJECTED",
            "message": f"Lead {company} marked as REJECTED. Email was not sent.",
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


# Multi-Touch Follow-Up Cadence Endpoints
@app.post("/api/leads/{lead_id}/cadence/generate")
def generate_cadence_endpoint(lead_id: str):
    """Generates an automated 3-touch cadence for a lead using verified research and initial pitch."""
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    
    cadence = generate_outbound_cadence(
        company=lead["company"],
        contact_name=lead.get("contact_name") or "Decision Maker",
        role=lead.get("role") or "Executive",
        research_summary=lead.get("research_summary") or f"{lead['company']} is a target enterprise account.",
        initial_draft=lead.get("email_draft") or "",
    )

    save_lead_cadence(lead_id, cadence)
    return {"status": "SUCCESS", "cadence": cadence}

@app.get("/api/leads/{lead_id}/cadence")
def get_cadence_enpoint(lead_id: str):
    """Retrieves the stored 3-touch cadence for a lead."""
    lead = get_lead_by_id(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    
    cadence = get_lead_cadence(lead_id)
    if not cadence:
        raise HTTPException(status_code=404, detail="No cadence generates for this lead yet.")
    return {"status": "SUCCESS", "cadence": cadence}

# Notification & Webhook Endpoints
@app.post("/api/notifications/test-slack")
def test_slack_notifcation():
    """Triggers a test Slack Block Kit notification to verify webhook formatting."""
    return send_slack_dispatch_alert(
        company="Stripe",
        contact_name="David",
        role="Head of AI Infrastructure",
        email="david@stripe.com",
        subject="AI Infrastructure Partnership with Stripe",
        status="DELIVERED",
        provider="SANDBOX",
        message_id="msg_test_12345",
        icp_score=9,
        eval_score=9,
        pitch_preview="Hi David, reaching out regarding Stripe's AI billing expansion...",
    )

class InboundReplyWebhookRequest(BaseModel):
    lead_id: str
    reply_text: str
    sender_email: Optional[str] = None

@app.post("/api/webhooks/inbound-reply")
def handle_inbound_reply_webhook(payload: InboundReplyWebhookRequest):
    """Inbound webhook called when a prospect replies to an outreach email."""
    lead = get_lead_by_id(payload.lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    # 1. AI Sentiment Analysis
    analysis = classify_inbound_reply(
        reply_text=payload.reply_text,
        original_pitch=lead.get("email_draft") or "",
    )

    # 2. Database update: Halt cadence & mark REPLIED
    update_result = record_inbound_reply(
        lead_id=payload.lead_id,
        reply_text=payload.reply_text,
        analysis=analysis,
    )

    # 3. Trigger Urgent Slack Notification
    slack_res = send_slack_reply_alert(
        company=lead["company"],
        contact_name=lead.get("contact_name") or "Contact",
        email=lead.get("contact_email") or payload.sender_email or "unknown@company.com",
        reply_text=payload.reply_text,
        analysis=analysis,
    )

    return {
        "status": "PROCESSED",
        "sentiment": analysis["sentiment"],
        "is_positive_intent": analysis["is_positive_intent"],
        "recommended_action": analysis["recommended_action"],
        "cadence_status": update_result["cadence_status"],
        "notification": slack_res["status"]
    }

# Analytics & Token-Saver ROI Endpoint
@app.get("/api/analytics")
def get_analytics_endpoint():
    """Returns comprehensive pipeline analytics and Token-Saver ROI metrics."""
    return get_analytics_summary()