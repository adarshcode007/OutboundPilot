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

POSTGRES_URI = (os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URI", "postgresql://postgres@localhost:5432/postgres")).strip()
DATABASE_URL_UNPOOLED = (os.getenv("DATABASE_URL_UNPOOLED") or POSTGRES_URI).strip()
DAILY_QUOTA_LIMIT = int(os.getenv("DAILY_QUOTA_LIMIT", "10"))
PG_POOL_MAX_SIZE = int(os.getenv("PG_POOL_MAX_SIZE", "12"))

# Centralized application-wide ConnectionPool singleton shared across API, Auth, and Checkpointer
pool = ConnectionPool(conninfo=POSTGRES_URI, max_size=PG_POOL_MAX_SIZE, kwargs={"autocommit": True})

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

                CREATE TABLE IF NOT EXISTS scheduler_runs (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    run_date DATE NOT NULL,
                    run_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(32) NOT NULL,
                    leads_processed INTEGER DEFAULT 0,
                    details JSONB DEFAULT '{}'
                );

                CREATE INDEX IF NOT EXISTS idx_scheduler_runs_date ON scheduler_runs(run_date);
                CREATE INDEX IF NOT EXISTS idx_dispatch_ledger_recipient ON dispatch_ledger(recipient);

                CREATE INDEX IF NOT EXISTS idx_lead_queue_priority ON lead_queue(status, priority_score DESC);
                CREATE INDEX IF NOT EXISTS idx_lead_queue_batch ON lead_queue(batch_id);
                CREATE INDEX IF NOT EXISTS idx_lead_queue_processed ON lead_queue(processed_at);
            """)

def get_daily_quota_stats(user_id: Optional[str] = None) -> Dict[str, int]:
    """Calculates how many leads were processed today and how many quota slots remain for a user."""
    today_start = datetime.combine(date.today(), datetime.min.time())
    daily_limit = DAILY_QUOTA_LIMIT

    with pool.connection() as conn:
        with conn.cursor() as cur:
            if user_id:
                try:
                    cur.execute("SELECT daily_quota_limit FROM users WHERE id = %s", (user_id,))
                    row = cur.fetchone()
                    if row and row[0]:
                        daily_limit = row[0]
                except Exception:
                    pass

                cur.execute(
                    """
                    SELECT COUNT(*) FROM lead_queue
                    WHERE processed_at >= %s AND status != 'QUEUED' AND user_id = %s
                    """,
                    (today_start, user_id)
                )
            else:
                cur.execute(
                    """
                    SELECT COUNT(*) FROM lead_queue
                    WHERE processed_at >= %s AND status != 'QUEUED'
                    """,
                    (today_start,)
                )
            used_today = cur.fetchone()[0]
        
    remaining = max(0, daily_limit - used_today)
    return {
        "daily_limit": daily_limit,
        "used_today": used_today,
        "remaining_today": remaining,
    }

def insert_leads_batch(leads: List[Dict[str, Any]], batch_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
    """Inserts a batch of scored leads into the queue, associated with a user."""
    if not batch_id:
        batch_id = f"batch_{uuid.uuid4().hex[:8]}"
    
    with pool.connection() as conn:
        with conn.cursor() as cur:
            for lead in leads:
                cur.execute(
                    """
                    INSERT INTO lead_queue (
                    batch_id, company, role, contact_name, contact_email, priority_score, priority_tier, priority_tags, status, user_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'QUEUED', %s)
                    """,

                    (
                        batch_id,
                        lead.get("company", "Unkown"),
                        lead.get("role", "Target Role"),
                        lead.get("contact_name", ""),
                        lead.get("contact_email", ""),
                        lead.get("priority_score", 0),
                        lead.get("priority_tier", "MEDIUM"),
                        json.dumps(lead.get("priority_tags", [])),
                        user_id
                    )
                )
    return batch_id

def insert_single_lead(
    lead: Dict[str, Any],
    thread_id: Optional[str] = None,
    status: str = "PROCESSING",
    user_id: Optional[str] = None
) -> str:
    """Inserts a single interactive lead into lead_queue with computed priority score and user association."""
    batch_id = f"single_{uuid.uuid4().hex[:8]}"
    now = datetime.now()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO lead_queue (
                    batch_id, company, role, contact_name, contact_email,
                    priority_score, priority_tier, priority_tags,
                    status, thread_id, processed_at, user_id
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id;
                """,
                (
                    batch_id,
                    lead.get("company", "Unknown"),
                    lead.get("role", "Target Role"),
                    lead.get("contact_name", ""),
                    lead.get("contact_email", ""),
                    lead.get("priority_score", 0),
                    lead.get("priority_tier", "MEDIUM"),
                    json.dumps(lead.get("priority_tags", [])),
                    status,
                    thread_id,
                    now,
                    user_id
                )
            )
            lead_id = str(cur.fetchone()[0])
            return lead_id

