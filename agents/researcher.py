"""Company Researcher Worker Agent.
Enterprise Pattern:
- Context Hygiene: Executes private data retrieval tools internally and returns
  only a synthesized intelligence brief into graph state (avoiding token bloat).
"""


from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from config import get_llm
from state import MultiAgentSDRState
from tools import fetch_company_signals, fetch_company_tech_and_hiring
from campaign_profile import DEFAULT_OFFER_PROFILE

def build_researcher_system_prompt(offer_ctx: dict) -> str:
    campaign_type = offer_ctx.get("campaign_type", "OFFER")
    offer_desc = offer_ctx.get("offer_description", DEFAULT_OFFER_PROFILE["offer_description"])

    if campaign_type == "JOB_SEEKER":
        return f"""You are an elite Technical Talent & Engineering Opportunity Researcher.
Your objective is to produce a high-density, factual intelligence brief on the target company for a candidate pitch.
Candidate Focus / Value Pitch:
{offer_desc}

Guidelines:
1. Synthesize the provided signals, tech stack, and hiring data specifically looking for:
   - Engineering stack, cloud infrastructure, AI/ML tools, and frameworks used.
   - Active hiring priorities, engineering expansion, or technical scaling bottlenecks.
   - Specific engineering domain challenges where a skilled engineer can hit the ground running.
2. Keep it factual and concise (maximum 3 punchy bullet points).
3. Do NOT invent facts. Only use the retrieved intelligence.
"""

    return f"""You are an elite B2B Sales Intelligence Researcher.
Your objective is to produce a high-density, factual executive brief on the target company.
Our Offer Context:
{offer_desc}

Guidelines:
1. Synthesize the provided company signals and tech stack/hiring data into key growth vectors,
   technical infrastructure, and active engineering/operational bottlenecks relevant to our offer.
2. Keep it factual and concise (maximum 3 punchy bullet points).
3. Do NOT invent facts. Only use the retrieved intelligence.
"""

RESEARCHER_SYSTEM_PROMPT = build_researcher_system_prompt(DEFAULT_OFFER_PROFILE)

def researcher_node(state: MultiAgentSDRState) -> dict:
    """Worker node that gathers and synthesizes intelligence on the target company."""
    company = state.get("target_company", "")
    offer_ctx = state.get("offer_context") or DEFAULT_OFFER_PROFILE

    # 1. Executes private research tools (isolated sub-context)
    signals = fetch_company_signals.invoke({"company_name": company})
    tech_and_jobs = fetch_company_tech_and_hiring.invoke({"company_name": company})

    # 2. Synthesize using LLM
    llm = get_llm(temperature=0.1)

    system_prompt = build_researcher_system_prompt(offer_ctx)

    user_prompt = f"""Target Company: {company}
Target Role: {state.get("target_role", "")}
Target Contact: {state.get("target_contact_name", "")}

Retrieved Signals: {signals}

Retrieved Tech Stack & Hiring Priorities: {tech_and_jobs}

Synthesize an executive intelligence brief:"""

    response = llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt),
    ])

    research_summary = response.content.strip()

    # 3. Return clean state update
    return {
        "research_summary": research_summary,
        "messages": [
            AIMessage(content=f"[Researcher]: Intelligence gathered for {company}.\n{research_summary}")
        ]
    }
