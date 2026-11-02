import React, { useState, useEffect } from 'react';

const API_URL = typeof window !== 'undefined' && window.location.port === "5173" ? "" : "http://localhost:8000";

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/analytics`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError(err.message || "Could not reach /api/analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const pipeline = data?.pipeline || {
    total_leads: 0,
    queued: 0,
    qualified: 0,
    disqualified: 0,
    qualification_rate_pct: 0,
    drafted_awaiting_review: 0,
    approved_or_dispatched: 0,
    replied: 0,
  };

  const roi = data?.token_saver_roi || {
    disqualified_accounts: 0,
    tokens_saved: 0,
    free_tier_days_preserved: 0,
    tokens_saved_formatted: "0 tokens",
  };

  const quality = data?.quality_scores || {
    avg_icp_score: 0,
    avg_eval_score: 0,
  };

  const deliverability = data?.deliverability || {
    total_dispatches: 0,
    delivered: 0,
    guardrail_blocked: 0,
    deliverability_rate_pct: 100,
  };

  const engagement = data?.engagement || {
    total_replies: 0,
    positive_replies: 0,
    sentiment_breakdown: {},
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner & Control Bar */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px",
        padding: "16px 20px",
        background: "rgba(17, 26, 46, 0.7)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        backdropFilter: "blur(12px)",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.4rem" }}>📊</span>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
              Workforce ROI & Intelligence Economics
            </h2>
            <span className="pill" style={{ fontSize: "0.72rem", background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}>
              Live PostgreSQL Checkpointed
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Real-time telemetry tracking early-exit token savings, ICP qualification funnel, deliverability health, and inbound reply sentiment.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "JetBrains Mono" }}>
            Refreshed: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            className="btn btn-secondary"
            onClick={fetchAnalytics}
            disabled={loading}
            style={{ fontSize: "0.82rem", padding: "6px 14px" }}
          >
            {loading ? "⟳ Refreshing..." : "↻ Refresh Metrics"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: "14px 18px",
          background: "var(--danger-bg)",
          border: "1px solid var(--danger-border)",
          borderRadius: "var(--radius-sm)",
          color: "#fca5a5",
          fontSize: "0.85rem",
        }}>
          ⚠️ <strong>Analytics API Error:</strong> {error}
        </div>
      )}

      {/* 4 Hero KPI Summary Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: "1rem",
      }}>
        {/* KPI 1: Tokens Saved */}
        <div className="card" style={{
          background: "linear-gradient(145deg, rgba(251, 191, 36, 0.08), rgba(17, 26, 46, 0.9))",
          border: "1px solid rgba(251, 191, 36, 0.25)",
          padding: "1.25rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Token-Saver ROI
            </span>
            <span style={{ fontSize: "1.2rem" }}>⚡</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff", fontFamily: "JetBrains Mono" }}>
            {roi.tokens_saved_formatted}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#fef3c7", marginTop: "4px" }}>
            ~{roi.free_tier_days_preserved} Days Groq Free-Tier Preserved
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
            Preserved by Node 2 early-exit skipping 6,500 tokens/disqualified account.
          </div>
        </div>

        {/* KPI 2: Qualification Funnel */}
        <div className="card" style={{
          background: "linear-gradient(145deg, rgba(56, 189, 248, 0.08), rgba(17, 26, 46, 0.9))",
          border: "1px solid rgba(56, 189, 248, 0.25)",
          padding: "1.25rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ICP Fit Funnel
            </span>
            <span style={{ fontSize: "1.2rem" }}>🎯</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff", fontFamily: "JetBrains Mono" }}>
            {pipeline.qualification_rate_pct}%
          </div>
          <div style={{ fontSize: "0.78rem", color: "#bae6fd", marginTop: "4px" }}>
            {pipeline.qualified} Qualified / {pipeline.disqualified} Disqualified
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
            Avg ICP Score: <strong style={{ color: "#38bdf8" }}>{quality.avg_icp_score}/10</strong> | AI Judge: <strong style={{ color: "#34d399" }}>{quality.avg_eval_score}/10</strong>
          </div>
        </div>

        {/* KPI 3: Deliverability Health */}
        <div className="card" style={{
          background: "linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(17, 26, 46, 0.9))",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          padding: "1.25rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Deliverability Health
            </span>
            <span style={{ fontSize: "1.2rem" }}>🛡️</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff", fontFamily: "JetBrains Mono" }}>
            {deliverability.deliverability_rate_pct}%
          </div>
          <div style={{ fontSize: "0.78rem", color: "#a7f3d0", marginTop: "4px" }}>
            {deliverability.delivered} Delivered / {deliverability.total_dispatches} Dispatched
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
            <strong style={{ color: "#f43f5e" }}>{deliverability.guardrail_blocked} Hard Bounces Blocked</strong> before transmission.
          </div>
        </div>

        {/* KPI 4: Inbound Engagement */}
        <div className="card" style={{
          background: "linear-gradient(145deg, rgba(168, 85, 247, 0.08), rgba(17, 26, 46, 0.9))",
          border: "1px solid rgba(168, 85, 247, 0.25)",
          padding: "1.25rem",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#c084fc", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Inbound Replies
            </span>
            <span style={{ fontSize: "1.2rem" }}>🔥</span>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#ffffff", fontFamily: "JetBrains Mono" }}>
            {engagement.total_replies}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#e9d5ff", marginTop: "4px" }}>
            {engagement.positive_replies} Positive Intent ({engagement.total_replies > 0 ? Math.round((engagement.positive_replies / engagement.total_replies) * 100) : 0}%)
          </div>
          <div style={{ marginTop: "10px", fontSize: "0.72rem", color: "var(--text-dim)" }}>
            Autonomous Cadence Stopper halted remaining touches.
          </div>
        </div>
      </div>

      {/* Two-Column Deep Dive Section */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem" }}>
        {/* Left Column: Token-Saver Architecture & Savings Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>⚡</span> Token-Saver Architecture Economics
            </div>
            <span className="tag tag-warning">6,500 Tokens / Exit</span>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Standard AI SDRs execute full pitch generation and evaluator loops on every lead indiscriminately. 
            Our <strong>Token-Saver ROI Engine</strong> intercepts disqualified leads at Node 2, completely bypassing subsequent agent steps.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {/* Step 1: Copywriter Saved */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}>
              <div>
                <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#ffffff" }}>
                  1. Copywriter Agent Bypass
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                  Skipped customized cold pitch generation on low-fit leads
                </div>
              </div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: "0.82rem", color: "#fbbf24", fontWeight: 700 }}>
                ~{(roi.disqualified_accounts * 2000).toLocaleString()} tok
              </div>
            </div>

            {/* Step 2: Evaluator Saved */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}>
              <div>
                <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#ffffff" }}>
                  2. Actor-Critic Evaluator Bypass
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                  Skipped multi-criteria rubric scoring & hallucination check
                </div>
              </div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: "0.82rem", color: "#fbbf24", fontWeight: 700 }}>
                ~{(roi.disqualified_accounts * 2000).toLocaleString()} tok
              </div>
            </div>

            {/* Step 3: Cadence Saved */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              background: "rgba(255, 255, 255, 0.03)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-subtle)",
            }}>
              <div>
                <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#ffffff" }}>
                  3. 3-Touch Follow-Up Cadence Bypass
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--text-dim)" }}>
                  Skipped Day 1/3/7 multi-touch follow-up generation
                </div>
              </div>
              <div style={{ fontFamily: "JetBrains Mono", fontSize: "0.82rem", color: "#fbbf24", fontWeight: 700 }}>
                ~{(roi.disqualified_accounts * 2500).toLocaleString()} tok
              </div>
            </div>
          </div>

          <div style={{
            marginTop: "1.25rem",
            padding: "12px 16px",
            background: "rgba(251, 191, 36, 0.08)",
            border: "1px solid rgba(251, 191, 36, 0.2)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontSize: "0.82rem", color: "#fef3c7", fontWeight: 600 }}>
              Total Groq Compute Preserved:
            </span>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: "1rem", color: "#fbbf24", fontWeight: 800 }}>
              {roi.tokens_saved_formatted}
            </span>
          </div>
        </div>

        {/* Right Column: Pipeline Funnel & Reply Sentiment Breakdown */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <span>🎯</span> Pipeline Funnel & Engagement
            </div>
            <span className="tag tag-info">{pipeline.total_leads} Total Leads</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* Stage Progress Bar: Qualified vs Disqualified */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "6px" }}>
                <span style={{ color: "var(--text-muted)" }}>ICP Qualification Funnel</span>
                <span style={{ fontFamily: "JetBrains Mono", color: "#ffffff" }}>
                  {pipeline.qualified} Qualified / {pipeline.disqualified} Disqualified
                </span>
              </div>
              <div style={{ height: "8px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "4px", overflow: "hidden", display: "flex" }}>
                <div style={{
                  width: `${pipeline.qualification_rate_pct}%`,
                  background: "linear-gradient(90deg, #38bdf8, #6366f1)",
                  borderRadius: "4px 0 0 4px",
                }} />
                <div style={{
                  width: `${100 - pipeline.qualification_rate_pct}%`,
                  background: "#f43f5e",
                  borderRadius: "0 4px 4px 0",
                }} />
              </div>
            </div>

            {/* Stage List */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginTop: "4px",
            }}>
              <div style={{
                padding: "10px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
              }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Awaiting Review</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fbbf24", fontFamily: "JetBrains Mono" }}>
                  {pipeline.drafted_awaiting_review} leads
                </div>
              </div>

              <div style={{
                padding: "10px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
              }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", textTransform: "uppercase" }}>Approved / Dispatched</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#34d399", fontFamily: "JetBrains Mono" }}>
                  {pipeline.approved_or_dispatched} leads
                </div>
              </div>
            </div>

            {/* Inbound Sentiment Breakdown */}
            <div style={{ marginTop: "8px" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "8px", textTransform: "uppercase" }}>
                Inbound Reply Sentiment Breakdown
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {Object.keys(engagement.sentiment_breakdown || {}).length === 0 ? (
                  <div style={{ fontSize: "0.76rem", color: "var(--text-dim)" }}>
                    No inbound replies received yet. (Simulate one via Inbound Webhook).
                  </div>
                ) : (
                  Object.entries(engagement.sentiment_breakdown).map(([sentiment, count]) => {
                    const color = sentiment === "INTERESTED" ? "#34d399" :
                                  sentiment === "REFERRAL" ? "#a855f7" :
                                  sentiment === "NOT_INTERESTED" ? "#f43f5e" : "#fbbf24";
                    return (
                      <div
                        key={sentiment}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "6px 12px",
                          borderRadius: "var(--radius-sm)",
                          background: `${color}15`,
                          border: `1px solid ${color}40`,
                        }}
                      >
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, color }}>{sentiment}</span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#ffffff", fontFamily: "JetBrains Mono" }}>
                          {count}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Deliverability Guardrail Status */}
            <div style={{
              marginTop: "8px",
              padding: "10px 14px",
              background: "rgba(244, 63, 94, 0.06)",
              border: "1px solid rgba(244, 63, 94, 0.2)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#fca5a5" }}>
                  Hard-Bounce Prevention Guardrail
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                  Unresolvable DNS domains safely intercepted before sending
                </div>
              </div>
              <span className="pill" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#fca5a5", fontSize: "0.74rem" }}>
                {deliverability.guardrail_blocked} Blocked
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

