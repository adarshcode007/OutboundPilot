"""Executive Outbound Copywriter Worker Agent.
Enterprise Pattern:
- Factual Grounding: Strictly references verified signals from the research brief.
- High-Converting B2B Structure: 3 concise paragraphs (Hook -> Value Prop -> Low-friction CTA).
"""


from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from config import get_llm
from state import MultiAgentSDRState

COPYWRITER_SYSTEM_PROMPT = """You are an elite Enterprise B2B SDR Copywriter. You craft hyper-personalized, scannable cold emails using proven copywriting frameworks like Problem-Agitate-Solve (PAS) or Before-After-Bridge (BAB).

CRITICAL FORMATTING RULES:
1. First line MUST be: Subject: [2-4 lowercase words, ultra-specific, zero clickbait. e.g. 'datadog infra scaling' or 'quick question re: telemetry']
2. Leave a blank line after the subject line.
3. Always begin with a personalized greeting: 'Hi {name},' followed by a blank line.
4. Structure the body into EXACTLY 3 distinct paragraphs separated by a blank line:
   - Paragraph 1 (The Trigger / Problem): Acknowledge a verified initiative, expansion, or technical priority from the research.
   - Paragraph 2 (The Agitation / Solution): Connect their specific friction or bottleneck to how our Enterprise Agentic AI platform eliminates it with verifiable contrast.
   - Paragraph 3 (Low-Friction Call-to-Action): An interest-based, zero-pressure ask (e.g. "Open to seeing how similar teams handle this?" or "Worth a brief chat, or is this not a priority right now?").
5. End with a professional sign-off:
   Best,
   David
6. Total word count must be 75-110 words. Every paragraph must be 1-3 sentences maximum for effortless mobile scanning.
7. STRICT PROHIBITION: Never output a single continuous block of text. Always use blank lines between every paragraph.
"""

def copywriter_node(state: MultiAgentSDRState) -> dict:
    """Worker node that drafts a structured, high-converting cold outreach email."""
    company = state.get("target_company", "")
    role = state.get("target_role", "Executive")
    name = state.get("target_contact_name", "") or "there"
    research = state.get("research_summary", "")
    rationale = state.get("icp_rationale", "")

    llm = get_llm(temperature=0.2)

    user_prompt = f"""Target Prospect: {name} ({role} at {company})

Verified Research Intelligence:
{research}

ICP Qualification & Key Pain Points:
{rationale}

Draft a structured, scannable B2B cold email using the PAS (Problem-Agitate-Solve) or BAB (Before-After-Bridge) framework with clear blank lines between paragraphs:
"""

    response = llm.invoke([
        SystemMessage(content=COPYWRITER_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt)
    ])

    draft = response.content.strip()

    return {
        "email_draft": draft,
        "messages": [
            AIMessage(content=f"[Copywriter]: Drafted personalized pitch for {name} at {company}")
        ]
    }