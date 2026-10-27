import React from 'react';

export default function Hero({ onNavigate }) {
  return (
    <section className="hero-section">
      <div className="hero-eyebrow">
        <span>🛡️</span>
        <span>LangGraph + Groq + PostgreSQL • Human-in-the-Loop Governance</span>
      </div>

      <h1 className="hero-heading">
        High-Precision Outbound SDR Teams. <br />
        <span className="gradient-text">Orchestrated with Autonomous AI.</span>
      </h1>

      <p className="hero-subhead">
        Replace generic cold spam with context-isolated AI agents. Real-time web reconnaissance, deterministic ICP qualification, factually grounded copywriting, and unbreakable human review gates.
      </p>

      <div className="hero-cta-group">
        <button 
          className="btn btn-primary btn-lg"
          onClick={() => onNavigate("workspace")}
        >
          🚀 Try It Live — Launch Workspace
        </button>
        <a 
          className="btn btn-secondary btn-lg"
          href="#architecture"
        >
          Inspect Swarm Architecture
        </a>
      </div>

      {/* Hero Proof Metrics */}
      <div className="hero-stats-row">
        <div className="stat-card">
          <div className="stat-number">98.4%</div>
          <div className="stat-label">Factual Grounding Score</div>
          <div className="stat-subtext">Actor-Critic LLM judge guarantees zero hallucinated claims.</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">&lt; 120 Words</div>
          <div className="stat-label">High-Deliverability Pitch</div>
          <div className="stat-subtext">Zero buzzword spam, optimized for primary inbox delivery.</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">100%</div>
          <div className="stat-label">Audit Durability</div>
          <div className="stat-subtext">Every state transition persisted in Docker PostgreSQL.</div>
        </div>
      </div>
    </section>
  );
}
