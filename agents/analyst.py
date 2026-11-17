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
from campaign_profile import DEFAULT_OFFER_PROFILE

def build_analyst_system_prompt(offer_ctx: dict) -> str:
    campaign_type = offer_ctx.get("campaign_type", "OFFER")
    offer_desc = offer_ctx.get("offer_description", DEFAULT_OFFER_PROFILE["offer_description"])
    icp_criteria = offer_ctx.get("target_icp_criteria", DEFAULT_OFFER_PROFILE["target_icp_criteria"])

    if campaign_type == "JOB_SEEKER":
        return f"""You are an expert Technical Recruiter & Career Opportunity Analyst.
Candidate Expertise & Skills:
{offer_desc}

Target Opportunity & Company Criteria:
{icp_criteria}

Evaluation Rubric:
- High Fit (8-10): Fast-growing technology company, startup, or scale-up with an active engineering footprint, modern software/AI stack, and high likelihood of hiring for technical talent matching the candidate's background.
- Moderate Fit (5-7): Established company with some technical infrastructure and engineering roles, but less acute or visible alignment.
- Low Fit / Disqualified (1-4): Non-technical company, brick-and-mortar business, or organizations with zero engineering alignment.

Analyze the research brief and output:
1. An integer fit score from 1 to 10.
2. A concise 2-sentence rationale evaluating fit for this candidate's profile and key alignment points.
"""

    return f"""You are an expert B2B ICP (Ideal Customer Profile) Qualification Analyst.
Our Product / Service Offer:
{offer_desc}

Our Ideal Customer Profile (ICP) Criteria:
{icp_criteria}

Evaluation Rubric:
- High Fit (8-10): Target company matches our ICP criteria closely, with clear scaling indicators, operational bottlenecks, or tech initiatives that our offer directly solves.
- Moderate Fit (5-7): Mid-sized or relevant business with partial alignment to our criteria.
- Low Fit / Disqualified (1-4): Company completely outside our ICP criteria or lacks the technical/operational scale to benefit from our offer.

Analyze the research brief and output:
1. An integer fit score from 1 to 10.
2. A concise 2-sentence rationale explaining acute pain points and qualification decision.
"""

ANALYST_SYSTEM_PROMPT = build_analyst_system_prompt(DEFAULT_OFFER_PROFILE)

class ICPScoreOutput(BaseModel):
    """Structured qualification output schema."""
    score: int = Field(description="Integer score from 1 to 10 evaluating ICP fit", ge=1, le=10)
    rationale: str = Field(description="2-sentence rationale explaining the score and key pain points")

def analyst_node(state: MultiAgentSDRState) -> dict:
    """Worker node that qualifies the account and extracts acute pain points."""
    company = state.get("target_company", "")
    summary = state.get("research_summary", "")
    offer_ctx = state.get("offer_context") or DEFAULT_OFFER_PROFILE

    llm = get_llm(temperature=0.0)
    structured_llm = llm.with_structured_output(ICPScoreOutput)

    system_prompt = build_analyst_system_prompt(offer_ctx)

    user_prompt = f"""Target Company: {company}
Target Role / Contact: {state.get("target_role", "")} ({state.get("target_contact_name", "")})
Executive Research Brief:
{summary}

Evaluate the qualification fit score and rationale:"""
    
    result: ICPScoreOutput = structured_llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])

    role_label = "Career Opportunity" if offer_ctx.get("campaign_type") == "JOB_SEEKER" else "ICP"

    return {
        "icp_fit_score": result.score,
        "icp_rationale": result.rationale,
        "messages": [
            AIMessage(
                content=f"[{role_label} Analyst]: Evaluated {company} -> Score: {result.score}/10.\nRationale: {result.rationale}"
            )
        ],
    }