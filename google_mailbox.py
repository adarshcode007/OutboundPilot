"""
Google Workspace / Gmail OAuth2 and Native API Dispatcher Module.
Enables multi-tenant, non-technical users to connect their own Google Workspace
or personal Gmail accounts to dispatch cold outbound SDR emails from their own domain.
"""

import os
import time
import base64
import urllib.parse
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import httpx
import jwt
from dotenv import load_dotenv

load_dotenv()

from queue_manager import pool

# Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback"
).strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-outbound-sdr-jwt-key-change-in-production-2026")
JWT_ALGORITHM = "HS256"

GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"
GMAIL_SEND_ENDPOINT = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"

GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


def init_mailbox_schema():
    """Initializes the user_mailboxes table in PostgreSQL for OAuth credential storage."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_mailboxes (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    provider VARCHAR(50) DEFAULT 'GOOGLE',
                    email VARCHAR(255) NOT NULL,
                    refresh_token TEXT NOT NULL,
                    access_token TEXT,
                    token_expires_at TIMESTAMP WITH TIME ZONE,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, provider)
                );
                CREATE INDEX IF NOT EXISTS idx_user_mailboxes_user ON user_mailboxes(user_id);
            """)
        conn.commit()


def generate_oauth_state(user_id: str, origin: Optional[str] = None) -> str:
    """Creates a short-lived signed JWT state token containing user_id and origin to prevent CSRF."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    payload = {
        "sub": user_id,
        "origin": origin,
        "type": "google_oauth_state",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_oauth_state(state: str) -> Tuple[Optional[str], Optional[str]]:
    """Decodes and validates OAuth state JWT, returning (user_id, origin)."""
    try:
        payload = jwt.decode(state, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "google_oauth_state":
            return None, None
        return payload.get("sub"), payload.get("origin")
    except Exception:
        return None, None


def get_google_auth_url(user_id: str, origin: Optional[str] = None) -> str:
    """Builds the Google OAuth2 consent URL for the user."""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise ValueError(
            "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and "
            "GOOGLE_CLIENT_SECRET in your environment or .env file."
        )

    state = generate_oauth_state(user_id, origin=origin)
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GOOGLE_SCOPES),
        "access_type": "offline",  # Crucial to receive a refresh token
        "prompt": "consent",       # Ensures refresh token and consent checkboxes are always re-issued
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{GOOGLE_AUTH_ENDPOINT}?{urllib.parse.urlencode(params)}"


def exchange_code_for_tokens(code: str) -> Dict[str, Any]:
    """Exchanges authorization code for Google access and refresh tokens."""
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    res = httpx.post(GOOGLE_TOKEN_ENDPOINT, data=data, timeout=12.0)
    if res.status_code != 200:
        raise RuntimeError(f"Google Token Exchange failed ({res.status_code}): {res.text}")
    return res.json()


def fetch_google_user_email(access_token: str) -> str:
    """Retrieves authenticated user's primary email address from Google."""
    headers = {"Authorization": f"Bearer {access_token}"}
    res = httpx.get(GOOGLE_USERINFO_ENDPOINT, headers=headers, timeout=8.0)
    if res.status_code != 200:
        raise RuntimeError(f"Failed to fetch Google profile ({res.status_code}): {res.text}")
    data = res.json()
    email = data.get("email")
    if not email:
        raise RuntimeError("Google profile did not contain an email address.")
    return email


