"""
Authentication, User Management, and JWT Cookie Security Module for OutboundSDR.
"""

import os
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import jwt
import bcrypt
from fastapi import Request, Response, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field

# Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-outbound-sdr-jwt-key-change-in-production-2026")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"  # Set to True in production HTTPS
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")

# Pydantic Schemas for Auth
class UserRegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="User's unique email address")
    password: str = Field(..., min_length=6, description="User password (min 6 chars)")
    full_name: Optional[str] = Field(default="", description="User display name")

class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="User password")

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    daily_quota_limit: int
    created_at: str

# Password Hashing Utilities
def hash_password(password: str) -> str:
    """Hashes a plain password using bcrypt with salt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def hash_token(raw_token: str) -> str:
    """Computes SHA-256 hash of a token for secure database indexing."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

# JWT Generation Utilities
def create_access_token(user_id: str, email: str) -> str:
    """Generates a short-lived access JWT token."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> Tuple[str, str, datetime]:
    """
    Generates a secure cryptographically random refresh token.
    Returns: (raw_token, token_hash, expires_at)
    """
    raw_token = f"rt_{uuid.uuid4().hex}_{uuid.uuid4().hex}"
    token_hash = hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    return raw_token, token_hash, expires_at

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates an access JWT token."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.PyJWTError:
        return None

# Cookie Helpers
def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Sets secure httpOnly cookies on the HTTP response."""
    # Access token cookie (short-lived)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",
    )
    # Refresh token cookie (long-lived)
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        expires=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        samesite=COOKIE_SAMESITE,
        secure=COOKIE_SECURE,
        path="/",
    )

def clear_auth_cookies(response: Response):
    """Deletes auth cookies on logout."""
    response.delete_cookie(key="access_token", path="/", samesite=COOKIE_SAMESITE)
    response.delete_cookie(key="refresh_token", path="/", samesite=COOKIE_SAMESITE)


# Database operations (connected to pool in queue_manager)
from queue_manager import pool

def init_auth_schema():
    """Initializes users and user_tokens tables, and migrates existing data to default admin."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            # 1. Users Table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    full_name VARCHAR(100) DEFAULT '',
                    daily_quota_limit INT DEFAULT 10,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # 2. Refresh Tokens Table (Database-backed session management)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_tokens (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token_hash VARCHAR(255) NOT NULL UNIQUE,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_user_tokens_hash ON user_tokens(token_hash);
            """)

            # 3. Add foreign keys to lead_queue & dispatch_ledger
            cur.execute("""
                ALTER TABLE lead_queue ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
                ALTER TABLE dispatch_ledger ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
                CREATE INDEX IF NOT EXISTS idx_lead_queue_user ON lead_queue(user_id);
                CREATE INDEX IF NOT EXISTS idx_dispatch_ledger_user ON dispatch_ledger(user_id);
            """)

            # 4. Create default seed admin user if no users exist
            cur.execute("SELECT id FROM users LIMIT 1;")
            existing = cur.fetchone()
            if not existing:
                default_email = "admin@outboundsdr.ai"
                default_pass_hash = hash_password("Password123!")
                cur.execute(
                    """
                    INSERT INTO users (email, password_hash, full_name, daily_quota_limit)
                    VALUES (%s, %s, %s, 10)
                    RETURNING id;
                    """,
                    (default_email, default_pass_hash, "Founding SDR Admin")
                )
                admin_id = cur.fetchone()[0]
                print(f">> [Auth Migration] Created default admin user: {default_email} (ID: {admin_id})")

                # Backfill existing legacy records
                cur.execute("UPDATE lead_queue SET user_id = %s WHERE user_id IS NULL;", (admin_id,))
                cur.execute("UPDATE dispatch_ledger SET user_id = %s WHERE user_id IS NULL;", (admin_id,))
                print(">> [Auth Migration] Backfilled existing leads and ledger entries to admin user.")
            else:
                admin_id = existing[0]
                # In case new unassigned leads exist
                cur.execute("UPDATE lead_queue SET user_id = %s WHERE user_id IS NULL;", (admin_id,))
                cur.execute("UPDATE dispatch_ledger SET user_id = %s WHERE user_id IS NULL;", (admin_id,))


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Fetches user record by email."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, password_hash, full_name, daily_quota_limit, created_at FROM users WHERE LOWER(email) = LOWER(%s);",
                (email.strip(),)
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": str(row[0]),
                "email": row[1],
                "password_hash": row[2],
                "full_name": row[3] or "",
                "daily_quota_limit": row[4] or 10,
                "created_at": row[5].isoformat() if row[5] else "",
            }

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetches user record by UUID."""
    try:
        val_uuid = uuid.UUID(user_id)
    except ValueError:
        return None

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, full_name, daily_quota_limit, created_at FROM users WHERE id = %s;",
                (str(val_uuid),)
            )
            row = cur.fetchone()
            if not row:
                return None
            return {
                "id": str(row[0]),
                "email": row[1],
                "full_name": row[2] or "",
                "daily_quota_limit": row[3] or 10,
                "created_at": row[4].isoformat() if row[4] else "",
            }

def create_user(email: str, password_hash: str, full_name: str = "", daily_quota_limit: int = 10) -> Dict[str, Any]:
    """Inserts a new user record."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (email, password_hash, full_name, daily_quota_limit)
                VALUES (%s, %s, %s, %s)
                RETURNING id, email, full_name, daily_quota_limit, created_at;
                """,
                (email.strip().lower(), password_hash, full_name, daily_quota_limit)
            )
            row = cur.fetchone()
            return {
                "id": str(row[0]),
                "email": row[1],
                "full_name": row[2] or "",
                "daily_quota_limit": row[3],
                "created_at": row[4].isoformat() if row[4] else "",
            }

def save_refresh_token(user_id: str, token_hash: str, expires_at: datetime):
    """Stores a hashed refresh token in user_tokens."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_tokens (user_id, token_hash, expires_at)
                VALUES (%s, %s, %s);
                """,
                (user_id, token_hash, expires_at)
            )

def verify_and_revoke_refresh_token(raw_token: str) -> Optional[str]:
    """
    Verifies that the refresh token exists and is not expired.
    Deletes the token on consumption (rotation) and returns user_id.
    """
    token_hash = hash_token(raw_token)
    now = datetime.now(timezone.utc)
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM user_tokens 
                WHERE token_hash = %s AND expires_at > %s
                RETURNING user_id;
                """,
                (token_hash, now)
            )
            row = cur.fetchone()
            if row:
                return str(row[0])
            return None

def revoke_refresh_token(raw_token: str):
    """Deletes a specific refresh token (used on logout)."""
    token_hash = hash_token(raw_token)
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM user_tokens WHERE token_hash = %s;", (token_hash,))


# FastAPI Dependency for Protecting Endpoints
async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    FastAPI Dependency:
    Extracts access_token from httpOnly cookie (or Authorization header fallback),
    validates the JWT, and retrieves user profile from PostgreSQL.
    """
    token = request.cookies.get("access_token")

    # Fallback to Authorization: Bearer <token> if present
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid token. Please refresh token or log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with this token no longer exists.",
        )

    return user

