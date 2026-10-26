"""Autonomous Outbound SDR - Interactive Operator CLI.

Enterprise Application Runner:
- Provides an interactive console interface for B2B sales teams.
- Demonstrates deterministic lead qualification, token-saving early exits,
  and Human-in-the-Loop review gates.
"""

import sys
import uuid
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, SystemMessage
from graph import build_sdr_graph
from config import get_llm
from agents.copywriter import COPYWRITER_SYSTEM_PROMPT
from psycopg_pool import ConnectionPool
from langgraph.checkpoint.postgres import PostgresSaver
import os

# Pre-configured B2B Test Profiles
PRESET_ACCOUNTS = {
    "1": {
        "title": "High-Fit Enterprise Lead (Stripe - AI & Payments)",
        "company": "Stripe",
        "role": "Head of Engineering",
        "name": "David",
        "email": "david@stripe.com",
    },
    "2": {
        "title": "High-Fit Enterprise Lead (Datadog - Cloud & Observability)",
        "company": "Datadog",
        "role": "VP of Observability",
        "name": "Alexis",
        "email": "alexis@datadog.com",
    },
    "3": {
        "title": "Poor-Fit Lead (Bob's Bakery - Disqualification Test)",
        "company": "Bob's Bakery",
        "role": "Owner",
        "name": "Bob",
        "email": "bob@bobsbakery.com",
    },
}

def print_banner():
    print("\n" + "=" * 70)
    print("      🚀 AUTONOMOUS B2B DIGITAL SDR - CAMPAIGN WORKFORCE")
    print("=" * 70)
    print(" Architecture: LangGraph Multi-Agent StateGraph with HITL Checkpointing")
    print(" LLM Engine:   openai/gpt-oss-20b via Groq")
    print("=" * 70)

