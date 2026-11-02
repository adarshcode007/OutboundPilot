"""
PostgreSQL Lead Queue & Daily Quota Manager.

Key Responsibilities:
1. Schema Initialization: Creates the `lead_queue` table in PostgreSQL.
2. Ingestion: Stores batch-uploaded leads with their computed Regex Priority scores.
3. Quota Tracking: Enforces a daily limit (e.g. 10 leads/day) based on `processed_at` timestamps.
4. Status Lifecycle: Tracks each lead across:
    'QUEUED' -> 'PROCESSING' -> 'DRAFTED' (paused at HITL gate) -> 'APPROVED' / 'DISQUALIFIED' -> 'DISPATCHED'
"""

import os
import uuid
import json
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from psycopg_pool import ConnectionPool
from dotenv import load_dotenv
load_dotenv()

POSTGRES_URI = os.getenv("POSTGRES_URI", "postgresql://postgres@localhost:5432/postgres")
DAILY_QUOTA_LIMIT = int(os.getenv("DAILY_QUOTA_LIMIT", "10"))

pool = ConnectionPool(conninfo=POSTGRES_URI, max_size=10, kwargs={"autocommit": True})

def init_queue_schema():
    """Initializes the lead_queue table and indexes in PostgreSQL."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS lead_queue (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    batch_id VARCHAR(64) NOT NULL,
                    company  VARCHAR(255) NOT NULL,
                    role VARCHAR(255),
                    contact_name VARCHAR(255),
                    contact_email VARCHAR(255),
                    linkedin_url TEXT,
                    priority_score INTEGER DEFAULT 0,
                    priority_tier VARCHAR(16) DEFAULT 'MEDIUM',
                    priority_tags JSONB DEFAULT '[]',
                    status VARCHAR(32) DEFAULT 'QUEUED',
                    thread_id VARCHAR(64),
                    research_summary TEXT,
                    icp_fit_score INTEGER,
                    icp_rationale TEXT,
                    email_draft TEXT,
                    eval_score INTEGER,
                    eval_verdict VARCHAR(255),
                    eval_critique TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    processed_at TIMESTAMP WITH TIME ZONE
                );

                ALTER TABLE lead_queue ADD COLUMN IF NOT EXISTS cadence JSONB;
                ALTER TABLE lead_queue ADD COLUMN IF NOT EXISTS reply_data JSONB;
                CREATE TABLE IF NOT EXISTS dispatch_ledger (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    lead_id UUID,
                    thread_id VARCHAR(64),
                    recipient VARCHAR(255) NOT NULL,
                    subject TEXT NOT NULL,
                    body_preview TEXT,
                    provider VARCHAR(32) NOT NULL,
                    message_id VARCHAR(128) NOT NULL,
                    status VARCHAR(32) DEFAULT 'DELIVERED',
                    error_message TEXT,
                    dispatched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX IF NOT EXISTS idx_dispatch_ledger_recipient ON dispatch_ledger(recipient);

                CREATE INDEX IF NOT EXISTS idx_lead_queue_priority ON lead_queue(status, priority_score DESC);
                CREATE INDEX IF NOT EXISTS idx_lead_queue_batch ON lead_queue(batch_id);
                CREATE INDEX IF NOT EXISTS idx_lead_queue_processed ON lead_queue(processed_at);
            """)