def get_lead_by_thread_id(thread_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves lead details by LangGraph thread_id, optionally filtered by user_id."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            if user_id:
                cur.execute("SELECT * FROM lead_queue WHERE thread_id = %s AND user_id = %s LIMIT 1", (thread_id, user_id))
            else:
                cur.execute("SELECT * FROM lead_queue WHERE thread_id = %s LIMIT 1", (thread_id,))
            row = cur.fetchone()
            if not row:
                return None
            colnames = [desc[0] for desc in cur.description]
            lead = dict(zip(colnames, row))
            lead["id"] = str(lead["id"])
            return lead

def list_queued_leads(status: Optional[str] = None, limit: int = 100, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves leads sorted descending by priority score with user scoping."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            query = "SELECT * FROM lead_queue"
            params = []
            conditions = []

            if status:
                conditions.append("status = %s")
                params.append(status)
            if user_id:
                conditions.append("user_id = %s")
                params.append(user_id)

            if conditions:
                query += " WHERE " + " AND ".join(conditions)

            query += " ORDER BY priority_score DESC, created_at ASC LIMIT %s"
            params.append(limit)

            cur.execute(query, tuple(params))
            colnames = [desc[0] for desc in cur.description]
            leads = []
            for row in cur.fetchall():
                lead = dict(zip(colnames, row))
                lead["id"] = str(lead["id"])
                if isinstance(lead.get("priority_tags"), str):
                    try:
                        lead["priority_tags"] = json.loads(lead["priority_tags"])
                    except Exception:
                        lead["priority_tags"] = []
                if lead.get("created_at") and hasattr(lead["created_at"], "isoformat"):
                    lead["created_at"] = lead["created_at"].isoformat()
                if lead.get("processed_at") and hasattr(lead["processed_at"], "isoformat"):
                    lead["processed_at"] = lead["processed_at"].isoformat()
                leads.append(lead)
            return leads

def claim_queued_leads(limit: int = 10, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Atomically claims unexecuted leads using PostgreSQL row-level locks (FOR UPDATE SKIP LOCKED).
    
    Prevents race conditions across multi-worker deployments (e.g. Uvicorn --workers 2+)
    and ensures no lead is ever processed or emailed twice.
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            if user_id:
                subquery = """
                    SELECT id FROM lead_queue 
                    WHERE status = 'QUEUED' AND user_id = %s
                    ORDER BY priority_score DESC, created_at ASC 
                    LIMIT %s 
                    FOR UPDATE SKIP LOCKED
                """
                params = (user_id, limit)
            else:
                subquery = """
                    SELECT id FROM lead_queue 
                    WHERE status = 'QUEUED'
                    ORDER BY priority_score DESC, created_at ASC 
                    LIMIT %s 
                    FOR UPDATE SKIP LOCKED
                """
                params = (limit,)

            claim_query = f"""
                UPDATE lead_queue
                SET status = 'PROCESSING', processed_at = NOW()
                WHERE id IN ({subquery})
                RETURNING *;
            """
            cur.execute(claim_query, params)
            colnames = [desc[0] for desc in cur.description]
            claimed = []
            for row in cur.fetchall():
                lead = dict(zip(colnames, row))
                lead["id"] = str(lead["id"])
                if isinstance(lead.get("priority_tags"), str):
                    try:
                        lead["priority_tags"] = json.loads(lead["priority_tags"])
                    except Exception:
                        lead["priority_tags"] = []
                if lead.get("created_at") and hasattr(lead["created_at"], "isoformat"):
                    lead["created_at"] = lead["created_at"].isoformat()
                if lead.get("processed_at") and hasattr(lead["processed_at"], "isoformat"):
                    lead["processed_at"] = lead["processed_at"].isoformat()
                claimed.append(lead)
            return claimed

def get_lead_by_id(lead_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieves full details of a single lead by UUID, optionally verifying user_id."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            if user_id:
                cur.execute("SELECT * FROM lead_queue WHERE id = %s AND user_id = %s", (lead_id, user_id))
            else:
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

def get_lead_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves the most recent lead matching contact_email (case-insensitive)."""
    clean_email = email.strip().lower()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT * FROM lead_queue 
                WHERE LOWER(contact_email) = %s 
                ORDER BY created_at DESC 
                LIMIT 1;
            """, (clean_email,))
            row = cur.fetchone()
            if not row:
                return None
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
    contact_email: Optional[str] = None,
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
                    contact_email = COALESCE(%s, contact_email),
                    processed_at = %s
                WHERE id = %s
                """,
                (
                    status, thread_id, research_summary, icp_fit_score,
                    icp_rationale, email_draft, eval_score, eval_verdict,
                    eval_critique, contact_email, now, lead_id
                )
            )

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
    user_id: Optional[str] = None,
) -> str:
    """Logs an email dispatch event into the PostgreSQL dispatch_ledger with user association."""
    body_preview = body[:200] if body else ""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO dispatch_ledger (
                    lead_id, thread_id, recipient, subject, body_preview, provider, message_id, status, error_message, user_id
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (lead_id, thread_id, recipient, subject, body_preview, provider, message_id, status, error_message, user_id)
            )
            ledger_id = cur.fetchone()[0]
    return str(ledger_id)

def list_dispatch_ledger(limit: int = 50, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Retrieves recent email dispatches from PostgreSQL scoped by user_id."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            if user_id:
                cur.execute(
                    """
                    SELECT id, lead_id, thread_id, recipient, subject, body_preview, provider, message_id, status, error_message, dispatched_at
                    FROM dispatch_ledger
                    WHERE user_id = %s
                    ORDER BY dispatched_at DESC
                    LIMIT %s
                    """,
                    (user_id, limit)
                )
            else:
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
    Transitions lead status to 'REPLIED', and records reply context in PostgreSQL.
    """
    from datetime import datetime, timezone

    lead = get_lead_by_id(lead_id)
    if not lead:
        return {"status": "ERROR", "detail": "Lead not found"}

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
                    reply_data = %s
                WHERE id = %s
                """,
                (json.dumps(reply_payload), lead_id)
            )
    return {
        "status": "REPLIED",
        "reply_data": reply_payload,
    }

def get_analytics_summary(user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Computes real-time pipeline analytics, Token-Saver ROI economics,
    deliverability rates, and inbound engagement metrics from PostgreSQL.
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            # 1. Lead Queue Status Counts
            if user_id:
                cur.execute("""
                    SELECT status, COUNT(*)
                    FROM lead_queue
                    WHERE user_id = %s
                    GROUP BY status
                """, (user_id,))
            else:
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
            TOKENS_SAVED_PER_DISQUALIFIED = 6500
            tokens_saved = disqualified * TOKENS_SAVED_PER_DISQUALIFIED
            free_tier_days_preserved = round(tokens_saved / 100000, 2)

            # 3. Average AI Quality & ICP Scores
            if user_id:
                cur.execute("""
                    SELECT 
                        ROUND(AVG(icp_fit_score)::numeric, 1),
                        ROUND(AVG(eval_score)::numeric, 1)
                    FROM lead_queue
                    WHERE icp_fit_score IS NOT NULL AND icp_fit_score > 0 AND user_id = %s
                """, (user_id,))
            else:
                cur.execute("""
                    SELECT 
                        ROUND(AVG(icp_fit_score)::numeric, 1),
                        ROUND(AVG(eval_score)::numeric, 1)
                    FROM lead_queue
                    WHERE icp_fit_score IS NOT NULL AND icp_fit_score > 0
                """)
            avg_icp, avg_eval = cur.fetchone()

            # 4. Deliverability Ledger Breakdown
            if user_id:
                cur.execute("""
                    SELECT status, COUNT(*)
                    FROM dispatch_ledger
                    WHERE user_id = %s
                    GROUP BY status
                """, (user_id,))
            else:
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
            if user_id:
                cur.execute("""
                    SELECT reply_data->>'sentiment', COUNT(*)
                    FROM lead_queue
                    WHERE reply_data IS NOT NULL AND user_id = %s
                    GROUP BY reply_data->>'sentiment'
                """, (user_id,))
            else:
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

def log_scheduler_run(
    status: str,
    leads_processed: int = 0,
    details: Optional[Dict[str, Any]] = None,
    run_date: Optional[date] = None
) -> str:
    """Logs a completed, skipped, or idle scheduler drip batch into PostgreSQL."""
    today = run_date or date.today()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO scheduler_runs (run_date, status, leads_processed, details)
                VALUES (%s, %s, %s, %s)
                RETURNING id;
            """, (today, status, leads_processed, json.dumps(details or {})))
            run_id = cur.fetchone()[0]
            return str(run_id)

def has_drip_run_today() -> bool:
    """Checks PostgreSQL to verify if a morning drip batch has already been recorded for today."""
    today = date.today()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*) FROM scheduler_runs
                WHERE run_date = %s AND status IN ('COMPLETED', 'SKIPPED', 'IDLE')
            """, (today,))
            count = cur.fetchone()[0]
            return count > 0

def get_latest_drip_run_today() -> Optional[Dict[str, Any]]:
    """Returns details of the latest drip run recorded for today in PostgreSQL."""
    today = date.today()
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, run_date, run_time, status, leads_processed, details
                FROM scheduler_runs
                WHERE run_date = %s
                ORDER BY run_time DESC
                LIMIT 1;
            """, (today,))
            row = cur.fetchone()
            if row:
                raw_details = row[5]
                parsed_details = raw_details if isinstance(raw_details, dict) else json.loads(raw_details or "{}")
                return {
                    "id": str(row[0]),
                    "run_date": row[1].isoformat(),
                    "run_time": row[2].isoformat() if row[2] else None,
                    "status": row[3],
                    "leads_processed": row[4],
                    "details": parsed_details,
                }
            return None