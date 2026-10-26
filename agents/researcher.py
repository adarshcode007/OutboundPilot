"""Company Researcher Worker Agent.
Enterprise Pattern:
- Context Hygiene: Executes private data retrieval tools internally and returns
  only a synthesized intelligence brief into graph state (avoiding token bloat).
"""


from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from config import get_llm
from state import MultiAgentSDRState
from tools import fetch_company_signals, fetch_company_tech_and_hiring

RESEARCHER_SYSTEM_PROMPT = """You are an elite B2B Sales Intelligence Researcher.
Your objective is to produce a high-density, factual executive brief on the target company.
Guidelines:
1. Synthesize the provided company signals and tech stack/hiring data into key growth vectors,
   technical infrastructure, and active engineering bottlenecks.
2. Keep it factual and concise (maximum 3 concise bullet points).
3. Do NOT invent facts. Only use the retrieved intelligence.
"""

def researcher_node(state: MultiAgentSDRState) -> dict:
    """Worker node that gathers and synthesizes intelligence on the target company."""
    company = state.get("target_company", "")

    # 1. Executes private research tools (isolated sub-context)
    signals = fetch_company_signals.invoke({"company_name": company})
    tech_and_jobs = fetch_company_tech_and_hiring.invoke({"company_name": company})

    # 2. Synthesize using LLM
    llm = get_llm(temperature=0.1)

    user_prompt = f"""Target Company: {company}

    Retrieved Signals: {signals}

    Retrieved Tech Stack & Hiring Priorities: {tech_and_jobs}

    Synthesize and executive intelligence brief.
    """

    response = llm.invoke([
        SystemMessage(content=RESEARCHER_SYSTEM_PROMPT),
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