def get_daily_quota_stats() -> Dict[str, int]:
    """Calculates how many leads were processed today and how many quota slots remain."""
    today_start = datetime.combine(date.today(), datetime.min.time())
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) FROM lead_queue
                WHERE processed_at >= %s AND status != 'QUEUED'
                """,
                (today_start,)
            )
            used_today = cur.fetchone()[0]
        
    remaining = max(0, DAILY_QUOTA_LIMIT - used_today)
    return {
        "daily_limit": DAILY_QUOTA_LIMIT,
        "used_today": used_today,
        "remaining_today": remaining,
    }

def insert_leads_batch(leads: List[Dict[str, Any]], batch_id: Optional["str"] = None) -> str:
    """Inserts a batch of scored leads into the queue."""
    if not batch_id:
        batch_id = f"batch_{uuid.uuid4().hex[:8]}"
    
    with pool.connection() as conn:
        with conn.cursor() as cur:
            for lead in leads:
                cur.execute(
                    """
                    INSERT INTO lead_queue (
                    batch_id, company, role, contact_name, contact_email, priority_score, priority_tier, priority_tags, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'QUEUED')
                    """,

                    (
                        batch_id,
                        lead.get("company", "Unkown"),
                        lead.get("role", "Target Role"),
                        lead.get("contact_name", ""),
                        lead.get("contact_email", ""),
                        lead.get("priority_score", 0),
                        lead.get("priority_tier", "MEDIUM"),
                        json.dumps(lead.get("priority_tags", []))
                    )
                )
    return batch_id

def list_queued_leads(status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieves leads sorted descending by priority score."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            if status:
                cur.execute(
                    """
                    SELECT id, batch_id, company, role, contact_name, contact_email,
                           priority_score, priority_tier, priority_tags, status,
                           thread_id, icp_fit_score, eval_score, created_at, processed_at
                    FROM lead_queue
                    WHERE status = %s
                    ORDER BY priority_score DESC, created_at ASC
                    LIMIT %s
                    """,
                    (status, limit)
                )
            else:
                cur.execute(
                    """
                    SELECT id, batch_id, company, role, contact_name, contact_email, priority_score, priority_tier,
                        priority_tags, status, thread_id, icp_fit_score, eval_score, created_at, processed_at
                    FROM lead_queue
                    ORDER BY priority_score DESC, created_at ASC
                    LIMIT %s
                    """,
                    (limit,)
                )
            rows = cur.fetchall()
            leads = []
            for r in rows:
                leads.append({
                    "id": str(r[0]),
                    "batch_id": r[1],
                    "company": r[2],
                    "role": r[3],
                    "contact_name": r[4],
                    "contact_email": r[5],
                    "priority_score": r[6],
                    "priority_tier": r[7],
                    "priority_tags": r[8] if isinstance(r[8], list) else json.loads(r[8] or "[]"),
                    "status": r[9],
                    "thread_id": r[10],
                    "icp_fit_score": r[11],
                    "eval_score": r[12],
                    "created_at": r[13].isoformat() if r[13] else None,
                    "processed_at": r[14].isoformat() if r[14] else None,
                })
            return leads
        
def get_lead_by_id(lead_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves full details of a single lead by UUID."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM lead_queue WHERE id = %s", (lead_id,))
            row = cur.fetchone()
            if not row:
                return None
            
            # Map column names to values
            colnames = [desc[0] for desc in cur.description]
            result = dict(zip(colnames, row))
            result["id"] = str(result["id"])
            if isinstance(result.get("priority_tags"), str):
                result["priority_tags"] = json.loads(result["priority_tags"])
            return result

def update_lead_status(
    lead_id: str,
    status: str,
    thread_id: Optional[str] = None,
    research_summary: Optional[str] = None,
    icp_fit_score: Optional[int] = None,
    icp_rationale: Optional[str] = None,
    email_draft: Optional[str] = None,
    eval_score: Optional[int] = None,
    eval_verdict: Optional[str] = None,
    eval_critique: Optional[str] = None,
):
    """Updates campaign progress and artifacts for a specific lead."""
    now = datetime.now()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE lead_queue
                SET status = %s,
                    thread_id = COALESCE(%s, thread_id),
                    research_summary = COALESCE(%s, research_summary),
                    icp_fit_score = COALESCE(%s, icp_fit_score),
                    icp_rationale = COALESCE(%s, icp_rationale),
                    email_draft = COALESCE(%s, email_draft),
                    eval_score = COALESCE(%s, eval_score),
                    eval_verdict = COALESCE(%s, eval_verdict),
                    eval_critique = COALESCE(%s, eval_critique),
                    processed_at = %s
                WHERE id = %s
                """,
                (
                    status, thread_id, research_summary, icp_fit_score,
                    icp_rationale, email_draft, eval_score, eval_verdict,
                    eval_critique, now, lead_id
                )
            )

