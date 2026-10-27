import React, { useState, useEffect } from 'react';
import { PRESETS } from '../data/presets';

const API_URL = typeof window !== 'undefined' && window.location.port === "5173" ? "" : "http://localhost:8000";

export default function CommandCenter({ onNavigate, selectedPreset }) {
  // Ingestion Form State
  const [company, setCompany] = useState(selectedPreset ? selectedPreset.company : "Stripe");
  const [role, setRole] = useState(selectedPreset ? selectedPreset.role : "Head of Engineering");
  const [name, setName] = useState(selectedPreset ? selectedPreset.name : "David");
  const [email, setEmail] = useState(selectedPreset ? selectedPreset.email : "david@stripe.com");

  // If selectedPreset changes from outside, update form state
  useEffect(() => {
    if (selectedPreset) {
      setCompany(selectedPreset.company);
      setRole(selectedPreset.role);
      setName(selectedPreset.name);
      setEmail(selectedPreset.email);
    }
  }, [selectedPreset]);

  // Campaign Lifecycle State
  const [threadId, setThreadId] = useState(null);
  const [campaignState, setCampaignState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [campaignHistory, setCampaignHistory] = useState([]);

  // HITL Review State
  const [editableDraft, setEditableDraft] = useState("");
  const [critique, setCritique] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);

  // Fetch PostgreSQL campaign history
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/campaigns`);
      if (res.ok) {
        const data = await res.json();
        setCampaignHistory(data.campaigns || []);
      }
    } catch (e) {
      console.warn("Could not reach backend:", e);
    }
  };

  // Poll current campaign state
  useEffect(() => {
    if (!threadId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/api/campaign/${threadId}`);
        if (res.ok) {
          const data = await res.json();
          setCampaignState(data);
          if (data.email_draft && !editableDraft) {
            setEditableDraft(data.email_draft);
          }

          if (
            data.is_paused_at_gate ||
            data.ui_status === "DISQUALIFIED" ||
            data.ui_status === "DISPATCHED" ||
            data.ui_status === "REJECTED"
          ) {
            clearInterval(interval);
            setLoading(false);
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [threadId, editableDraft]);

  // Launch Campaign
  const handleStart = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setCampaignState(null);
    setEditableDraft("");
    setStatusNotice(null);

    try {
      const res = await fetch(`${API_URL}/api/campaign/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role, contact_name: name, contact_email: email })
      });

      if (!res.ok) throw new Error("Failed to start campaign");
      const data = await res.json();
      setThreadId(data.thread_id);
      fetchHistory();
    } catch (err) {
      alert("Could not connect to FastAPI backend at " + API_URL + ". Ensure uvicorn is running.");
      setLoading(false);
    }
  };

  // Handle Human-in-the-Loop Actions
  const handleAction = async (actionType) => {
    setActionLoading(true);
    setStatusNotice(null);

    try {
      const payload = {
        action: actionType,
        edited_draft: editableDraft,
        critique: critique
      };

      const res = await fetch(`${API_URL}/api/campaign/${threadId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (actionType === "REDRAFT") {
        setEditableDraft(data.revised_draft);
        setCritique("");
        setStatusNotice("✓ AI Copywriter revised proposal based on your feedback!");
        const stateRes = await fetch(`${API_URL}/api/campaign/${threadId}`);
        setCampaignState(await stateRes.json());
      } else {
        setStatusNotice(data.message || "Action processed successfully.");
        const stateRes = await fetch(`${API_URL}/api/campaign/${threadId}`);
        setCampaignState(await stateRes.json());
      }
    } catch (err) {
      alert("Action failed: " + err.message);
    } finally {
      setActionLoading(false);
      fetchHistory();
    }
  };

  const selectPreset = (p) => {
    setCompany(p.company);
    setRole(p.role);
    setName(p.name);
    setEmail(p.email);
  };

  return (
    <div className="workspace-app">
      {/* Top Navbar */}
      <header className="workspace-navbar">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button 
            className="btn btn-secondary" 
            style={{ fontSize: "0.82rem", padding: "6px 12px" }}
            onClick={() => onNavigate("landing")}
          >
            ← Product Overview
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.2rem" }}>⚡</span>
            <span style={{ fontWeight: 800, fontSize: "1rem", color: "#ffffff" }}>SDR Command Center</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="pill">
            <div className="pill-dot"></div>
            FastAPI: Port 8000
          </div>
          <div className="pill">
            <span style={{ color: "#38bdf8" }}>🐘</span>
            PostgreSQL: Checkpointed
          </div>
          <div className="pill">
            <span style={{ color: "#fbbf24" }}>⚡</span>
            Groq: gpt-oss-20b
          </div>
        </div>
      </header>

      <div className="workspace-body">
        {/* Left Sidebar */}
        <aside className="workspace-sidebar">
          <div>
            <div className="sidebar-heading">Preset Target Accounts</div>
            {PRESETS.map((p, i) => (
              <div 
                key={i} 
                className="preset-item" 
                onClick={() => selectPreset(p)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{p.company}</span>
                  <span className={`tag ${p.tagType}`} style={{ fontSize: "0.65rem", padding: "2px 6px" }}>{p.tag}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                  {p.role} • {p.desc}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div className="sidebar-heading">PostgreSQL Checkpoints ({campaignHistory.length})</div>
            {campaignHistory.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>
                No campaigns in database yet. Launch one above!
              </div>
            ) : (
              campaignHistory.slice(0, 10).map((c, i) => (
                <div 
                  key={i} 
                  className="preset-item" 
                  style={{ padding: "8px 12px" }}
                  onClick={() => setThreadId(c.thread_id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontFamily: "JetBrains Mono", fontSize: "0.75rem", color: "#a5b4fc" }}>
                      {c.thread_id}
                    </span>
                    <span className="pill" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                      {c.total_steps} steps
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Interactive Workspace Canvas */}
        <main className="workspace-main">
          {/* Target Account Ingestion Form */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <span>🎯</span> Target Account Ingestion
              </div>
              {loading && <span className="tag tag-warning pulse-anim">Swarm Active</span>}
            </div>

            <form onSubmit={handleStart} className="form-grid">
              <div className="form-group">
                <label>Company Domain / Name</label>
                <input 
                  value={company} 
                  onChange={e => setCompany(e.target.value)} 
                  required 
                  placeholder="e.g. Stripe, OpenAI, Datadog" 
                />
              </div>
              <div className="form-group">
                <label>Target Executive Role</label>
                <input 
                  value={role} 
                  onChange={e => setRole(e.target.value)} 
                  required 
                  placeholder="e.g. VP of Engineering" 
                />
              </div>
              <div className="form-group">
                <label>Contact Name</label>
                <input 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  required 
                  placeholder="e.g. David" 
                />
              </div>
              <div className="form-group">
                <label>Contact Email</label>
                <input 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  placeholder="e.g. david@stripe.com" 
                />
              </div>

              <div style={{ gridColumn: "span 2", marginTop: "0.5rem" }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: "100%", padding: "12px" }} 
                  disabled={loading}
                >
                  {loading ? "Multi-Agent Swarm Orchestrating..." : "🚀 Launch Autonomous SDR Swarm"}
                </button>
              </div>
            </form>
          </div>

          {/* Campaign Lifecycle Stepper */}
          {threadId && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <span>🔄</span> Campaign Lifecycle: <span style={{ fontFamily: "JetBrains Mono", color: "var(--primary)" }}>{threadId}</span>
                </div>
                {campaignState && (
                  <span className={`tag ${
                    campaignState.ui_status === 'AWAITING_HUMAN_REVIEW' ? 'tag-warning' :
                    campaignState.ui_status === 'DISPATCHED' ? 'tag-success' :
                    campaignState.ui_status === 'DISQUALIFIED' ? 'tag-danger' : 'tag-info'
                  }`}>
                    {campaignState.ui_status}
                  </span>
                )}
              </div>

              <div className="stepper">
                <div className={`step-item ${campaignState?.research_summary ? 'step-completed' : loading ? 'step-active' : ''}`}>
                  <div className="step-circle">1</div>
                  <div className="step-label">Researcher</div>
                </div>
                <div className={`step-item ${campaignState?.icp_fit_score ? 'step-completed' : ''}`}>
                  <div className="step-circle">2</div>
                  <div className="step-label">ICP Analyst</div>
                </div>
                <div className={`step-item ${campaignState?.email_draft ? 'step-completed' : ''}`}>
                  <div className="step-circle">3</div>
                  <div className="step-label">Copywriter</div>
                </div>
                <div className={`step-item ${campaignState?.eval_score ? 'step-completed' : ''}`}>
                  <div className="step-circle">4</div>
                  <div className="step-label">AI Judge</div>
                </div>
                <div className={`step-item ${campaignState?.is_paused_at_gate ? 'step-active' : campaignState?.approval_status === 'APPROVED' ? 'step-completed' : ''}`}>
                  <div className="step-circle">5</div>
                  <div className="step-label">HITL Review</div>
                </div>
                <div className={`step-item ${campaignState?.approval_status === 'APPROVED' ? 'step-completed' : ''}`}>
                  <div className="step-circle">6</div>
                  <div className="step-label">Dispatcher</div>
                </div>
              </div>

              {/* Disqualified Notice */}
              {campaignState?.ui_status === "DISQUALIFIED" && (
                <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", padding: "16px", borderRadius: "8px", marginTop: "1rem" }}>
                  <div style={{ fontWeight: 700, color: "#f87171", display: "flex", alignItems: "center", gap: "8px" }}>
                    🛑 Lead Disqualified ({campaignState.icp_fit_score}/10) — Pipeline Aborted Early
                  </div>
                  <div style={{ fontSize: "0.85rem", marginTop: "6px", color: "#cbd5e1" }}>
                    {campaignState.icp_rationale}
                  </div>
                  <div style={{ fontSize: "0.75rem", marginTop: "8px", color: "var(--text-dim)" }}>
                    Token-Saver Guardrail: Stopped before copywriting to preserve sender reputation and token compute.
                  </div>
                </div>
              )}

              {/* Executive Brief */}
              {campaignState?.research_summary && (
                <div style={{ marginTop: "1.5rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-medium)", marginBottom: "8px" }}>
                    📊 Executive Intelligence Brief & ICP Qualification
                  </div>
                  <div className="code-box">
                    {campaignState.research_summary}
                    {"\n\n"}
                    <strong>ICP Fit Score:</strong> {campaignState.icp_fit_score}/10{"\n"}
                    <strong>Rationale:</strong> {campaignState.icp_rationale}
                  </div>
                </div>
              )}

              {/* AI Quality Judge Card */}
              {campaignState?.eval_score && (
                <div style={{ marginTop: "1.2rem", background: "rgba(99, 102, 241, 0.08)", border: "1px solid var(--border-accent)", padding: "14px", borderRadius: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#a5b4fc", fontSize: "0.9rem" }}>
                      🛡️ AI Quality Judge: {campaignState.eval_score}/10 [{campaignState.eval_verdict}]
                    </span>
                    <span className="tag tag-success">Pre-Screened</span>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Feedback: {campaignState.eval_critique}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Human-in-the-Loop Review Area */}
          {campaignState?.is_paused_at_gate && (
            <div className="card" style={{ borderColor: "var(--warning)", boxShadow: "0 0 30px rgba(245, 158, 11, 0.15)" }}>
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ color: "#fbbf24" }}>
                    <span>⏸️</span> Human-in-the-Loop Gate: Review & Sign-Off Required
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    Target Recipient: {campaignState.target_contact_name} ({campaignState.target_contact_email})
                  </div>
                </div>
                <span className="tag tag-warning">Execution Paused</span>
              </div>

              {statusNotice && (
                <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid var(--success)", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", color: "#34d399", marginBottom: "1rem" }}>
                  {statusNotice}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: "1.2rem" }}>
                <label>Executive Outreach Proposal (Editable Before Sending)</label>
                <textarea 
                  value={editableDraft} 
                  onChange={e => setEditableDraft(e.target.value)} 
                  rows={6}
                />
              </div>

              {/* AI Re-draft critique input */}
              <div style={{ background: "#080c16", border: "1px solid var(--border-subtle)", padding: "14px", borderRadius: "8px", marginBottom: "1.2rem" }}>
                <label style={{ color: "#a5b4fc" }}>💬 Natural Language Feedback for AI Copywriter (Optional)</label>
                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <input 
                    value={critique} 
                    onChange={e => setCritique(e.target.value)} 
                    placeholder="e.g. 'Shorten to under 50 words and emphasize security compliance'"
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => handleAction("REDRAFT")}
                    disabled={actionLoading || !critique.trim()}
                  >
                    {actionLoading ? "Rewriting..." : "✨ Ask AI to Re-draft"}
                  </button>
                </div>
              </div>

              {/* Action Controls */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button 
                  className="btn btn-danger" 
                  onClick={() => handleAction("REJECT")}
                  disabled={actionLoading}
                >
                  🛑 Reject Lead
                </button>
                <button 
                  className="btn btn-success" 
                  onClick={() => handleAction("APPROVE")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Dispatching..." : "✓ Approve & Dispatch Outreach"}
                </button>
              </div>
            </div>
          )}

          {/* Final Dispatch Confirmation */}
          {campaignState?.approval_status === "APPROVED" && (
            <div className="card" style={{ borderColor: "var(--success)" }}>
              <div className="card-header">
                <div className="card-title" style={{ color: "#34d399" }}>
                  <span>🚀</span> Outbound Campaign Dispatched Successfully
                </div>
                <span className="tag tag-success">Delivered (200 OK)</span>
              </div>
              <div className="code-box">
                Delivery confirmed to: {campaignState.target_contact_email}{"\n"}
                State Checkpoint: Stored permanently in Docker PostgreSQL!
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
