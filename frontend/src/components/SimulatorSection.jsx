import React, { useState } from 'react';
import { PRESETS } from '../data/presets';

export default function SimulatorSection({ onSelectPreset }) {
  const [activeSimIndex, setActiveSimIndex] = useState(0);
  const activeSim = PRESETS[activeSimIndex];

  return (
    <section id="simulator" style={{ padding: "2rem 0 5rem" }}>
      <div className="section-header">
        <div className="section-eyebrow">Interactive Simulator</div>
        <h2 className="section-title">See Autonomous Decision Making</h2>
        <p className="section-subtitle">
          Select an account archetype below to see how our multi-agent guardrails qualify leads and avoid spamming.
        </p>
      </div>

      <div className="simulator-container">
        <div className="sim-tabs">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              className={`sim-tab-btn ${activeSimIndex === idx ? 'active' : ''}`}
              onClick={() => setActiveSimIndex(idx)}
            >
              <span>{p.company}</span>
              <span className={`tag ${p.tagType}`} style={{ fontSize: "0.68rem" }}>{p.tag}</span>
            </button>
          ))}
        </div>

        <div className="sim-body">
          <div className="sim-spec-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: 700 }}>{activeSim.company}</h3>
                <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{activeSim.role} ({activeSim.email})</div>
              </div>
              <span className={`tag ${activeSim.tagType}`}>{activeSim.tag}</span>
            </div>
            
            <p style={{ fontSize: "0.88rem", color: "var(--text-medium)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              {activeSim.desc}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                <strong>Autonomous Pipeline Behavior:</strong>
              </div>
              <div style={{ fontSize: "0.82rem", color: activeSim.company === "Bob's Bakery" ? "#f87171" : "#34d399" }}>
                {activeSim.company === "Bob's Bakery" 
                  ? "→ Aborts at Step 2 (Analyst). Protects sender reputation & saves tokens."
                  : "→ Qualified. Executes web recon, passes 8/10 Judge, pauses for HITL review."
                }
              </div>
            </div>

            <button 
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => onSelectPreset(activeSim)}
            >
              🚀 Test {activeSim.company} in Live Workspace
            </button>
          </div>

          <div className="sim-code-preview">
            <span style={{ color: "#64748b" }}>// LangGraph State Snapshot ({activeSim.company})</span>{"\n"}
            <span style={{ color: "#38bdf8" }}>target_account:</span> "{activeSim.company}"{"\n"}
            <span style={{ color: "#38bdf8" }}>target_executive:</span> "{activeSim.name} ({activeSim.role})"{"\n"}
            <span style={{ color: "#38bdf8" }}>analyst_score:</span> {activeSim.company === "Bob's Bakery" ? "2/10 [DISQUALIFIED]" : "9/10 [QUALIFIED]"}{"\n"}
            <span style={{ color: "#38bdf8" }}>evaluator_guardrail:</span> {activeSim.company === "Bob's Bakery" ? "SKIPPED_EARLY_EXIT" : "8/10 PASS (Grounding: 9/10, Deliv: 9/10)"}{"\n"}
            <span style={{ color: "#38bdf8" }}>hitl_checkpoint:</span> {activeSim.company === "Bob's Bakery" ? "NONE" : "PAUSED_BEFORE_DISPATCH"}{"\n"}
            <span style={{ color: "#38bdf8" }}>audit_postgres_id:</span> "camp_a7e2b109"
          </div>
        </div>
      </div>
    </section>
  );
}
