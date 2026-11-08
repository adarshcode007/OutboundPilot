import React, { useState, useEffect } from 'react';
import { apiFetch } from '../apiClient';

export default function LeadTable({
  leads = [],
  quota = { daily_limit: 10, used_today: 0, remaining_today: 10 },
  onRefresh,
  onOpenBriefing,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [schedulerInfo, setSchedulerInfo] = useState(null);

  // Fetch live scheduler status
  const fetchSchedulerStatus = async () => {
    try {
      const res = await apiFetch("/api/scheduler/status");
      if (res.ok) {
        const data = await res.json();
        setSchedulerInfo(data);
      }
    } catch (e) {
      console.warn("Scheduler status fetch error: ", e);
    }
  };

  useEffect(() => {
    fetchSchedulerStatus();
  }, []);

  // Filter leads based on search term
  const filteredLeads = leads.filter((l) => {
    const term = searchTerm.toLowerCase();
    return (
      (l.company && l.company.toLowerCase().includes(term)) ||
      (l.role && l.role.toLowerCase().includes(term)) ||
      (l.contact_name && l.contact_name.toLowerCase().includes(term)) ||
      (l.contact_email && l.contact_email.toLowerCase().includes(term))
    );
  });

  // Toggle selection for a single lead
  const toggleSelectOne = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Toggle select all queued leads
  const toggleSelectAll = () => {
    const queuedVisible = filteredLeads.filter((l) => l.status === "QUEUED");
    if (selectedIds.size === queuedVisible.length && queuedVisible.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queuedVisible.map((l) => l.id)));
    }
  };

  // Launch campaign for selected leads
  const handleProcessSelected = async () => {
    if (selectedIds.size === 0) return;

    if (selectedIds.size > quota.remaining_today) {
      alert(
        `Quota Warning: You selected ${selectedIds.size} leads, but only ${quota.remaining_today} slots remain today.`
      );
      return;
    }

    setProcessing(true);
    setActionNotice(null);

    try {
      const res = await apiFetch("/api/leads/process-selected", {
        method: "POST",
        body: JSON.stringify({ lead_ids: Array.from(selectedIds) }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to process selected leads.");
      }

      const data = await res.json();
      setActionNotice(`🚀 ${data.message}`);
      setSelectedIds(new Set());
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Trigger daily cron drip simulation
  const handleTriggerCron = async () => {
    setProcessing(true);
    setActionNotice(null);

    try {
      const res = await apiFetch("/api/scheduler/run-now", {
        method: "POST",
      });
      const data = await res.json();
      setActionNotice(`⏰ Scheduler: ${data.message}`);
      if (onRefresh) onRefresh();
      fetchSchedulerStatus();
    } catch (err) {
      alert("Scheduler error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Count drafted leads ready for morning briefing review
  const draftedCount = leads.filter((l) => l.status === "DRAFTED").length;

  return (
    <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs transition-colors">
      {/* Top Header & Quota Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-[#E5E7EB] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h3 className="font-serif text-xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight">
              Prioritized Target Lead Queue
            </h3>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Ranked by Smart Regex Priority Score (0–100) • Zero LLM tokens spent on triage
          </p>
        </div>

        {/* Live Badges */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {schedulerInfo && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F5F5FA] dark:bg-[#161F33] text-[#3B6BF0] border border-[#E5E7EB] dark:border-[#1E293B]">
              <span>⏰</span>
              <span><strong>{schedulerInfo.target_time} AM</strong> Auto-Drip</span>
              {schedulerInfo.is_processing && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 animate-pulse ml-1">
                  Active
                </span>
              )}
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#F5F5FA] dark:bg-[#161F33] text-[#0B1220] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B]">
            <span className={`w-2 h-2 rounded-full ${quota.remaining_today > 0 ? "bg-emerald-500" : "bg-rose-500"}`}></span>
            <span><strong>{quota.remaining_today} / {quota.daily_limit}</strong> Daily Quota</span>
          </div>

          <button
            onClick={() => {
              if (onRefresh) onRefresh();
              fetchSchedulerStatus();
            }}
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] hover:bg-[#F5F5FA] dark:hover:bg-[#161F33] transition-colors"
            title="Refresh lead queue"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Action Bar & Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by company, role, or contact name..."
          className="w-full sm:max-w-xs px-3.5 py-2 text-xs rounded-lg border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] text-[#0B1220] dark:text-[#F8FAFC] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
        />

        <div className="flex items-center gap-2 flex-wrap">
          {draftedCount > 0 && (
            <button
              onClick={onOpenBriefing}
              className="bg-[#3B6BF0] hover:bg-[#2554D8] text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-all shadow-xs flex items-center gap-1.5 active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="M4.93 4.93l1.41 1.41" />
                <path d="M17.66 17.66l1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="M6.34 17.66l-1.41 1.41" />
                <path d="M19.07 4.93l-1.41 1.41" />
              </svg>
              <span>Morning Briefing ({draftedCount} Ready)</span>
            </button>
          )}

          <button
            onClick={handleTriggerCron}
            disabled={processing || quota.remaining_today <= 0}
            className="bg-[#F5F5FA] hover:bg-[#EBEBF2] dark:bg-[#161F33] dark:hover:bg-[#1E293B] text-[#0B1220] dark:text-[#F8FAFC] text-xs font-medium px-3.5 py-2 rounded-lg transition-colors border border-[#E5E7EB] dark:border-[#1E293B] disabled:opacity-50"
          >
            Run Scheduled Drip
          </button>

          <button
            onClick={handleProcessSelected}
            disabled={processing || selectedIds.size === 0}
            className="bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] text-xs font-medium px-3.5 py-2 rounded-lg transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 active:scale-[0.98]"
          >
            <span>⚡</span>
            <span>{processing ? "Orchestrating..." : `Launch Selected (${selectedIds.size})`}</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Notice */}
      {actionNotice && (
        <div className="mb-4 p-3 rounded-lg bg-[#3B6BF0]/10 border border-[#3B6BF0]/20 text-[#3B6BF0] text-xs font-medium">
          {actionNotice}
        </div>
      )}

      {/* Data Table */}
      <div className="overflow-x-auto border border-[#E5E7EB] dark:border-[#1E293B] rounded-xl">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-[#FAFBFD] dark:bg-[#0E1422] border-b border-[#E5E7EB] dark:border-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={
                    filteredLeads.filter((l) => l.status === "QUEUED").length > 0 &&
                    selectedIds.size ===
                      filteredLeads.filter((l) => l.status === "QUEUED").length
                  }
                  className="rounded border-[#E5E7EB] dark:border-gray-700 text-[#3B6BF0] focus:ring-[#3B6BF0] bg-white dark:bg-[#0B0F17]"
                />
              </th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Target Account</th>
              <th className="py-3 px-4">Executive Contact</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">AI Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-[#6B7280] dark:text-[#94A3B8]">
                  No leads found. Upload a CSV above or add target accounts!
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedIds.has(lead.id);
                const isQueued = lead.status === "QUEUED";
                return (
                  <tr
                    key={lead.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-[#3B6BF0]/5 dark:bg-[#3B6BF0]/15"
                        : "hover:bg-[#FAFBFD] dark:hover:bg-[#161F33]"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={!isQueued}
                        onChange={() => toggleSelectOne(lead.id)}
                        className="rounded border-[#E5E7EB] dark:border-gray-700 text-[#3B6BF0] focus:ring-[#3B6BF0] bg-white dark:bg-[#0B0F17] disabled:opacity-30"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          lead.priority_tier === "HIGH"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : lead.priority_tier === "MEDIUM"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                        }`}
                      >
                        {lead.priority_score} pts
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#0B1220] dark:text-[#F8FAFC]">
                        {lead.company}
                      </div>
                      <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                        {lead.role || "Executive"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-[#0B1220] dark:text-[#F8FAFC]">
                        {lead.contact_name || "—"}
                      </div>
                      <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#94A3B8]">
                        {lead.contact_email || "No email"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          lead.status === "DRAFTED"
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                            : lead.status === "APPROVED" || lead.status === "DISPATCHED"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                            : lead.status === "DISQUALIFIED"
                            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            : "bg-[#F5F5FA] dark:bg-[#161F33] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#1E293B]"
                        }`}
                      >
                        {lead.status === "DRAFTED" ? "Ready for Review" : lead.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1.5 flex-wrap max-w-xs">
                        {(lead.priority_tags || []).slice(0, 2).map((t, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-2 py-0.5 rounded bg-[#F5F5FA] dark:bg-[#161F33] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#1E293B]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
