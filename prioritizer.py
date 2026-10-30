"""
Regex-Powered Smart Lead Prioritization Engine.
Design Principles:
- 100% Deterministic & Heuristic: Zero LLM API calls, zero token expenditure.
- High Throughput: Evaluates thousands of leads in milliseconds.
- Scoring Breakdown (0 - 100 points):
    1. Role Seniority (Max 40 pts): Executive C-Level, VP, Head of, Director.
    2. Corporate Domain Integrity (Max 20 pts): Verified business domain vs. freemail.
    3. Strategic Tech / Growth Signals (Max 20 pts): AI, Cloud, Infra, Security keywords.
    4. Contact Data Completeness (Max 20 pts): Name + Email completeness.
"""

import re
from typing import TypedDict, Optional

# Regex Patterns for Seniority
RE_C_SUITE = re.compile(
    r"\b(ceo|cto|cro|cmo|coo|ciso|chief|founder|co-founder|president|partner)\b",
    re.IGNORECASE
)
RE_VP_HEAD = re.compile(
    r"\b(vp|vice president|head of|director|general manager)\b",
    re.IGNORECASE
)
RE_MANAGEMENT = re.compile(
    r"\b(lead|principal|staff|architect|senior manager|engineering manager)\b",
    re.IGNORECASE
)
RE_SENIOR_IC = re.compile(
    r"\b(senior|sr\.?|specialist)\b",
    re.IGNORECASE
)

# Common Freemail / Consumer Domains (Scores 0 on Domain Integrity)
FREEMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "mail.com", "proton.me", "protonmail.com"
}

# High-Intent / Strategic Tech Keywords
RE_TECH_SIGNALS = re.compile(
    r"\b(ai|artificial intelligence|machine learning|ml|infra|infrastructure|cloud|platform|"
    r"security|data|devops|sre|observability|telemetry|billing|enterprise|saas)\b",
    re.IGNORECASE
)

# Negative Filters (Low-value or non-technical retail roles)
RE_LOW_PRIORITY = re.compile(
    r"\b(intern|student|baker|barista|cashier|assistant|receptionist|driver)\b",
    re.IGNORECASE
)

class LeadScoreResult(TypedDict):
    priority_score: int
    priority_tier: str
    priority_tags: list[str]
    breakdown: dict[str, int]

def calculate_lead_priority(
    company: str,
    role: str,
    contact_name: Optional[str] = None,
    contact_email: Optional[str] = None,
) -> LeadScoreResult:
    """Calculates a deterministic priority score (0-100) for a target lead."""
    score = 0
    tags = []
    breakdown = {}

    clean_role = (role or "").strip()
    clean_company = (company or "").strip()
    clean_email = (contact_email or "").strip().lower()
    clean_name = (contact_name or "").strip()

    # 1. Role Seniority Scoring (Max 40 points)
    role_score=0
    if RE_LOW_PRIORITY.search(clean_role):
        role_score = 0
        tags.append("Low Seniority / Retail")
    elif RE_C_SUITE.search(clean_role):
        role_score = 40
        tags.append("C-Suite / Founder")
    elif RE_VP_HEAD.search(clean_role):
        role_score = 25
        tags.append("VP / Head of")
    elif RE_MANAGEMENT.search(clean_role):
        role_score = 25
        tags.append("Tech Lead / Manager")
    elif RE_SENIOR_IC.search(clean_role):
        role_score = 15
        tags.append("Senior Individual Contributor")
    else:
        role_score = 10   # Default non-classified role
    
    score += role_score
    breakdown["role_seniority"] = role_score


    # 2. Corporate Domain Integrity (Max 20 points)
    domain_score = 0
    if "@" in clean_email:
        domain = clean_email.split("@")[-1].strip()
        if domain in FREEMAIL_DOMAINS:
            domain_score = 0
            tags.append("Freemail Domain")
        elif "." in domain and len(domain) > 3:
            domain_score = 20
            tags.append("Corporate Business Domain")
    else:
        domain_score = 0

    score += domain_score
    breakdown["corporate_domain"] = domain_score

    # 3. Strategic Tech / Growth Signals (Max 20 points)
    tech_score = 0
    combined_context = f"{clean_role} {clean_company}"
    if RE_TECH_SIGNALS.search(combined_context):
        tech_score = 20
        tags.append("High-Value Tech Signal")
    else:
        tech_score = 5
    
    score += tech_score
    breakdown["tech_signals"] = tech_score

    # 4. Contact Data Completeness (Max 20 points)
    completeness_score = 0
    if clean_name and clean_email and "@" in clean_email:
        completeness_score = 20
        tags.append("Complete Contact Record")
    elif clean_name or clean_email:
        completeness_score = 10
        tags.append("Partial Record")
    else:
        completeness_score = 0
    
    score += completeness_score
    breakdown["data_completeness"] = completeness_score

    # Normalize final score between 0 and 100
    final_score = min(max(score, 0), 100)

    # Assing Tier
    if final_score >= 70:
        tier = "HIGH"
    elif final_score >= 45:
        tier = "MEDIUM"
    else:
        tier = "LOW"
    
    return {
        "priority_score": final_score,
        "priority_tier": tier,
        "priority_tags": tags,
        "breakdown": breakdown
    }


def prioritize_leads_batch(leads: list[dict]) -> list[dict]:
    """Scores an entire list of lead dictionaries and sorts them descending by priority."""
    scored_leads = []
    for lead in leads:
        company = lead.get("company", "")
        role = lead.get("role", "")
        name = lead.get("contact_name") or lead.get("name", "")
        email = lead.get("contact_email") or lead.get("email", "")
        result = calculate_lead_priority(
            company=company,
            role=role,
            contact_name=name,
            contact_email=email,
        )

        lead_copy = dict(lead)
        lead_copy["priority_score"] = result["priority_score"]
        lead_copy["priority_tier"] = result["priority_tier"]
        lead_copy["priority_tags"] = result["priority_tags"]
        lead_copy["priority_breakdown"] = result["breakdown"]
        scored_leads.append(lead_copy)

    # Sort descending by priority score
    scored_leads.sort(key=lambda x:x["priority_score"], reverse=True)
    return scored_leads

