"""Domain Tools for Autonomous Outbound SDR Multi-Agent Pipeline.
Enterprise Pattern:
- Deterministic Domain Fixtures: Mock data simulating B2B data providers
  (Apollo, Crunchbase, LinkedIn) across high-fit, poor-fit, and edge-case profiles.
- Strict Type Contracts: Uses LangChain's @tool decorator with detailed docstrings
  so the LLM can accurately reason about tool arguments and outputs.
- High-Stakes Action Isolation: send_outbound_email is defined as a side-effect tool
  protected behind human approval.
"""

from langchain_core.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
search = DuckDuckGoSearchRun()

# Mock B2B Intelligence Database
COMPANY_INTELLIGENCE_DB = {
     "stripe": {
        "signals": (
            "Stripe recently announced expansion of their AI-powered Billing and Radar products. "
            "They processed over $1 trillion in total volume in 2024 and are heavily investing in "
            "agentic financial workflows and global payout infrastructure."
        ),
        "tech_and_jobs": (
            "Tech Stack: AWS, Kubernetes, Envoy, Ruby, Go, Python, Terraform, Snowflake.\n"
            "Open Roles: Head of AI Agent Infrastructure, Staff Distributed Systems Engineer, "
            "Enterprise Security Lead. Key challenge: Scaling real-time transaction processing."
        ),
    },
    "datadog": {
        "signals": (
            "Datadog posted 26% YoY revenue growth and launched new LLM Observability & Security Monitoring. "
            "Expanding enterprise go-to-market teams across EMEA and North America."
        ),
        "tech_and_jobs": (
            "Tech Stack: Go, Python, React, Kafka, Kubernetes, PostgreSQL, AWS.\n"
            "Open Roles: VP of Observability Solutions, Director of Cloud Partnerships, "
            "AI Platform Architect. Key challenge: Managing telemetry data ingest cost."
        ),
    },
    "bob's bakery": {
        "signals": (
            "Bob's Bakery is a family-owned single-location bakery in Denver specializing in "
            "sourdough bread and pastries. Has 6 full-time staff and operates locally."
        ),
        "tech_and_jobs": (
            "Tech Stack: Square POS, Wix website, Gmail.\n"
            "Open Roles: Morning Baker, Cashier. No IT or software engineering staff."
        ),
    },
}

@tool
def fetch_company_signals(company_name: str) -> str:
    """Fetch recent news, press releases, funding updates, and strategic initiatives for a target company.
    
    Args: company_name: The name or domain of the target company.

    Returns: A concise summary of recent company signals and market activities.
    """
    key = company_name.lower().strip()
    if key in COMPANY_INTELLIGENCE_DB:
        return COMPANY_INTELLIGENCE_DB[key]["signals"]
    
    # LIVE FALLBACK: Search the live web for real companies!
    query = f"{company_name} recent company news funding product launch 2025 2026"
    return search.run(query)

@tool
def fetch_company_tech_and_hiring(company_name: str) -> str:
    """Fetch tech stack details, open hiring priorities, and engineering bottlenecks from job portals.
    
    Args:
        company_name: The name or domain of the target company.
        
    Returns:
        Verified technical stack and open strategic hiring roles indicating pain points.
    """
    key = company_name.lower().strip()
    if key in COMPANY_INTELLIGENCE_DB:
        return COMPANY_INTELLIGENCE_DB[key]["tech_and_jobs"]
    
    # LIVE FALLBACK: Search for real careers, tech stack & open roles!
    query = f"{company_name} engineering tech stack open roles jobs careers"
    try:
        return search.run(query)
    except Exception as e:
        return f"Tech & Hiring search error: {e}"

@tool
def send_outbound_email(to_email: str, subject: str, body: str) -> str:
    """Send an outbound email to a prospective enterprise contact.
    
    CRITICAL: This tool executes a live side-effect. In the graph topology, this tool
    MUST ONLY be called after explicit Human-in-the-Loop (HITL) approval.
    
    Args:
        to_email: Verified recipient email address.
        subject: Concise, compelling email subject line.
        body: The tailored 3-paragraph executive proposal.
        
    Returns:
        Delivery confirmation status and message dispatch ID.
    """
    # Simulate transactional dispatch (SendGrid / Resend API)
    dispatch_id = f"msg_{abs(hash(to_email + subject)) % 1000000:06d}"
    return (
        f"SUCCESS: Email delivered to '{to_email}' with Message ID '{dispatch_id}'."
        f"Subject: '{subject}' | Status: 200 OK."
    )

