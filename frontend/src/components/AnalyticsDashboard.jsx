import React, { useState, useEffect } from 'react';
import { apiFetch } from '../apiClient';

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/analytics");
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
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <h2 className="font-serif text-2xl font-normal text-[#0B1220] tracking-tight">
              Workforce ROI &amp; Intelligence Economics
            </h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F5F5FA] text-[#3B6BF0] border border-[#E5E7EB]">
              PostgreSQL Live Checkpoints
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Real-time telemetry tracking early-exit token savings, ICP qualification funnel, deliverability health, and inbound reply sentiment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#6B7280]">
            Refreshed: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="bg-[#F5F5FA] hover:bg-[#EBEBF2] text-[#0B1220] text-xs font-medium px-3.5 py-2 rounded-lg border border-[#E5E7EB] transition-colors"
          >
            {loading ? "Refreshing..." : "↻ Refresh Metrics"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          ⚠️ <strong>Analytics API Error:</strong> {error}
        </div>
      )}

      {/* 4 Hero KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tokens Saved */}
        <div className="bg-[#F5F5FA] border border-[#E5E7EB] rounded-2xl p-6 transition-all hover:border-gray-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Token-Saver ROI
            </span>
            <span className="text-base">⚡</span>
          </div>
          <div className="font-serif text-3xl font-normal text-[#0B1220] tracking-tight">
            {roi.tokens_saved_formatted}
          </div>
          <div className="text-xs text-[#3B6BF0] font-medium mt-1">
            ~{roi.free_tier_days_preserved} Days Compute Preserved
          </div>
          <div className="text-[11px] text-[#6B7280] mt-2 leading-relaxed">
            Preserved by Node 2 early-exit skipping 6,500 tokens/disqualified account.
          </div>
        </div>

        {/* KPI 2: Qualification Funnel */}
        <div className="bg-[#F5F5FA] border border-[#E5E7EB] rounded-2xl p-6 transition-all hover:border-gray-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              ICP Fit Funnel
            </span>
            <span className="text-base">🎯</span>
          </div>
          <div className="font-serif text-3xl font-normal text-[#0B1220] tracking-tight">
            {pipeline.qualification_rate_pct}%
          </div>
          <div className="text-xs text-[#0B1220] font-medium mt-1">
            {pipeline.qualified} Qualified / {pipeline.disqualified} Disqualified
          </div>
          <div className="text-[11px] text-[#6B7280] mt-2 leading-relaxed">
            Avg ICP: <strong className="text-[#0B1220]">{quality.avg_icp_score}/10</strong> | AI Judge: <strong className="text-[#0B1220]">{quality.avg_eval_score}/10</strong>
          </div>
        </div>

        {/* KPI 3: Deliverability Health */}
        <div className="bg-[#F5F5FA] border border-[#E5E7EB] rounded-2xl p-6 transition-all hover:border-gray-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Deliverability Health
            </span>
            <span className="text-base">🛡️</span>
          </div>
          <div className="font-serif text-3xl font-normal text-[#0B1220] tracking-tight">
            {deliverability.deliverability_rate_pct}%
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            {deliverability.delivered} Delivered / {deliverability.total_dispatches} Dispatched
          </div>
          <div className="text-[11px] text-[#6B7280] mt-2 leading-relaxed">
            <strong className="text-rose-600">{deliverability.guardrail_blocked} Hard Bounces Blocked</strong> before transmission.
          </div>
        </div>

        {/* KPI 4: Inbound Engagement */}
        <div className="bg-[#F5F5FA] border border-[#E5E7EB] rounded-2xl p-6 transition-all hover:border-gray-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
              Inbound Replies
            </span>
            <span className="text-base">💬</span>
          </div>
          <div className="font-serif text-3xl font-normal text-[#0B1220] tracking-tight">
            {engagement.total_replies}
          </div>
          <div className="text-xs text-[#0B1220] font-medium mt-1">
            {engagement.positive_replies} Positive ({engagement.total_replies > 0 ? Math.round((engagement.positive_replies / engagement.total_replies) * 100) : 0}%)
          </div>
          <div className="text-[11px] text-[#6B7280] mt-2 leading-relaxed">
            Autonomous Cadence Stopper halted remaining touches.
          </div>
        </div>
      </div>

      {/* Two-Column Deep Dive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Token-Saver Architecture Economics */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <h3 className="font-serif text-xl font-normal text-[#0B1220] tracking-tight">
                  Token-Saver Architecture Economics
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F5F5FA] text-[#0B1220] border border-[#E5E7EB]">
                6,500 Tokens / Exit
              </span>
            </div>

            <p className="text-xs text-[#6B7280] leading-relaxed mb-5">
              Standard AI SDRs execute full pitch generation and evaluator loops on every lead indiscriminately. 
              Our <strong>Token-Saver ROI Engine</strong> intercepts disqualified leads at Node 2, completely bypassing subsequent agent steps.
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#0B1220]">
                    1. Copywriter Agent Bypass
                  </div>
                  <div className="text-[11px] text-[#6B7280]">
                    Skipped customized cold pitch generation on low-fit leads
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-[#0B1220]">
                  ~{(roi.disqualified_accounts * 2000).toLocaleString()} tok
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#0B1220]">
                    2. Actor-Critic Evaluator Bypass
                  </div>
                  <div className="text-[11px] text-[#6B7280]">
                    Skipped multi-criteria rubric scoring &amp; hallucination checks
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-[#0B1220]">
                  ~{(roi.disqualified_accounts * 2000).toLocaleString()} tok
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#0B1220]">
                    3. 3-Touch Follow-Up Cadence Bypass
                  </div>
                  <div className="text-[11px] text-[#6B7280]">
                    Skipped Day 1/3/7 multi-touch follow-up generation
                  </div>
                </div>
                <div className="font-mono text-xs font-bold text-[#0B1220]">
                  ~{(roi.disqualified_accounts * 2500).toLocaleString()} tok
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-[#F5F5FA] border border-[#E5E7EB] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#0B1220]">
              Total Inference Compute Preserved:
            </span>
            <span className="font-mono text-sm font-bold text-[#3B6BF0]">
              {roi.tokens_saved_formatted}
            </span>
          </div>
        </div>

        {/* Right Column: Pipeline Funnel & Reply Sentiment Breakdown */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <h3 className="font-serif text-xl font-normal text-[#0B1220] tracking-tight">
                  Pipeline Funnel &amp; Engagement
                </h3>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#F5F5FA] text-[#6B7280] border border-[#E5E7EB]">
                {pipeline.total_leads} Total Leads
              </span>
            </div>

            {/* Stage Progress Bar: Qualified vs Disqualified */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-[#6B7280] mb-2 font-medium">
                <span>ICP Qualification Funnel</span>
                <span className="font-mono text-[#0B1220]">
                  {pipeline.qualified} Qualified / {pipeline.disqualified} Disqualified
                </span>
              </div>
              <div className="h-2.5 bg-[#F5F5FA] border border-[#E5E7EB] rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${pipeline.qualification_rate_pct}%` }}
                  className="bg-[#3B6BF0] rounded-l-full transition-all duration-500"
                />
                <div
                  style={{ width: `${100 - pipeline.qualification_rate_pct}%` }}
                  className="bg-rose-400 rounded-r-full transition-all duration-500"
                />
              </div>
            </div>

            {/* Stage Stat Boxes */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#E5E7EB]">
                <div className="text-[11px] font-semibold uppercase text-[#6B7280]">
                  Awaiting Review
                </div>
                <div className="font-serif text-2xl text-[#0B1220] mt-1">
                  {pipeline.drafted_awaiting_review} leads
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#E5E7EB]">
                <div className="text-[11px] font-semibold uppercase text-[#6B7280]">
                  Approved / Dispatched
                </div>
                <div className="font-serif text-2xl text-[#0B1220] mt-1">
                  {pipeline.approved_or_dispatched} leads
                </div>
              </div>
            </div>

            {/* Inbound Sentiment Breakdown */}
            <div className="mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                Inbound Reply Sentiment Breakdown
              </div>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(engagement.sentiment_breakdown || {}).length === 0 ? (
                  <div className="text-xs text-[#6B7280]">
                    No inbound replies received yet. (Simulate one via Inbound Webhook).
                  </div>
                ) : (
                  Object.entries(engagement.sentiment_breakdown).map(([sentiment, count]) => (
                    <div
                      key={sentiment}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F5F5FA] border border-[#E5E7EB]"
                    >
                      <span className="text-[#0B1220] font-semibold">{sentiment}</span>
                      <span className="font-mono text-[#3B6BF0] font-bold">{count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Deliverability Guardrail Status */}
          <div className="mt-4 p-3 rounded-xl bg-rose-50/50 border border-rose-200 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-rose-700">
                Hard-Bounce Prevention Guardrail
              </div>
              <div className="text-[11px] text-rose-600/80">
                Unresolvable DNS domains safely intercepted before sending
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold text-[11px]">
              {deliverability.guardrail_blocked} Blocked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