def save_lead_cadence(lead_id: str, cadence_data: Dict[str,Any]) -> bool:
    """Stores the generated 3-touch cadence JSON into lead_queue."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE lead_queue
                SET cadence = %s
                WHERE id = %s
                """,
                (json.dumps(cadence_data), lead_id)
            )
    return True

def get_lead_cadence(lead_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves the stored cadence for a lead."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT cadence FROM lead_queue WHERE id = %s",(lead_id,))
            row = cur.fetchone()
            if row and row[0]:
                return row[0] if isinstance(row[0], dict) else json.loads(row[0])
    return None

def log_dispatch_event(
    recipient: str,
    subject: str,
    body: str,
    provider: str,
    message_id: str,
    status: str = "DELIVERED",
    error_message: Optional[str] = None,
    lead_id: Optional[str] = None,
    thread_id: Optional[str] = None,
) -> str:
    """Logs an email dispatch event into the PostgreSQL dispatch_ledger."""
    body_preview = body[:200] if body else ""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO dispatch_ledger (
                    lead_id, thread_id, recipient, subject, body_preview, provider, message_id, status, error_message
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (lead_id, thread_id, recipient, subject, body_preview, provider, message_id, status, error_message)
            )
            ledger_id = cur.fetchone()[0]
    return str(ledger_id)