def save_user_mailbox(
    user_id: str,
    email: str,
    refresh_token: str,
    access_token: str,
    expires_in: int,
    provider: str = "GOOGLE"
):
    """Saves or updates user's connected mailbox credentials in PostgreSQL."""
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=max(0, expires_in - 60))
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_mailboxes (
                    user_id, provider, email, refresh_token, access_token, token_expires_at, is_active, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, provider) DO UPDATE SET
                    email = EXCLUDED.email,
                    refresh_token = EXCLUDED.refresh_token,
                    access_token = EXCLUDED.access_token,
                    token_expires_at = EXCLUDED.token_expires_at,
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP;
            """, (user_id, provider, email, refresh_token, access_token, expires_at))
        conn.commit()


def get_user_mailbox(user_id: str, provider: str = "GOOGLE") -> Optional[Dict[str, Any]]:
    """Retrieves the user's active connected mailbox from PostgreSQL."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, user_id, provider, email, is_active, token_expires_at, created_at, updated_at
                FROM user_mailboxes
                WHERE user_id = %s AND provider = %s AND is_active = TRUE
                LIMIT 1;
            """, (user_id, provider))
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": str(row[0]),
                "user_id": str(row[1]),
                "provider": row[2],
                "email": row[3],
                "is_active": row[4],
                "token_expires_at": row[5].isoformat() if row[5] else None,
                "created_at": row[6].isoformat() if row[6] else None,
                "updated_at": row[7].isoformat() if row[7] else None,
            }


def delete_user_mailbox(user_id: str, provider: str = "GOOGLE") -> bool:
    """Disconnects and deletes the user's mailbox credentials."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM user_mailboxes
                WHERE user_id = %s AND provider = %s;
            """, (user_id, provider))
            deleted = cur.rowcount > 0
        conn.commit()
    return deleted


def get_valid_google_access_token(user_id: str) -> Optional[Tuple[str, str]]:
    """
    Returns a guaranteed valid (access_token, sender_email) for the user.
    If the access token is near expiry or expired, it automatically refreshes it
    using the stored Google refresh_token and updates PostgreSQL.
    """
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT email, refresh_token, access_token, token_expires_at
                FROM user_mailboxes
                WHERE user_id = %s AND provider = 'GOOGLE' AND is_active = TRUE
                LIMIT 1;
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return None

            email, refresh_token, access_token, token_expires_at = row

            # If access_token exists and is valid for at least another 90 seconds, use it
            now = datetime.now(timezone.utc)
            if access_token and token_expires_at and token_expires_at > (now + timedelta(seconds=90)):
                return access_token, email

            # Otherwise, refresh the token with Google
            try:
                refresh_data = {
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                }
                res = httpx.post(GOOGLE_TOKEN_ENDPOINT, data=refresh_data, timeout=10.0)
                if res.status_code != 200:
                    print(f">> [GMAIL API] Failed to refresh token for {email}: {res.text}")
                    return None

                tokens = res.json()
                new_access_token = tokens["access_token"]
                expires_in = tokens.get("expires_in", 3600)
                new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=max(0, expires_in - 60))

                # Update in DB
                cur.execute("""
                    UPDATE user_mailboxes
                    SET access_token = %s, token_expires_at = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = %s AND provider = 'GOOGLE';
                """, (new_access_token, new_expires_at, user_id))
                conn.commit()

                return new_access_token, email
            except Exception as e:
                print(f">> [GMAIL API] Exception during token refresh: {e}")
                return None


def send_email_via_gmail_api(
    access_token: str,
    sender_email: str,
    to_email: str,
    subject: str,
    body: str,
) -> Dict[str, Any]:
    """
    Sends an email directly through the Gmail API (users.messages.send)
    on behalf of the authenticated user's Google Workspace / Gmail account.
    """
    # 1. Construct standard RFC 2822 MIME message
    msg = MIMEMultipart("alternative")
    msg["To"] = to_email
    msg["From"] = sender_email
    msg["Subject"] = subject
    msg["List-Unsubscribe"] = f"<mailto:unsubscribe@{sender_email.split('@')[-1]}?subject=unsubscribe>"
    msg["Auto-Submitted"] = "auto-generated"
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # 2. Base64url encode the message bytes (required by Gmail API)
    raw_message = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")

    # 3. Post to Gmail API
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {"raw": raw_message}

    res = httpx.post(GMAIL_SEND_ENDPOINT, headers=headers, json=payload, timeout=15.0)

    if res.status_code in [200, 201]:
        data = res.json()
        return {
            "status": "DELIVERED",
            "message_id": data.get("id"),
            "thread_id": data.get("threadId"),
            "provider": "GOOGLE_GMAIL",
            "sender_email": sender_email,
        }
    else:
        error_detail = res.text
        try:
            err_json = res.json()
            error_detail = err_json.get("error", {}).get("message", error_detail)
        except Exception:
            pass
        return {
            "status": "FAILED",
            "message_id": None,
            "provider": "GOOGLE_GMAIL",
            "error_message": f"Gmail API Error ({res.status_code}): {error_detail}",
            "sender_email": sender_email,
        }
