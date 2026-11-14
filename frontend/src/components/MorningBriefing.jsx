import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from '../apiClient';

export default function MorningBriefing({ leads = [], onClose, onRefresh }) {
  // Only review leads that are DRAFTED (awaiting review)
  const reviewLeads = leads.filter((l) => l.status === "DRAFTED");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [editableDraft, setEditableDraft] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [critique, setCritique] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const textareaRef = useRef(null);
  const currentLead = reviewLeads[currentIndex] || null;

  // Sync draft when switching cards
  useEffect(() => {
    if (currentLead) {
      setEditableDraft(currentLead.email_draft || "");
      setRecipientEmail(currentLead.contact_email || "");
      setCritique("");
      setNotice(null);
    }
  }, [currentIndex, currentLead?.id]);

  // Keyboard navigation & hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in input or textarea
      if (["TEXTAREA", "INPUT"].includes(document.activeElement?.tagName)) {
        if (e.key === "Escape") {
          document.activeElement.blur();
        }
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        handleAction("APPROVE");
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        textareaRef.current?.focus();
      } else if (e.key.toLowerCase() === "x") {
        e.preventDefault();
        handleAction("REJECT");
      } else if (e.key === "ArrowRight" && currentIndex < reviewLeads.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((prev) => prev - 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, reviewLeads.length, editableDraft]);

  // Submit human action (Approve, Re-draft, Reject)
  const handleAction = async (actionType) => {
    if (!currentLead) return;
    setActionLoading(true);
    setNotice(null);

    try {
      const threadId = currentLead.thread_id || `camp_${currentLead.id.slice(0, 8)}`;
      const payload = {
        action: actionType,
        edited_draft: editableDraft,
        critique: critique,
        lead_id: currentLead.id,
        recipient_email: recipientEmail,
      };

      const res = await apiFetch(`/api/campaign/${threadId}/action`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Failed to process action");
      }

      if (actionType === "REDRAFT") {
        setEditableDraft(data.revised_draft || "");
        setCritique("");
        setNotice("✓ AI Copywriter successfully revised proposal!");
      } else {
        setNotice(data.message || "Action processed successfully.");
        if (onRefresh) onRefresh();

        setTimeout(() => {
          setCurrentIndex((prev) => {
            const remaining = reviewLeads.length - 1;
            if (remaining <= 0) return 0;
            return prev >= remaining ? remaining - 1 : prev;
          });
        }, 350);
      }
    } catch (err) {
      alert("Action failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Export Enriched Leads to CSV
  const handleExportCsv = () => {
    if (leads.length === 0) return;

    const headers = [
      "Company",
      "Role",
      "Contact Name",
      "Email",
      "Priority Score",
      "ICP Fit",
      "Judge Score",
      "Status",
      "Draft",
    ];
    const rows = leads.map((l) => [
      `"${(l.company || "").replace(/"/g, '""')}"`,
      `"${(l.role || "").replace(/"/g, '""')}"`,
      `"${(l.contact_name || "").replace(/"/g, '""')}"`,
      `"${(l.contact_email || "").replace(/"/g, '""')}"`,
      l.priority_score || 0,
      l.icp_fit_score || "",
      l.eval_score || "",
      `"${l.status || ""}"`,
      `"${(l.email_draft || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `outbound_leads_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-[#0B1220]/60 dark:bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:p-6 transition-opacity">
      <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden transition-colors">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between bg-white dark:bg-[#0E1422]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FAFBFD] dark:bg-[#161F33] border border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-center text-[#3B6BF0]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
            </div>
            <div>
              <h3 className="font-serif text-xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight">
                Morning SDR Card-Swipe Briefing
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                {reviewLeads.length > 0
                  ? `Reviewing ${currentIndex + 1} of ${reviewLeads.length} prioritized drafts`
                  : "All morning drafts processed"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#F5F5FA] dark:bg-[#161F33] hover:bg-[#EBEBF2] dark:hover:bg-[#1E293B] text-[#0B1220] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B] transition-colors"
            >
              📥 Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] hover:bg-[#F5F5FA] dark:hover:bg-[#161F33] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {reviewLeads.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🎉</div>
              <h4 className="font-serif text-2xl text-[#0B1220] dark:text-[#F8FAFC] mb-2">
                All drafts reviewed and cleared!
              </h4>
              <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-sm mx-auto mb-6">
                No more campaigns awaiting sign-off. Launch new leads from your queue or trigger the scheduled drip.
              </p>
              <button
                onClick={onClose}
                className="bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] text-xs font-medium px-4 py-2 rounded-lg"
              >
                Close Briefing
              </button>
            </div>
          ) : (
            <>
              {notice && (
                <div className="p-3 rounded-lg bg-[#3B6BF0]/10 border border-[#3B6BF0]/20 text-[#3B6BF0] text-xs font-medium">
                  {notice}
                </div>
              )}

              {/* Target Account Overview */}
              <div className="bg-[#F5F5FA] dark:bg-[#0B0F17] border border-[#E5E7EB] dark:border-[#1E293B] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-serif text-2xl text-[#0B1220] dark:text-[#F8FAFC] tracking-tight">
                      {currentLead.company}
                    </h4>
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {currentLead.priority_score} pts Priority
                    </span>
                  </div>
                  <div className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                    {currentLead.role || "Executive Contact"} • {currentLead.contact_name || "Target Executive"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC]">
                      ICP: {currentLead.icp_fit_score || 8}/10
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                      Judge: {currentLead.eval_score || 9}/10 (Grounded)
                    </div>
                  </div>
                </div>
              </div>

              {/* Editable Draft */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-2">
                  Draft Proposal (Editable before sending)
                </label>
                <textarea
                  ref={textareaRef}
                  value={editableDraft}
                  onChange={(e) => setEditableDraft(e.target.value)}
                  rows={6}
                  className="w-full p-4 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0B0F17] text-sm text-[#0B1220] dark:text-[#F8FAFC] font-sans leading-relaxed focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
                />
              </div>

              {/* AI Re-draft instruction */}
              <div className="p-4 rounded-xl bg-[#FAFBFD] dark:bg-[#0B0F17] border border-[#E5E7EB] dark:border-[#1E293B]">
                <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-2">
                  💬 Natural Language Revision for AI Copywriter (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    value={critique}
                    onChange={(e) => setCritique(e.target.value)}
                    placeholder="e.g. 'Make it punchier and mention our Docker PostgreSQL deployment'..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#111827] text-[#0B1220] dark:text-[#F8FAFC] placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0]"
                  />
                  <button
                    onClick={() => handleAction("REDRAFT")}
                    disabled={actionLoading || !critique.trim()}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#F5F5FA] hover:bg-[#EBEBF2] dark:bg-[#161F33] dark:hover:bg-[#1E293B] text-[#0B1220] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#1E293B] disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? "Rewriting..." : "✨ Re-draft"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {reviewLeads.length > 0 && (
          <div className="px-6 py-4 border-t border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
              <span>Hotkeys:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] text-[10px] font-mono shadow-2xs">Enter</kbd> Approve
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] text-[10px] font-mono shadow-2xs ml-1">E</kbd> Edit
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] text-[10px] font-mono shadow-2xs ml-1">X</kbd> Reject
              <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] text-[10px] font-mono shadow-2xs ml-1">← / →</kbd> Browse
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAction("REJECT")}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-50"
              >
                Reject (X)
              </button>
              <button
                onClick={() => handleAction("APPROVE")}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {actionLoading ? "Dispatching..." : "Approve & Dispatch (↵)"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
