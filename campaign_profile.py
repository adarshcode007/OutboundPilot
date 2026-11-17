"""
Campaign Profile & Offer Studio Module.
Manages dynamic user-configured campaign profiles:
- B2B Offer Mode (Agencies, SaaS products, Consultants, Service Providers)
- Job Seeker Mode (Engineers, SDRs, Marketers reaching out for jobs/contracts)
Persists custom profiles to Neon PostgreSQL so the multi-agent pipeline
dynamically conditions Researcher, ICP Analyst, Copywriter, and Evaluator on the user's actual goals.
"""

from typing import Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from queue_manager import pool

class CampaignProfileUpdateRequest(BaseModel):
    campaign_type: Literal["OFFER", "JOB_SEEKER"] = Field(default="OFFER")
    sender_name: str = Field(default="")
    sender_title: str = Field(default="")
    company_or_brand: str = Field(default="")
    offer_description: str = Field(default="")
    target_icp_criteria: str = Field(default="")
    key_benefits: str = Field(default="")
    portfolio_or_links: str = Field(default="")

DEFAULT_OFFER_PROFILE = {
    "campaign_type": "OFFER",
    "sender_name": "David",
    "sender_title": "Enterprise Account Executive",
    "company_or_brand": "Outbound Pilot AI",
    "offer_description": "Autonomous multi-agent SDR workforce that automates pipeline generation, lead research, and executive outbound copywriting.",
    "target_icp_criteria": "High-growth B2B SaaS, fintech, and tech scale-ups with 20-500 employees looking to scale sales without ballooning headcount.",
    "key_benefits": "Cuts manual lead research time by 80%, saves 4,000 LLM tokens per exit with automated ICP guardrails, and books high-intent meetings.",
    "portfolio_or_links": "https://github.com/adarshcode007/OutboundPilot",
}

PRESET_PROFILES = {
    "AI_AGENCY": DEFAULT_OFFER_PROFILE,
    "JOB_SEEKER": {
        "campaign_type": "JOB_SEEKER",
        "sender_name": "Adarsh",
        "sender_title": "Full-Stack & Agentic AI Engineer",
        "company_or_brand": "Candidate / Open to Roles",
        "offer_description": "Full-stack engineer with deep expertise in LangGraph multi-agent systems, FastAPI, React 19, and production LLM cost optimization.",
        "target_icp_criteria": "Tech companies, AI startups, and scale-ups hiring Full-Stack Engineers, AI Engineers, or Backend Developers working with Python & React.",
        "key_benefits": "Architected production-ready multi-agent pipelines, reduced inference token expenditure by 60%, and built resilient PostgreSQL checkpointer state machines.",
        "portfolio_or_links": "https://github.com/adarshcode007/OutboundPilot",
    },
    "GROWTH_AGENCY": {
        "campaign_type": "OFFER",
        "sender_name": "Alex",
        "sender_title": "Head of Growth",
        "company_or_brand": "HyperScale Media",
        "offer_description": "Pay-for-performance cold email outreach and B2B pipeline acquisition engine.",
        "target_icp_criteria": "B2B SaaS companies and digital consultancies with $1M-$10M ARR looking to add 15-30 qualified sales demos each month.",
        "key_benefits": "Zero upfront setup fees, fully managed domain warming, and high-converting copywriting that drives 12-18% positive reply rates.",
        "portfolio_or_links": "https://hyperscalemedia.com",
    },
    "CLOUD_CONSULTING": {
        "campaign_type": "OFFER",
        "sender_name": "Michael",
        "sender_title": "Principal Solutions Architect",
        "company_or_brand": "Vanguard Cloud Advisory",
        "offer_description": "Cloud cost optimization, Kubernetes architecture modernization, and serverless database migrations.",
        "target_icp_criteria": "Mid-market enterprise companies running AWS/GCP workloads with $50k+/mo cloud bills seeking infrastructure efficiency.",
        "key_benefits": "Guaranteed 25-40% cloud bill reduction in 60 days with zero production downtime.",
        "portfolio_or_links": "https://vanguardcloud.io",
    }
}


def init_campaign_profile_schema():
    """Initializes user_campaign_profiles table in PostgreSQL."""
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS user_campaign_profiles (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    campaign_type VARCHAR(50) DEFAULT 'OFFER',
                    sender_name VARCHAR(100) DEFAULT '',
                    sender_title VARCHAR(150) DEFAULT '',
                    company_or_brand VARCHAR(150) DEFAULT '',
                    offer_description TEXT DEFAULT '',
                    target_icp_criteria TEXT DEFAULT '',
                    key_benefits TEXT DEFAULT '',
                    portfolio_or_links TEXT DEFAULT '',
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id)
                );
                CREATE INDEX IF NOT EXISTS idx_user_campaign_profiles_user ON user_campaign_profiles(user_id);
            """)
        conn.commit()


def get_user_campaign_profile(user_id: Optional[str]) -> Dict[str, Any]:
    """Retrieves user's active campaign profile, falling back to default if unconfigured."""
    if not user_id:
        return DEFAULT_OFFER_PROFILE.copy()

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT campaign_type, sender_name, sender_title, company_or_brand,
                       offer_description, target_icp_criteria, key_benefits,
                       portfolio_or_links, is_active
                FROM user_campaign_profiles
                WHERE user_id = %s
                LIMIT 1;
            """, (user_id,))
            row = cur.fetchone()
            if not row:
                return DEFAULT_OFFER_PROFILE.copy()

            return {
                "campaign_type": row[0] or "OFFER",
                "sender_name": row[1] or "David",
                "sender_title": row[2] or "Executive",
                "company_or_brand": row[3] or "Outbound Pilot AI",
                "offer_description": row[4] or DEFAULT_OFFER_PROFILE["offer_description"],
                "target_icp_criteria": row[5] or DEFAULT_OFFER_PROFILE["target_icp_criteria"],
                "key_benefits": row[6] or DEFAULT_OFFER_PROFILE["key_benefits"],
                "portfolio_or_links": row[7] or "",
                "is_active": row[8],
            }


def save_user_campaign_profile(user_id: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
    """Upserts user's custom campaign profile into PostgreSQL."""
    campaign_type = profile_data.get("campaign_type", "OFFER").strip().upper()
    sender_name = profile_data.get("sender_name", "").strip() or "David"
    sender_title = profile_data.get("sender_title", "").strip()
    company_or_brand = profile_data.get("company_or_brand", "").strip()
    offer_description = profile_data.get("offer_description", "").strip()
    target_icp_criteria = profile_data.get("target_icp_criteria", "").strip()
    key_benefits = profile_data.get("key_benefits", "").strip()
    portfolio_or_links = profile_data.get("portfolio_or_links", "").strip()

    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_campaign_profiles (
                    user_id, campaign_type, sender_name, sender_title, company_or_brand,
                    offer_description, target_icp_criteria, key_benefits, portfolio_or_links,
                    is_active, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET
                    campaign_type = EXCLUDED.campaign_type,
                    sender_name = EXCLUDED.sender_name,
                    sender_title = EXCLUDED.sender_title,
                    company_or_brand = EXCLUDED.company_or_brand,
                    offer_description = EXCLUDED.offer_description,
                    target_icp_criteria = EXCLUDED.target_icp_criteria,
                    key_benefits = EXCLUDED.key_benefits,
                    portfolio_or_links = EXCLUDED.portfolio_or_links,
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP;
            """, (
                user_id, campaign_type, sender_name, sender_title, company_or_brand,
                offer_description, target_icp_criteria, key_benefits, portfolio_or_links
            ))
        conn.commit()

    return get_user_campaign_profile(user_id)
