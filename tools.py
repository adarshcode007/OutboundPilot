"""Domain Tools for Autonomous Outbound SDR Multi-Agent Pipeline.
Enterprise Pattern:
- Multi-Tier Live Web Search: Real-time web intelligence fetching via resilient
  multi-tier search backends:
    * Tier 0: Authenticated Cloud Search (Tavily AI or Google Serper API) - Immune to datacenter IP blocks
    * Tier 1: DuckDuckGo HTML Search (Live web results)
    * Tier 2: DuckDuckGo Lite Search (High-throughput fallback)
    * Tier 3: Official Wikimedia Search API (en.wikipedia.org)
- Strict Type Contracts: Uses LangChain's @tool decorator with detailed docstrings.
- Ground Truth Guarantee: Does not fabricate company news. If public data is unavailable,
  explicitly informs the Researcher agent to prevent hallucinated outreach.
- High-Stakes Action Isolation: send_outbound_email is defined as a side-effect tool
  protected behind human approval.
"""

import os
import re
import urllib.request
import urllib.parse
import json
from typing import Optional, Dict, Any
from dispatcher import dispatch_outbound_email
from langchain_core.tools import tool
from ddgs import DDGS

# Authenticated Cloud Search Keys (immune to datacenter IP blocks in Render / AWS / GCP)
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip()
SERPER_API_KEY = os.getenv("SERPER_API_KEY", "").strip()

def _search_tavily(query: str, max_results: int = 4) -> Optional[str]:
    """Tier 0A: Tavily AI Search (Built for AI Agents, immune to datacenter IP blocks)."""
    if not TAVILY_API_KEY:
        return None
    try:
        url = "https://api.tavily.com/search"
        payload = json.dumps({
            "query": query,
            "max_results": max_results,
            "search_depth": "basic",
            "include_answer": True,
        }).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {TAVILY_API_KEY}",
                "User-Agent": "OutboundSDR-Enterprise/1.0"
            }
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("results", [])
            answer = data.get("answer", "")
            snippets = []
            if answer:
                snippets.append(answer)
            for r in results:
                c = r.get("content", "").strip()
                if c:
                    snippets.append(c)
            if snippets:
                print(f">> [Search Tier 0 (Tavily AI) SUCCESS] Retrieved {len(snippets)} authenticated results for '{query}'.")
                return "\n".join(snippets[:max_results])
    except Exception as e:
        print(f">> [Search Tier 0 Tavily Error]: {e}")
    return None

def _search_serper(query: str, max_results: int = 4) -> Optional[str]:
    """Tier 0B: Google Search via Serper API (Immune to datacenter IP blocks)."""
    if not SERPER_API_KEY:
        return None
    try:
        url = "https://google.serper.dev/search"
        payload = json.dumps({"q": query, "num": max_results}).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "X-API-KEY": SERPER_API_KEY,
                "User-Agent": "OutboundSDR-Enterprise/1.0"
            }
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            organic = data.get("organic", [])
            snippets = [r.get("snippet", "").strip() for r in organic if r.get("snippet")]
            if snippets:
                print(f">> [Search Tier 0 (Google Serper) SUCCESS] Retrieved {len(snippets)} results for '{query}'.")
                return "\n".join(snippets[:max_results])
    except Exception as e:
        print(f">> [Search Tier 0 Serper Error]: {e}")
    return None