def list_dispatch_ledger(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves recent email dispatches from PostgreSQL."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, lead_id, thread_id, recipient, subject, body_preview, provider, message_id, status, error_message, dispatched_at
                FROM dispatch_ledger
                ORDER BY dispatched_at DESC
                LIMIT %s
                """,
                (limit,)
            )
            rows = cur.fetchall()
            return [{
                "id": str(r[0]),
                "lead_id": str(r[1]) if r[1] else None,
                "thread_id": r[2],
                "recipient": r[3],
                "subject": r[4],
                "body_preview": r[5],
                "provider": r[6],
                "message_id": r[7],
                "status": r[8],
                "error_message": r[9],
                "dispatched_at": r[10].isoformat() if r[10] else None
            } for r in rows]


def record_inbound_reply(
    lead_id: str,
    reply_text: str,
    analysis: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Halts pending automated follow-ups (Touch 2 & Touch 3), transitions
    lead status to 'REPLIED', and records reply context in PostgreSQL.
    """
    from datetime import datetime, timezone

    lead = get_lead_by_id(lead_id)
    if not lead:
        return {"status": "ERROR", "detail": "Lead not found"}

    # Fetch and cancel pending cadence touches
    cadence = get_lead_cadence(lead_id) or {}
    if "touch_2" in cadence and isinstance(cadence["touch_2"], dict):
        cadence["touch_2"]["status"] = "CANCELLED"
    if "touch_3" in cadence and isinstance(cadence["touch_3"], dict):
        cadence["touch_3"]["status"] = "CANCELLED"
    
    reply_payload = {
        "received_at": datetime.now(timezone.utc).isoformat(),
        "reply_text": reply_text,
        "sentiment": analysis.get("sentiment"),
        "is_positive_intent": analysis.get("is_positive_intent"),
        "summary": analysis.get("summary"),
        "recommended_action": analysis.get("recommended_action"),
        "referral_contact": analysis.get("referral_contact"),
    }

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE lead_queue
                SET status = 'REPLIED',
                    cadence = %s,
                    reply_data = %s
                WHERE id = %s
                """,
                (json.dumps(cadence), json.dumps(reply_payload), lead_id)
            )
    return {
        "status": "REPLIED",
        "cadence_status": "HALTED_AND_CANCELLED",
        "reply_data": reply_payload,
    }

def get_analytics_summary() -> Dict[str, Any]:
    """
    Computes real-time pipeline analytics, Token-Saver ROI economics,
    deliverability rates, and inbound engagement metrics from PostgreSQL.
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            # 1. Lead Queue Status Counts
            cur.execute("""
                SELECT status, COUNT(*)
                FROM lead_queue
                GROUP BY status
            """)
            status_map = dict(cur.fetchall())

            total_leads = sum(status_map.values())
            disqualified = status_map.get("DISQUALIFIED", 0)
            queued = status_map.get("QUEUED", 0)
            drafted = status_map.get("DRAFTED", 0)
            approved = status_map.get("APPROVED", 0)
            dispatched_leads = status_map.get("DISPATCHED", 0)
            replied = status_map.get("REPLIED", 0)

            # Account that passed ICP qualification
            qualified = drafted + approved + dispatched_leads + replied
            evaluated_total = qualified + disqualified
            qualification_rate = round((qualified / evaluated_total * 100), 1) if evaluated_total > 0 else 0.0

            # 2. Token-Saver ROI Economics
            # Skipping Copywriter (~2,000 tokens), Evaluator (~2,000 tokens) and Cadence (~2,500 tokens)
            # saves ~6,500 Groq tokens per disqualified lead
            TOKENS_SAVED_PER_DISQUALIFIED = 6500
            tokens_saved = disqualified * TOKENS_SAVED_PER_DISQUALIFIED
            # 100k tokens ~= 1 full day of Groq free tier limit
            free_tier_days_preserved = round(tokens_saved / 100000, 2)

            # 3. Average AI Quality & ICP Scores
            cur.execute("""
                SELECT 
                    ROUND(AVG(icp_fit_score)::numeric, 1),
                    ROUND(AVG(eval_score)::numeric, 1)
                FROM lead_queue
                WHERE icp_fit_score IS NOT NULL AND icp_fit_score > 0
            """)
            avg_icp, avg_eval = cur.fetchone()

            # 4. Deliverability Ledger Breakdown
            cur.execute("""
                SELECT status, COUNT(*)
                FROM dispatch_ledger
                GROUP BY status
            """)
            dispatch_map = dict(cur.fetchall())
            total_dispatched_emails = sum(dispatch_map.values())
            delivered_count = dispatch_map.get("DELIVERED", 0)
            blocked_count = dispatch_map.get("BLOCKED", 0)
            deliverability_rate = round((delivered_count / total_dispatched_emails * 100), 1) if total_dispatched_emails > 0 else 100.0

            # 5. Inbound Reply Sentiment Breakdown
            cur.execute("""
                SELECT reply_data->>'sentiment', COUNT(*)
                FROM lead_queue
                WHERE reply_data IS NOT NULL
                GROUP BY reply_data->>'sentiment'
            """)
            sentiment_map = dict(cur.fetchall())
            interested_count = sentiment_map.get("INTERESTED", 0)
            referral_count = sentiment_map.get("REFERRAL", 0)
            positive_replies = interested_count + referral_count

            return {
                "pipeline": {
                    "total_leads": total_leads,
                    "queued": queued,
                    "qualified": qualified,
                    "disqualified": disqualified,
                    "qualification_rate_pct": qualification_rate,
                    "drafted_awaiting_review": drafted,
                    "approved_or_dispatched": approved + dispatched_leads,
                    "replied": replied,
                },
                "token_saver_roi": {
                    "disqualified_accounts": disqualified,
                    "tokens_saved": tokens_saved,
                    "free_tier_days_preserved": free_tier_days_preserved,
                    "tokens_saved_formatted": f"{tokens_saved:,} tokens",
                },
                "quality_scores": {
                    "avg_icp_score": float(avg_icp) if avg_icp is not None else 0.0,
                    "avg_eval_score": float(avg_eval) if avg_eval is not None else 0.0,
                },
                "deliverability": {
                    "total_dispatches": total_dispatched_emails,
                    "delivered": delivered_count,
                    "guardrail_blocked": blocked_count,
                    "deliverability_rate_pct": deliverability_rate,
                },
                "engagement": {
                    "total_replies": replied,
                    "positive_replies": positive_replies,
                    "sentiment_breakdown": sentiment_map,
                },
            }