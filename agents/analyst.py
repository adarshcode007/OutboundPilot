"""ICP Fit Analyst Worker Agent.
Enterprise Pattern:
- Objective Lead Qualification: Evaluates account against strict ICP criteria.
- Structured Evaluation: Produces a score (1-10) and an explicit business rationale,
  allowing the supervisor to make deterministic disqualification decisions.
"""

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from pydantic import BaseModel, Field
from config import get_llm
from state import MultiAgentSDRState

ANALYST_SYSTEM_PROMPT = """You are an expert B2B ICP (Ideal Customer Profile) Qualification Analyst.
Our Product: Enterprise Agentic AI Infrastructure & Workflow Automation.
Our Ideal Customer Profile (ICP):
- High Fit (8-10): High-growth tech, fintech, cloud, or enterprise SaaS companies with scaling
  infrastructure, active AI/distributed systems hiring, and complex operational bottlenecks.
- Moderate Fit (5-7): Mid-sized digital businesses with some tech stack and software hiring.
- Low Fit / Disqualified (1-4): Brick-and-mortar local businesses, non-technical companies, or
  firms with no software engineering footprint.
Analyze the research brief and output:
1. An integer fit score from 1 to 10.
2. A concise 2-sentence rationale explaining acute pain points and qualification decision.
"""

class ICPScoreOutput(BaseModel):
    """Structured qualification output schema."""
    score: int = Field(description="Integer score from 1 to 10 evaluating ICP fit", ge=1, le=10)
    rationale: str = Field(description="2-sentence rationale explaining the score and key pain points")

def analyst_node(state: MultiAgentSDRState) -> dict:
    """Worker node that qualifies the account and extracts acute pain points."""
    company = state.get("target_company", "")
    summary = state.get("research_summary", "")

    llm = get_llm(temperature=0.0)
    structured_llm = llm.with_structured_output(ICPScoreOutput)

    user_prompt = f"""Target Company: {company}
        Executive Research Brief:
        {summary}
        Evaluate the ICP fit score and rationale:"""
    
    result: ICPScoreOutput = structured_llm.invoke([
        SystemMessage(content=ANALYST_SYSTEM_PROMPT),
        HumanMessage(content=user_prompt)
    ])

    return {
        "icp_fit_score": result.score,
        "icp_rationale": result.rationale,
        "messages": [
            AIMessage(
                content=f"[ICP Analyst]: Evaluated {company} -> Score: {result.score}/10.\nRationale: {result.rationale}"
            )
        ],
    }