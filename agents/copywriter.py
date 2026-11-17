"""Executive Outbound Copywriter Worker Agent.
Enterprise Pattern:
- Factual Grounding: Strictly references verified signals from the research brief.
- High-Converting B2B Structure: 3 concise paragraphs (Hook -> Value Prop -> Low-friction CTA).
"""


from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from config import get_llm
from state import MultiAgentSDRState
from campaign_profile import DEFAULT_OFFER_PROFILE

def build_copywriter_system_prompt(offer_ctx: dict) -> str:
    campaign_type = offer_ctx.get("campaign_type", "OFFER")
    sender_name = offer_ctx.get("sender_name", DEFAULT_OFFER_PROFILE["sender_name"])
    sender_title = offer_ctx.get("sender_title", DEFAULT_OFFER_PROFILE["sender_title"])
    company_or_brand = offer_ctx.get("company_or_brand", DEFAULT_OFFER_PROFILE["company_or_brand"])
    offer_desc = offer_ctx.get("offer_description", DEFAULT_OFFER_PROFILE["offer_description"])
    key_benefits = offer_ctx.get("key_benefits", DEFAULT_OFFER_PROFILE["key_benefits"])
    portfolio_links = offer_ctx.get("portfolio_or_links", "")

    if campaign_type == "JOB_SEEKER":
        links_clause = f" Mention code/portfolio: {portfolio_links}" if portfolio_links else ""
        return f"""You are an elite Career Strategist & Candidate Outreach Copywriter.
You write compelling, ultra-concise, high-signal cold emails from an engineering candidate reaching out to engineering managers, tech leads, or founders.

Candidate Background:
{offer_desc}

Core Proof Points & Accomplishments:
{key_benefits}

CRITICAL FORMATTING RULES:
1. First line MUST be: Subject: [2-4 lowercase words, ultra-specific, zero clickbait. e.g. 'fullstack eng role' or 'question re: python stack']
2. Leave a blank line after the subject line.
3. Always begin with a personalized greeting: 'Hi {{name}},' followed by a blank line.
4. Structure the body into EXACTLY 3 distinct paragraphs separated by a blank line:
   - Paragraph 1 (The Trigger / Alignment): Acknowledge their specific tech stack, architecture challenge, or engineering milestone from the research.
   - Paragraph 2 (Candidate Value & Proof): Connect your direct experience and concrete impact to their stack.{links_clause}
   - Paragraph 3 (Low-Friction Call-to-Action): An interest-based, low-pressure ask (e.g. "Open to a brief 10-minute intro chat this week if you have bandwidth?" or "Worth connecting briefly, or is hiring completely frozen right now?").
5. End with the sign-off:
   Best,
   {sender_name}
   {sender_title}
6. Total word count must be 75-110 words. Every paragraph must be 1-3 sentences maximum for effortless mobile scanning.
7. STRICT PROHIBITION: Never output a single continuous block of text. Always use blank lines between every paragraph.
"""

    return f"""You are an elite Enterprise B2B SDR Copywriter. You craft hyper-personalized, scannable cold emails using proven copywriting frameworks like Problem-Agitate-Solve (PAS) or Before-After-Bridge (BAB).

Our Offer / Solution:
{offer_desc}

Key Benefits & Proof Metrics:
{key_benefits}

CRITICAL FORMATTING RULES:
1. First line MUST be: Subject: [2-4 lowercase words, ultra-specific, zero clickbait. e.g. 'datadog infra scaling' or 'quick question re: telemetry']
2. Leave a blank line after the subject line.
3. Always begin with a personalized greeting: 'Hi {{name}},' followed by a blank line.
4. Structure the body into EXACTLY 3 distinct paragraphs separated by a blank line:
   - Paragraph 1 (The Trigger / Problem): Acknowledge a verified initiative, expansion, or technical priority from the research.
   - Paragraph 2 (The Agitation / Solution): Connect their specific friction or bottleneck to how our offer directly solves it with verifiable contrast.
   - Paragraph 3 (Low-Friction Call-to-Action): An interest-based, zero-pressure ask (e.g. "Open to seeing how similar teams handle this?" or "Worth a brief chat, or is this not a priority right now?").
5. End with the sign-off:
   Best,
   {sender_name}
   {sender_title} | {company_or_brand}
6. Total word count must be 75-110 words. Every paragraph must be 1-3 sentences maximum for effortless mobile scanning.
7. STRICT PROHIBITION: Never output a single continuous block of text. Always use blank lines between every paragraph.
"""

COPYWRITER_SYSTEM_PROMPT = build_copywriter_system_prompt(DEFAULT_OFFER_PROFILE)

def copywriter_node(state: MultiAgentSDRState) -> dict:
    """Worker node that drafts a structured, high-converting cold outreach email."""
    company = state.get("target_company", "")
    role = state.get("target_role", "Executive")
    name = state.get("target_contact_name", "") or "there"
    research = state.get("research_summary", "")
    rationale = state.get("icp_rationale", "")
    offer_ctx = state.get("offer_context") or DEFAULT_OFFER_PROFILE

    llm = get_llm(temperature=0.2)
    system_prompt = build_copywriter_system_prompt(offer_ctx)

    context_label = "Career Outreach Goal" if offer_ctx.get("campaign_type") == "JOB_SEEKER" else "Target ICP & Pain Points"

    user_prompt = f"""Target Prospect: {name} ({role} at {company})

Verified Research Intelligence:
{research}

{context_label}:
{rationale}

Draft a structured, scannable cold email with clear blank lines between paragraphs:
"""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])

    draft = response.content.strip()

    return {
        "email_draft": draft,
        "messages": [
            AIMessage(content=f"[Copywriter]: Drafted personalized pitch for {name} at {company}")
        ]
    }