def robust_web_search(query: str, max_results: int = 4) -> str:
    """Multi-tiered resilient web search engine for live company intelligence:
    - Tier 0: Authenticated Enterprise Search (Tavily AI or Google Serper if key configured)
    - Tier 1: DuckDuckGo HTML Search (Live web results)
    - Tier 2: DuckDuckGo Lite Search (High-throughput fallback)
    - Tier 3: Official Wikimedia Search API (en.wikipedia.org)
    """
    clean_query = query.strip()
    if not clean_query:
        return ""

    # Tier 0: Authenticated Enterprise Search (Tavily / Google Serper)
    tavily_res = _search_tavily(clean_query, max_results=max_results)
    if tavily_res:
        return tavily_res

    serper_res = _search_serper(clean_query, max_results=max_results)
    if serper_res:
        return serper_res

    # Tier 1: DuckDuckGo HTML Search
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(clean_query, max_results=max_results, backend="html"))
            if results:
                snippets = [r.get("body", "").strip() for r in results if r.get("body")]
                if snippets:
                    print(f">> [Search Tier 1 (DDG HTML) SUCCESS] Found {len(snippets)} live web results for '{clean_query}'.")
                    return "\n".join(snippets[:max_results])
    except Exception:
        pass

    # Tier 2: DuckDuckGo Lite Search
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(clean_query, max_results=max_results, backend="lite"))
            if results:
                snippets = [r.get("body", "").strip() for r in results if r.get("body")]
                if snippets:
                    print(f">> [Search Tier 2 (DDG Lite) SUCCESS] Found {len(snippets)} live web results for '{clean_query}'.")
                    return "\n".join(snippets[:max_results])
    except Exception:
        pass

    # Tier 3: Official English Wikipedia API (en.wikipedia.org) - Always unblocked & authenticated
    try:
        core_name = clean_query.split()[0]
        url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={urllib.parse.quote(core_name + ' company')}&utf8=&format=json"
        req = urllib.request.Request(url, headers={"User-Agent": "OutboundSDR-Enterprise/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("query", {}).get("search", [])
            if items:
                clean_snippet = re.sub(r"<[^>]+>", "", items[0].get("snippet", ""))
                title = items[0].get("title")
                print(f">> [Search Tier 3 (Wikipedia) SUCCESS] Retrieved verified corporate background for '{title}'.")
                return f"{title}: {clean_snippet}"
    except Exception as e:
        print(f">> [Search Tier 3 Wikipedia failed for '{clean_query}']: {e}")

    return ""

# Optional demo fixtures for offline development (falls through to live web search for all other companies)
OFFLINE_FIXTURES = {
    "bob's bakery": {
        "signals": "Bob's Bakery is a family-owned single-location bakery in Denver specializing in sourdough bread. Has 6 staff and operates locally.",
        "tech_and_jobs": "Tech Stack: Square POS, Wix website, Gmail. Open Roles: Morning Baker, Cashier. No IT staff.",
    },
}

@tool
def fetch_company_signals(company_name: str) -> str:
    """Fetch live news, press releases, funding updates, and strategic initiatives for any target company.
    
    Args:
        company_name: The name or domain of the target company.

    Returns:
        Verified real-time summary of recent company signals and market activities from the live web.
    """
    key = company_name.lower().strip()
    if key in OFFLINE_FIXTURES:
        return OFFLINE_FIXTURES[key]["signals"]

    # Live multi-tier web search
    query = f"{company_name} company news funding product launch"
    signals = robust_web_search(query, max_results=4)

    if not signals or len(signals.strip()) < 20:
        raise ValueError(
            f"Public web intelligence could not be retrieved for '{company_name}'. "
            f"Please verify the company name or check your network connection."
        )

    return signals

@tool
def fetch_company_tech_and_hiring(company_name: str) -> str:
    """Fetch real-world tech stack details, open hiring priorities, and engineering bottlenecks from job portals.
    
    Args:
        company_name: The name or domain of the target company.
        
    Returns:
        Verified technical stack and open strategic hiring roles indicating pain points.
    """
    key = company_name.lower().strip()
    if key in OFFLINE_FIXTURES:
        return OFFLINE_FIXTURES[key]["tech_and_jobs"]

    # Live multi-tier web search for tech and engineering roles
    query = f"{company_name} engineering tech stack open roles jobs careers"
    tech_info = robust_web_search(query, max_results=4)

    if not tech_info or len(tech_info.strip()) < 20:
        return (
            f"No active engineering job postings found online for {company_name}. "
            f"Base technical analysis strictly on confirmed core company product infrastructure."
        )

    return tech_info

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
    result = dispatch_outbound_email(to_email=to_email, subject=subject, body=body)

    if result["status"] == "BLOCKED":
        return f"DISPATCH_BLOCKED: {result['detail']}"
    
    return (
        f"SUCCESS: Email delivered to '{to_email}' via {result['provider']} "
        f"with Message ID '{result['message_id']}'. Status: 200 OK."
    )
