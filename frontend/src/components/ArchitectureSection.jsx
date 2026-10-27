import React from 'react';

export default function ArchitectureSection() {
  return (
    <section id="architecture" style={{ padding: "5rem 0 2rem" }}>
      <div className="section-header">
        <div className="section-eyebrow">The Multi-Agent Pipeline</div>
        <h2 className="section-title">Context-Isolated Specialist Swarm</h2>
        <p className="section-subtitle">
          A cyclic LangGraph state machine orchestrating 6 dedicated agents with checkpointed interruption gates.
        </p>
      </div>

      <div className="agents-grid">
        <div className="agent-card">
          <div className="agent-icon-badge" style={{ background: "rgba(6, 182, 212, 0.15)", color: "#06b6d4" }}>🔍</div>
          <div className="agent-title">
            Researcher Agent
            <span className="pill" style={{ fontSize: "0.68rem" }}>Step 1</span>
          </div>
          <p className="agent-desc">
            Executes live DuckDuckGo web recon. Retrieves recent funding rounds, executive transitions, engineering stack clues, and strategic product initiatives.
          </p>
          <div className="agent-spec">Tool: ddgs_search + Web Recon</div>
        </div>

        <div className="agent-card">
          <div className="agent-icon-badge" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>📊</div>
          <div className="agent-title">
            ICP Analyst
            <span className="pill" style={{ fontSize: "0.68rem" }}>Step 2</span>
          </div>
          <p className="agent-desc">
            Evaluates target fit using strict Pydantic schemas. If fit &lt; 7/10, triggers an early exit to protect sender domain and conserve token compute.
          </p>
          <div className="agent-spec">Schema: CampaignDecision</div>
        </div>

        <div className="agent-card">
          <div className="agent-icon-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>✍️</div>
          <div className="agent-title">
            Copywriter Agent
            <span className="pill" style={{ fontSize: "0.68rem" }}>Step 3</span>
          </div>
          <p className="agent-desc">
            Synthesizes tailored outreach referencing verified facts. Strictly under 120 words with zero spam buzzwords and single specific call-to-actions.
          </p>
          <div className="agent-spec">Model: openai/gpt-oss-20b</div>
        </div>

        <div className="agent-card">
          <div className="agent-icon-badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" }}>🛡️</div>
          <div className="agent-title">
            AI Quality Judge
            <span className="pill" style={{ fontSize: "0.68rem" }}>Step 4</span>
          </div>
          <p className="agent-desc">
            Actor-critic evaluator. Checks factual grounding against research notes and deliverability rules. Discards hallucinated claims before human eyes see them.
          </p>
          <div className="agent-spec">Guardrail: Actor-Critic Evaluator</div>
        </div>

        <div className="agent-card" style={{ borderColor: "var(--warning-border)" }}>
          <div className="agent-icon-badge" style={{ background: "rgba(245, 158, 11, 0.2)", color: "#f59e0b" }}>⏸️</div>
          <div className="agent-title">
            Human Review Gate
            <span className="pill" style={{ fontSize: "0.68rem" }}>Step 5</span>
          </div>
          <p className="agent-desc">
            LangGraph checkpoint interrupt. Pauses execution before dispatcher. Humans can approve, manually edit the email, or provide critique for AI re-drafts.
          </p>
          <div className="agent-spec">Gate: interrupt_before=["dispatcher"]</div>
        </div>

        <div className="agent-card">
          <div className="agent-icon-badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>🐘</div>
          <div className="agent-title">
            Durable Dispatcher
            <span className="pill" style={{ fontSize: "0.68rem" }}>Step 6</span>
          </div>
          <p className="agent-desc">
            Dispatches approved proposal to destination webhook and writes immutable audit checkpoints into PostgreSQL with zero state loss.
          </p>
          <div className="agent-spec">Ledger: PostgreSQL Checkpointer</div>
        </div>
      </div>
    </section>
  );
}
