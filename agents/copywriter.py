"""Executive Outbound Copywriter Worker Agent.
Enterprise Pattern:
- Factual Grounding: Strictly references verified signals from the research brief.
- High-Converting B2B Structure: 3 concise paragraphs (Hook -> Value Prop -> Low-friction CTA).
"""


from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from config import get_llm
from state import MultiAgentSDRState

COPYWRITER_SYSTEM_PROMPT = """You are a world-class Enterprise B2B SDR Copywriter specializing in hyper-personalized executive outreach.
Email Rules:
1. Paragraph 1 (The Hook): Acknowledge a specific verified initiative, hiring signal, or expansion from the research brief.
2. Paragraph 2 (The Value Prop): Tie their specific bottleneck directly to how our Enterprise Agentic AI platform solves it.
3. Paragraph 3 (Low-friction Call to Action): A polite, low-friction ask (e.g., "Open to exploring how team X is handling this?").
4. Keep the entire email under 120 words. No buzzwords, no cheesy sales fluff.
5. Include a clear 'Subject: ...' line at the very top.
"""

def copywriter_node(state: MultiAgentSDRState) -> dict:
    """Worker node that drafts a hyper-personalized 3-paragraph executive proposal."""
    company = state.get("target_company", "")
    role = state.get("target_role", "Executive")
    name = state.get("target_contact_name", "")
    research = state.get("research_summary", "")
    rationale = state.get("icp_rationale", "")

    llm = get_llm(temperature=0.2)

    user_prompt = f"""Target Prospect: {name} ({role} at {company})

    Verified research intelligence: {research}

    ICP Qualification & Pain Points: {rationale}

    Draft the tailored 3-paragraph cold outreach email:
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