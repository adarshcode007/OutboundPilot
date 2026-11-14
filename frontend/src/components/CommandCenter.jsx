import React, { useState, useEffect } from 'react';
import { PRESETS } from '../data/presets';
import { apiFetch, setOnUnauthorized } from '../apiClient';

import CsvUploader from './CsvUploader';
import LeadTable from './LeadTable';
import MorningBriefing from './MorningBriefing';
import AnalyticsDashboard from './AnalyticsDashboard';
import AuthModal from './AuthModal';
import ThemeToggle from './ThemeToggle';

export default function CommandCenter({ onNavigate, selectedPreset }) {

  // Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

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

  // Batch Queue & Briefing State
  const [activeTab, setActiveTab] = useState("single");
  const [queueLeads, setQueueLeads] = useState([]);
  const [quotaStats, setQuotaStats] = useState({ daily_limit: 10, used_today: 0, remaining_today: 10 });
  const [showBriefing, setShowBriefing] = useState(false);

  // Check Auth & Fetch Initial Data on Mount
  useEffect(() => {
    setOnUnauthorized(() => {
      setCurrentUser(null);
      setShowAuthModal(true);
    });
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        if (data.quota) setQuotaStats(data.quota);
        fetchHistory();
        fetchLeads();
      } else {
        setShowAuthModal(true);
      }
    } catch (e) {
      setShowAuthModal(true);
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    setCurrentUser(null);
    setQueueLeads([]);
    setCampaignHistory([]);
    setShowAuthModal(true);
  };

  const handleAuthSuccess = (userData) => {
    const user = userData.user || userData;
    setCurrentUser(user);
    setShowAuthModal(false);
    fetchLeads();
    fetchHistory();
  };

  const fetchHistory = async () => {
    try {
      const res = await apiFetch("/api/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaignHistory(data.campaigns || []);
      }
    } catch (e) {
      console.warn("Could not reach backend:", e);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await apiFetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setQueueLeads(data.leads || []);
        if (data.quota) setQuotaStats(data.quota);
      }
    } catch (e) {
      console.warn("Could not reach /api/leads: ", e);
    }
  };

  // Poll current campaign state
  useEffect(() => {
    if (!threadId) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/api/campaign/${threadId}`);
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
            fetchLeads();
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
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    setLoading(true);
    setCampaignState(null);
    setEditableDraft("");
    setStatusNotice(null);

    try {
      const res = await apiFetch("/api/campaign/start", {
        method: "POST",
        body: JSON.stringify({ company, role, contact_name: name, contact_email: email })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to start campaign");
      }
      const data = await res.json();
      setThreadId(data.thread_id);
      fetchLeads();
      fetchHistory();
    } catch (err) {
      alert("Campaign launch error: " + err.message);
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
        critique: critique,
        lead_id: campaignState?.lead_id,
        recipient_email: campaignState?.target_contact_email,
      };

      const res = await apiFetch(`/api/campaign/${threadId}/action`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Failed to process action");
      }
      if (actionType === "REDRAFT") {
        setEditableDraft(data.revised_draft);
        setCritique("");
        setStatusNotice("✓ AI Copywriter revised proposal based on your feedback!");
        const stateRes = await apiFetch(`/api/campaign/${threadId}`);
        setCampaignState(await stateRes.json());
      } else {
        setStatusNotice(data.message || "Action processed successfully.");
        const stateRes = await apiFetch(`/api/campaign/${threadId}`);
        setCampaignState(await stateRes.json());
      }
    } catch (err) {
      alert("Action failed: " + err.message);
    } finally {
      setActionLoading(false);
      fetchLeads();
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
    <div className="min-h-screen bg-[#FAFBFD] dark:bg-[#0B0F17] text-[#1F2937] dark:text-[#CBD5E1] flex flex-col font-sans transition-colors">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md border-b border-[#E5E7EB] dark:border-[#1E293B] px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#F5F5FA] hover:bg-[#EBEBF2] dark:bg-[#161F33] dark:hover:bg-[#1E293B] text-[#0B1220] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B] transition-colors"
            onClick={() => onNavigate("landing")}
          >
            ← Product Overview
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <span className="font-serif text-lg font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight">
              SDR Command Center
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F5FA] dark:bg-[#161F33] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#1E293B]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            FastAPI 8000
          </div>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F5FA] dark:bg-[#161F33] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#1E293B]">
            <span>🐘</span>
            PostgreSQL Scoped
          </div>

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* User Profile Pill / Auth Actions */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB] dark:border-[#1E293B]">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-[#111827] text-[#0B1220] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B]">
                <span>👤</span>
                <span className="font-semibold">{currentUser.full_name || currentUser.email}</span>
                <span className="text-[#3B6BF0] ml-1 font-mono text-[11px]">
                  ({quotaStats.remaining_today}/{quotaStats.daily_limit} slots)
                </span>
              </div>
              <button
                className="text-xs font-medium px-2.5 py-1 rounded-lg text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] hover:bg-[#F5F5FA] dark:hover:bg-[#161F33] transition-colors"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              className="bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all shadow-xs"
              onClick={() => setShowAuthModal(true)}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-80 shrink-0 border-r border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0E1422] p-6 space-y-8 hidden lg:block overflow-y-auto transition-colors">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-3">
              Preset Target Accounts
            </div>
            <div className="space-y-2">
              {PRESETS.map((p, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#111827] hover:bg-[#F5F5FA] dark:hover:bg-[#161F33] hover:border-gray-300 dark:hover:border-gray-700 transition-all cursor-pointer"
                  onClick={() => selectPreset(p)}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">{p.company}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                        p.tagType === 'tag-danger'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          : p.tagType === 'tag-warning'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {p.tag}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] line-clamp-2">
                    {p.role} • {p.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-3">
              PostgreSQL Checkpoints ({campaignHistory.length})
            </div>
            {campaignHistory.length === 0 ? (
              <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                No campaigns stored in database yet.
              </div>
            ) : (
              <div className="space-y-1.5">
                {campaignHistory.slice(0, 10).map((c, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#1E293B] hover:bg-[#F5F5FA] dark:hover:bg-[#161F33] transition-colors cursor-pointer flex justify-between items-center text-xs"
                    onClick={() => setThreadId(c.thread_id)}
                  >
                    <span className="font-mono text-[11px] text-[#3B6BF0] truncate max-w-[170px]">
                      {c.thread_id}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F5F5FA] dark:bg-[#161F33] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#1E293B]">
                      {c.total_steps} steps
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Interactive Workspace Canvas */}
        <main className="flex-1 p-6 md:p-8 space-y-6 max-w-5xl overflow-y-auto">
          {/* Tab Mode Switcher: Single Lead vs Batch CSV Queue vs Analytics */}
          <div className="flex gap-2 border-b border-[#E5E7EB] dark:border-[#1E293B] pb-3">
            <button
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'single'
                  ? "bg-[#0B1220] dark:bg-white text-white dark:text-[#0B1220] shadow-xs"
                  : "bg-[#F5F5FA] dark:bg-[#111827] text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B]"
              }`}
              onClick={() => setActiveTab("single")}
            >
              🎯 Single Lead Ingestion
            </button>
            <button
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'batch'
                  ? "bg-[#0B1220] dark:bg-white text-white dark:text-[#0B1220] shadow-xs"
                  : "bg-[#F5F5FA] dark:bg-[#111827] text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B]"
              }`}
              onClick={() => { setActiveTab("batch"); fetchLeads(); }}
            >
              📁 Batch CSV &amp; Lead Queue ({queueLeads.length})
            </button>
            <button
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'analytics'
                  ? "bg-[#0B1220] dark:bg-white text-white dark:text-[#0B1220] shadow-xs"
                  : "bg-[#F5F5FA] dark:bg-[#111827] text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B]"
              }`}
              onClick={() => setActiveTab("analytics")}
            >
              📊 ROI &amp; Intelligence
            </button>
          </div>

          {activeTab === "single" && (
            /* Target Account Ingestion Form */
            <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs transition-colors">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  <h3 className="font-serif text-xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight">
                    Target Account Ingestion
                  </h3>
                </div>
                {loading && (
                  <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
                    Swarm Active
                  </span>
                )}
              </div>

              <form onSubmit={handleStart} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                      Company Domain / Name
                    </label>
                    <input
                      value={company}
                      onChange={e => setCompany(e.target.value)}
                      required
                      placeholder="e.g. Stripe, OpenAI, Datadog"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] text-sm text-[#0B1220] dark:text-[#F8FAFC] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                      Target Executive Role
                    </label>
                    <input
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      required
                      placeholder="e.g. VP of Engineering"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] text-sm text-[#0B1220] dark:text-[#F8FAFC] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                      Contact Name
                    </label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                      placeholder="e.g. David"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] text-sm text-[#0B1220] dark:text-[#F8FAFC] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-1.5">
                      Contact Email
                    </label>
                    <input
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="e.g. david@stripe.com"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] text-sm text-[#0B1220] dark:text-[#F8FAFC] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] text-sm font-medium py-3 px-4 rounded-lg transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? "Multi-Agent Swarm Orchestrating..." : "Launch Autonomous SDR Swarm →"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === "batch" && (
            <div>
              {/* CSV Upload & Header Auto-Mapper */}
              <CsvUploader onUploadSuccess={() => fetchLeads()} />

              {/* Prioritized Lead Table with Multi-Select & Quota */}
              <LeadTable
                leads={queueLeads}
                quota={quotaStats}
                onRefresh={fetchLeads}
                onOpenBriefing={() => setShowBriefing(true)}
              />
            </div>
          )}

          {activeTab === "analytics" && (
            <AnalyticsDashboard />
          )}

          {/* Campaign Lifecycle Stepper */}
          {activeTab === "single" && threadId && (
            <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-6 transition-colors">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔄</span>
                  <h3 className="font-serif text-xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight">
                    Campaign Lifecycle: <span className="font-mono text-[#3B6BF0]">{threadId}</span>
                  </h3>
                </div>
                {campaignState && (
                  <span className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${
                    campaignState.ui_status === 'AWAITING_HUMAN_REVIEW'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : campaignState.ui_status === 'DISPATCHED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : campaignState.ui_status === 'DISQUALIFIED'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : 'bg-[#F5F5FA] dark:bg-[#161F33] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#1E293B]'
                  }`}>
                    {campaignState.ui_status}
                  </span>
                )}
              </div>

              {/* Stepper Progress Indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { step: 1, label: "Researcher", completed: !!campaignState?.research_summary, active: loading },
                  { step: 2, label: "ICP Analyst", completed: !!campaignState?.icp_fit_score },
                  { step: 3, label: "Copywriter", completed: !!campaignState?.email_draft },
                  { step: 4, label: "AI Judge", completed: !!campaignState?.eval_score },
                  { step: 5, label: "HITL Review", completed: campaignState?.approval_status === 'APPROVED', active: campaignState?.is_paused_at_gate },
                  { step: 6, label: "Dispatcher", completed: campaignState?.approval_status === 'APPROVED' },
                ].map(s => (
                  <div
                    key={s.step}
                    className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                      s.completed
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                        : s.active
                        ? "bg-[#3B6BF0]/10 border-[#3B6BF0] text-[#3B6BF0] ring-1 ring-[#3B6BF0]/30"
                        : "bg-[#FAFBFD] dark:bg-[#0E1422] border-[#E5E7EB] dark:border-[#1E293B] text-[#6B7280] dark:text-[#94A3B8]"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mb-1.5 ${
                      s.completed
                        ? "bg-emerald-600 text-white"
                        : s.active
                        ? "bg-[#3B6BF0] text-white"
                        : "bg-[#F5F5FA] dark:bg-[#161F33] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#1E293B]"
                    }`}>
                      {s.completed ? "✓" : s.step}
                    </div>
                    <div className="text-xs font-medium">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Disqualified Notice */}
              {campaignState?.ui_status === "DISQUALIFIED" && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-1.5">
                  <div className="font-semibold text-rose-700 dark:text-rose-400 text-sm flex items-center gap-2">
                    🛑 Lead Disqualified ({campaignState.icp_fit_score}/10) — Pipeline Aborted Early
                  </div>
                  <div className="text-xs text-rose-900/80 dark:text-rose-300/80">
                    {campaignState.icp_rationale}
                  </div>
                  <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono pt-1">
                    Token-Saver Guardrail: Stopped before copywriting to preserve sender reputation and token compute.
                  </div>
                </div>
              )}

              {/* Executive Brief */}
              {campaignState?.research_summary && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                    Executive Intelligence Brief &amp; ICP Qualification
                  </div>
                  <div className="p-4 rounded-xl bg-[#FAFBFD] dark:bg-[#0B0F17] border border-[#E5E7EB] dark:border-[#1E293B] font-mono text-xs text-[#1F2937] dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {campaignState.research_summary}
                    {"\n\n"}
                    <strong>ICP Fit Score:</strong> {campaignState.icp_fit_score}/10{"\n"}
                    <strong>Rationale:</strong> {campaignState.icp_rationale}
                  </div>
                </div>
              )}

              {/* AI Quality Judge Card */}
              {campaignState?.eval_score && (
                <div className="p-4 rounded-xl bg-[#F5F5FA] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC]">
                      🛡️ AI Quality Judge: {campaignState.eval_score}/10 [{campaignState.eval_verdict}]
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                      Feedback: {campaignState.eval_critique}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    Pre-Screened
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Human-in-the-Loop Review Area */}
          {activeTab === "single" && campaignState?.is_paused_at_gate && (
            <div className="bg-white dark:bg-[#111827] border-2 border-amber-300 dark:border-amber-500/60 rounded-2xl p-6 shadow-sm space-y-6 transition-colors">
              <div className="flex items-start justify-between pb-4 border-b border-[#E5E7EB] dark:border-[#1E293B]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏸️</span>
                    <h3 className="font-serif text-xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight">
                      Human-in-the-Loop Gate: Review &amp; Sign-Off Required
                    </h3>
                  </div>
                  <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                    Target Recipient: {campaignState.target_contact_name} ({campaignState.target_contact_email})
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Execution Paused
                </span>
              </div>

              {statusNotice && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                  {statusNotice}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-2">
                  Executive Outreach Proposal (Editable Before Sending)
                </label>
                <textarea
                  value={editableDraft}
                  onChange={e => setEditableDraft(e.target.value)}
                  rows={6}
                  className="w-full p-4 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] text-sm text-[#0B1220] dark:text-[#F8FAFC] font-sans leading-relaxed focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
                />
              </div>

              {/* AI Re-draft critique input */}
              <div className="p-4 rounded-xl bg-[#FAFBFD] dark:bg-[#0B0F17] border border-[#E5E7EB] dark:border-[#1E293B]">
                <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-2">
                  💬 Natural Language Feedback for AI Copywriter (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    value={critique}
                    onChange={e => setCritique(e.target.value)}
                    placeholder="e.g. 'Shorten to under 50 words and emphasize security compliance'"
                    className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#111827] text-[#0B1220] dark:text-[#F8FAFC] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0]"
                  />
                  <button
                    type="button"
                    className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#F5F5FA] hover:bg-[#EBEBF2] dark:bg-[#161F33] dark:hover:bg-[#1E293B] text-[#0B1220] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B] transition-colors disabled:opacity-50"
                    onClick={() => handleAction("REDRAFT")}
                    disabled={actionLoading || !critique.trim()}
                  >
                    {actionLoading ? "Rewriting..." : "✨ Ask AI to Re-draft"}
                  </button>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-50"
                  onClick={() => handleAction("REJECT")}
                  disabled={actionLoading}
                >
                  🛑 Reject Lead
                </button>
                <button
                  className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
                  onClick={() => handleAction("APPROVE")}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Dispatching..." : "✓ Approve & Dispatch Outreach"}
                </button>
              </div>
            </div>
          )}

          {/* Final Dispatch Confirmation */}
          {activeTab === "single" && campaignState?.approval_status === "APPROVED" && (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 transition-colors">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
                  <span>🚀</span> Outbound Campaign Dispatched Successfully
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300">
                  Delivered (200 OK)
                </span>
              </div>
              <div className="font-mono text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                Delivery confirmed to: {campaignState.target_contact_email}{"\n"}
                State Checkpoint: Stored permanently in Docker PostgreSQL!
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Morning SDR Briefing Card-Swipe Modal */}
      {showBriefing && (
        <MorningBriefing
          leads={queueLeads}
          onClose={() => setShowBriefing(false)}
          onRefresh={fetchLeads}
        />
      )}

      {/* User Authentication Modal (JWT + httpOnly Cookie) */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          if (currentUser) setShowAuthModal(false);
        }}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
