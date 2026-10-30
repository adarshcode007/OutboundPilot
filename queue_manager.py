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