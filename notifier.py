"""
Real-Time Webhook & Slack Notification Engine.
Dispatches formatted Block Kit alerts to Slack channels and CRM endpoints
whenever an executive outreach pitch is dispatched or blocked by guardrails.
"""

from langchain_core.output_parsers import json
import os
from typing import Dict, Any, Optional
import httpx
from dotenv import load_dotenv
load_dotenv()

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL", "")
CRM_WEBHOOK_URL = os.getenv("CRM_WEBHOOK_URL", "")

def send_slack_dispatch_alert(
    company: str,
    contact_name: str,
    role: str,
    email: str,
    subject: str,
    status: str,
    provider: str,
    message_id: str,
    icp_score: Optional[int] = None,
    eval_score: Optional[int] = None,
    pitch_preview: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Sends a rich Slack Block Kit notification for an outbound dispatch event.
    Falls back gracefully to mock logginh if SLACK_WEBHOOK_URL is not set.
    """
    is_delivered = status == "DELIVERED"
    status_emoji = "🚀" if is_delivered else "🛑"
    status_header = "Executive Outreach Dispatched" if is_delivered else "Dispatch Blocked by Deliverability Guardrail"

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"{status_emoji} [Digital SDR] {status_header}",
                "emoji": True
            },
        },
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Company:*\n{company}"},
                {"type":"mrkdwn", "text":f"*Contact:*\n{contact_name} ({role})"},
                {"type": "mrkdwn", "text": f"*Recipient Email:*\n`{email}`"},
                {"type": "mrkdwn", "text": f"*Status:*\n*{status}* via {provider}"},
                {"type": "mrkdwn", "text": f"*ICP Fit Score:*\n{icp_score or 'N/A'}/10"},
                {"type": "mrkdwn", "text": f"*AI Judge Quality:*\n{eval_score or 'N/A'}/10 PASS"},
            ],
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*Subject:* {subject}\n*Message ID:* `{message_id}`",
            },
        },
    ]

    if pitch_preview:
        preview_text = pitch_preview[:200] + ("..." if len(pitch_preview) > 280 else "")
        blocks.append({
            "type": "context",
            "elements": [
                {"type": "mrkdwn", "text": f"*Pitch Preview:*\n> {preview_text.replace(chr(10), ' ')}"}
            ],
        })
    payload = {"blocks": blocks}

    # iF live Slack Webhook URL is configured, send HTTP POST
    if SLACK_WEBHOOK_URL:
        try:
            res = httpx.post(SLACK_WEBHOOK_URL, json=payload, timeout=5.0)
            return {
                "status": "SENT" if res.status_code == 200 else "FAILED",
                "http_status": res.status_code,
                "provider": "SLACK_LIVE",
            }
        except Exception as e:
            return {
                "status": "FAILED",
                "error": str(e),
                "provider": "SLACK_LIVE",
            }
    
    # Mock Sandbox Mode (Safe simulation when no Slack webhook is set)
    return {
        "status": "MOCK_SENT",
        "provider": "SLACK_MOCK",
        "payload": payload,
        "detail": "Slack webhook URL not set in .env. Mock Block Kit notification generated successfully.",
    }

def send_crm_lead_sync(lead_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Syncs approved and dispatched lead data to an external CRM webhook (HubSpot/Make/Zapier).
    """
    if not CRM_WEBHOOK_URL:
        return {"status": "SKIPPED", "detail": "CRM_WEBHOOK_URL not configured."}
    
    try:
        res = httpx.post(CRM_WEBHOOK_URL, json=lead_data, timeout=5.0)
        return {"status": "SUCCESS" if res.status_code in [200,201] else "FAILED", "http_status": res.status_code}
    except Exception as e:
        return {"status": "FAILED", "error": str(e)}