def run_campaign_interactive(company: str, role: str, name: str, email: str):
    """Execute a campaign with interactive Human-in-the-Loop review."""
    print(f"\n[*] Initiating campaign for: {name} ({role} at {company})")
    print(f"[*] Target Email: {email}")

    # 1. Compile graph with checkpointer and safety gate
    postgres_uri = os.getenv("POSTGRES_URI", "").strip()
    checkpointer = None

    if postgres_uri:
        try:
            pool = ConnectionPool(conninfo=postgres_uri, max_size=10, kwargs={"autocommit": True})
            checkpointer = PostgresSaver(pool)
            checkpointer.setup()
            print("  [✓] Connected to PostgreSQL Checkpointer (Docker)")
        except Exception as e:
            print(f"  [!] Postgres unavailable ({e}), using MemorySaver fallback.")
            checkpointer = MemorySaver()
    else:
        checkpointer = MemorySaver()

    app = build_sdr_graph(checkpointer=checkpointer, interrupt_before=["dispatcher"])

    thread_id = f"campaign-{uuid.uuid4().hex[:8]}"
    thread_config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "messages": [HumanMessage(content=f"Launch campaign for {name} at {company}")],
        "target_company": company,
        "target_role": role,
        "target_contact_name": name,
        "target_contact_email": email,
        "research_summary": "",
        "icp_fit_score": 0,
        "icp_rationale": "",
        "email_draft": "",
        "next_step": "researcher",
        "approval_status": "PENDING",
    }

    print("\n[Stage 1] Executing autonomous intelligence pipeline...")
    app.invoke(initial_state, config=thread_config)

    # 2. Inspect state snapshot
    snapshot = app.get_state(thread_config)
    icp_score = snapshot.values.get("icp_fit_score", 0)
    rationale = snapshot.values.get("icp_rationale", "")
    research = snapshot.values.get("research_summary", "")
    draft = snapshot.values.get("email_draft", "")

    # Display intelligence brief
    print("\n" + "-" * 70)
    print(f"📊 EXECUTIVE INTELLIGENCE BRIEF: {company.upper()}")
    print("-" * 70)
    print(f"Research Summary:\n{research}\n")
    print(f"ICP Fit Score: {icp_score}/10")
    print(f"ICP Rationale: {rationale}")
    print("-" * 70)

    # Check if lead was automatically disqualified
    if icp_score < 5:
        print("\n🛑 [CAMPAIGN TERMINATED EARLY: LEAD DISQUALIFIED]")
        print(f"  Reason: Account score ({icp_score}/10) is below qualification threshold (5/10).")
        print("  Token Savings: No email was drafted, preserving LLM cost and sales rep time.")
        return
    
    # 3. Human-in-the-Loop Safety Gate
    print("\n" + "=" * 70)
    print("⏸️  HUMAN-IN-THE-LOOP SAFETY GATE: ACTION REQUIRED")
    print("=" * 70)
    print(f"Target Recipient: {email}")
    print(f"\nProposed Email Proposal:\n\n{draft}\n")
    print("-" * 70)

    while True:
        choice = input("\nSelect Action: [A]pprove & Send | [E]dit / Re-draft | [R]eject Lead: ").strip().upper()

        if choice == "A":
            print("\n[✓] Approved! Resuming graph to execute outbound dispatch...")
            final_state = app.invoke(None, config=thread_config)
            print("\n[Campaign Execution Receipt]")
            print(f"  {final_state['messages'][-1].content}")
            print(f"  Status: {final_state['approval_status']}")
            break

        elif choice == "E":
            print("\n--- EDIT OPTIONS ---")
            print("  [1] Ask AI Copywriter to Re-draft with your feedback")
            print("  [2] Append Manual Text / P.S.")
            sub_choice = input("Select (1 or 2): ").strip()

            if sub_choice == "1":
                critique = input("\nEnter feedback for AI Copywriter (e.g. 'Make it punchier, mention SOC2'): ").strip()
                if critique:
                    print("\n[*] Asking Copywriter to revise pitch based on your feedback...")
                    llm = get_llm(temperature=0.3)
                    revision_prompt = f"""Target Company: {company}
                        Current Draft:
                        {draft}
                        Sales Manager Critique:
                        {critique}
                        Rewrite the 3-paragraph executive cold outreach email incorporating the manager's critique:"""

                    new_draft_resp = llm.invoke([
                        SystemMessage(content=COPYWRITER_SYSTEM_PROMPT),
                        HumanMessage(content=revision_prompt),
                    ])
                    draft = new_draft_resp.content.strip()

                    # Update checkpointer with new AI draft
                    app.update_state(thread_config, {"email_draft": draft})
                    print("\n" + "-" * 70)
                    print(f"📝 REVISED PROPOSAL BASED ON YOUR CRITIQUE:\n\n{draft}\n")
                    print("-" * 70)
                    # Loop continues, allowing you to Approve [A], Edit again [E], or Reject [R]!

            elif sub_choice == "2":
                edit_text = input("Enter custom text or P.S. to append: ").strip()
                if edit_text:
                    draft = draft + f"\n\nP.S. {edit_text}"
                    app.update_state(thread_config, {"email_draft": draft})
                    print("\n" + "-" * 70)
                    print(f"📝 UPDATED PROPOSAL:\n\n{draft}\n")
                    print("-" * 70)

        elif choice == "R":
            print("\n[X] Campaign rejected by sales lead.")
            app.update_state(thread_config, {"approval_status": "REJECTED", "next_step": "FINISH"})
            print("  ✓ Account status marked as REJECTED in campaign state. Email NOT sent.")
            break

        else:
            print("Invalid option. Please enter 'A', 'E', or 'R'.")


def main():
    print_banner()

    while True:
        print("\nSelect a Campaign Scenario:")
        print("  [1] High-Fit Enterprise (Stripe - $1T Volumes & AI Radar)")
        print("  [2] High-Fit Enterprise (Datadog - Cloud & Observability)")
        print("  [3] Disqualification Test (Bob's Bakery - Local Business)")
        print("  [4] Custom Prospect Input")
        print("  [5] Exit")

        selection = input("\nEnter choice (1-5): ").strip()

        if selection in ["1","2","3"]:
            acc = PRESET_ACCOUNTS[selection]
            run_campaign_interactive(
                company=acc["company"],
                role=acc["role"],
                name=acc["name"],
                email=acc["email"],
            )
        elif selection == "4":
            print("\nEnter Custom Prospect Details:")
            comp = input("  Company Name:  ").strip()
            role = input("  Target Role:   ").strip()
            name = input("  Contact Name:  ").strip()
            mail = input("  Contact Email: ").strip()
            if comp and mail:
                run_campaign_interactive(comp, role, name, mail)
            else:
                print("Error: Company Name and Contact Email are required.")
        elif selection == "5":
            print("\nExisting Digital SDR Workforce. Goodbye!")
            sys.exit(0)
        else:
            print("Invalid selection. Choose between 1 and 5.")

if __name__ == "__main__":
    main()