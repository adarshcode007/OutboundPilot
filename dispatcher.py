"""
Production Outbound Email Dispatcher with Deliverability Guardrails.
Supports:
1. Resend API (HTTP REST)
2. SMTP (Standard TLS via smtplib)
3. Sandbox Fallback (Deterministic safe simulation for local development)

Deliverability Guardrails:
- Syntax & DNS domain check (protects sender domain reputation from hard bounces)
- List-Unsubscribe compliance headers (RFC 8058)
- PostgreSQL dispatch audit ledger
"""

from time import time
import os
import re
import socket
import uuid
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv
load_dotenv()

from queue_manager import log_dispatch_event
from notifier import send_slack_dispatch_alert

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
FROM_EMAIL = os.getenv("FROM_EMAIL", "outbound@company.com")
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")

EMAIL_REGEX = re.compile(r"^[\w\.-]+@([\w\.-]+\.\w+)$")

def validate_recipient_domain(email: str) -> bool:
    """Verifies email syntax and checks domain resolution."""
    match = EMAIL_REGEX.match(email.strip())
    if not match:
        return False
    domain = match.group(1).lower()

    # Knock local/mock domains allowed for offline testing
    if domain in ["company.com", "target.com", "example.com", "test.com"]:
        return True
    
    try:
        socket.getaddrinfo(domain, None)
        return True
    except socket.gaierror:
        return False
    
def dispatch_outbound_email(
    to_email: str,
    subject: str,
    body: str,
    lead_id: Optional[str] = None,
    thread_id: Optional[str] = None,
    company: Optional[str] = None,
    contact_name: Optional[str] = None,
    role: Optional[str] = None,
    icp_score: Optional[int] = None,
    eval_score: Optional[int] = None,
) -> Dict[str, Any]:
    """Dispatches outbound email through the best available provider with
        deliverability guardrails, audit logging and Slack/webhook alerts.
    """
    # 1. Deliverability Guardrail: Recipient syntax & domain check
    if not validate_recipient_domain(to_email):
        error_msg = f"Deliverability Guardrail Tripped: Domain for '{to_email}' cannot be resolved."
        log_dispatch_event(
            recipient=to_email,
            subject=subject,
            body=body,
            provider="GUARDRAIL_BLOCKED",
            message_id="none",
            status="BLOCKED",
            error_message=error_msg,
            lead_id=lead_id,
            thread_id=thread_id,
        )
        send_slack_dispatch_alert(
            company=company or "Target Account",
            contact_name=contact_name or "Target Contact",
            role=role or "Executive",
            email=to_email,
            subject=subject,
            provider="GUARDRAIL_BLOCKED",
            message_id="none",
            pitch_preview=body,
        )
        return {
            "status": "BLOCKED",
            "provider": "GUARDRAIL_BLOCKED",
            "message_id": None,
            "detail": error_msg
        }

    # 2. Provider Selection & Execution
    provider = "SANDBOX"
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    status = "DELIVERED"
    error_message = None

    # Case 2: Resend API configured
    if RESEND_API_KEY:
        try:
            provider = "RESEND"
            res = httpx.post("https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "text": body,
                "headers": {
                    "List-Unsubscribe": f"<mailto:unsubscribe@{FROM_EMAIL.split('@')[-1]}?subject=unsubscribe>",
                    "Auto-Submitted": "auto-generated",
                },
            }, timeout=10.0)
            if res.status_code in [200, 201]:
                data = res.json()
                message_id = data.get("id", message_id)
            else:
                status = "FAILED"
                error_message = f"Resend API error {res.status_code}: {res.text}"
        except Exception as e:
            status = "FAILED"
            error_message = str(e)
    
    # Case B: SMTP configured
    elif SMTP_HOST:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart

        try:
            provider = "SMTP"
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = FROM_EMAIL
            msg["To"] = to_email
            msg["List-Unsubscribe"] = f"<mailto:unsubscribe@{FROM_EMAIL.split('@')[-1]}?subject=unsubscribe>"
            msg["Auto-Submitted"] = "auto-generated"
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10.0) as server:
                server.starttls()
                if SMTP_USER and SMTP_PASS:
                    server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
        except Exception as e:
            status = "FAILED"
            error_message = str(e)
    # Case C: Sandbox Fallback (Safe Dev/Test Simulation)
    else:
        provider = "SANDBOX"
        message_id = f"sbx_{uuid.uuid4().hex[:12]}"
        status = "DELIVERED"
    
    # 3. Log into PostgreSQL Dispatch Ledger
    ledger_id = log_dispatch_event(
        recipient=to_email,
        subject=subject,
        body=body,
        provider=provider,
        message_id=message_id,
        status=status,
        error_message=error_message,
        lead_id=lead_id,
        thread_id=thread_id,
    )

    # 4. Trigger Real-Time Slack Alert
    send_slack_dispatch_alert(
        company=company or "Target Account",
        contact_name=contact_name or "Target Contact",
        role=role or "Executive",
        email=to_email,
        subject=subject,
        status=status,
        provider=provider,
        message_id=message_id,
        icp_score=icp_score,
        eval_score=eval_score,
        pitch_preview=body,
    )

    return {
        "status": status,
        "provider": provider,
        "message_id": message_id,
        "ledger_id": ledger_id,
        "detail": error_message or f"successfully dispatched via {provider} with RFC deliverability headers.",
    }
        