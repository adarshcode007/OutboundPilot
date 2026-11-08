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

  // 3-Touch Cadence State
  const [cadence, setCadence] = useState(null);
  const [activeTouchStep, setActiveTouchStep] = useState(1);
  const [cadenceLoading, setCadenceLoading] = useState(false);

  const textareaRef = useRef(null);
  const currentLead = reviewLeads[currentIndex] || null;

  // Fetch stored cadence for the active lead
  const fetchCadence = async (leadId) => {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/cadence`);
      if (res.ok) {
        const data = await res.json();
        setCadence(data.cadence || null);
        if (data.cadence?.touch_1?.body) {
          setEditableDraft((prev) => (prev && prev.trim() ? prev : data.cadence.touch_1.body));
        }
      } else {
        setCadence(null);
      }
    } catch (e) {
      setCadence(null);
    }
  };

  // Sync draft and cadence when switching cards
  useEffect(() => {
    if (currentLead) {
      const initialDraft = currentLead.email_draft || currentLead.cadence?.touch_1?.body || "";
      setEditableDraft(initialDraft);
      setRecipientEmail(currentLead.contact_email || "");
      setCritique("");
      setNotice(null);
      setActiveTouchStep(1);
      fetchCadence(currentLead.id);
    }
  }, [currentIndex, currentLead?.id]);

  // Generate 3-Touch Cadence on-demand
  const handleGenerateCadence = async () => {
    if (!currentLead) return;
    setCadenceLoading(true);
    setNotice(null);

    try {
      const res = await apiFetch(`/api/leads/${currentLead.id}/cadence/generate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate cadence");
      const data = await res.json();
      setCadence(data.cadence);
      if (data.cadence?.touch_1?.body) {
        setEditableDraft(data.cadence.touch_1.body);
      }
      setNotice("✓ Successfully generated 3-touch follow-up cadence!");
    } catch (err) {
      alert("Cadence generation error: " + err.message);
    } finally {
      setCadenceLoading(false);
    }
  };

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
    <div className="fixed inset-0 bg-[#0B1220]/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:p-6 transition-opacity">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <span className="text-xl">☀️</span>
            <div>
              <h3 className="font-serif text-xl font-normal text-[#0B1220] tracking-tight">
                Morning SDR Card-Swipe Briefing
              </h3>
              <p className="text-xs text-[#6B7280]">
                {reviewLeads.length > 0
                  ? `Reviewing ${currentIndex + 1} of ${reviewLeads.length} prioritized drafts`
                  : "All morning drafts processed"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#F5F5FA] hover:bg-[#EBEBF2] text-[#0B1220] border border-[#E5E7EB] transition-colors"
            >
              📥 Export CSV
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#0B1220] hover:bg-[#F5F5FA] transition-colors"
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
              <h4 className="font-serif text-2xl text-[#0B1220] mb-2">
                All drafts reviewed and cleared!
              </h4>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto mb-6">
                No more campaigns awaiting sign-off. Launch new leads from your queue or trigger the scheduled drip.
              </p>
              <button
                onClick={onClose}
                className="bg-[#0B1220] text-white text-xs font-medium px-4 py-2 rounded-lg"
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
              <div className="bg-[#F5F5FA] border border-[#E5E7EB] rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-serif text-2xl text-[#0B1220] tracking-tight">
                      {currentLead.company}
                    </h4>
                    <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {currentLead.priority_score} pts Priority
                    </span>
                  </div>
                  <div className="text-xs text-[#6B7280]">
                    {currentLead.role || "Executive Contact"} • {currentLead.contact_name || "Target Executive"}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-[#0B1220]">
                      ICP: {currentLead.icp_fit_score || 8}/10
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      Judge: {currentLead.eval_score || 9}/10 (Grounded)
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-Touch Follow-up Cadence Selector */}
              <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] flex items-center gap-1.5">
                    <span>📅</span>
                    <span>3-Touch Outbound Cadence</span>
                  </div>
                  {!cadence && (
                    <button
                      onClick={handleGenerateCadence}
                      disabled={cadenceLoading}
                      className="text-xs text-[#3B6BF0] hover:underline font-medium"
                    >
                      {cadenceLoading ? "Generating..." : "Generate 3-Touch Follow-ups"}
                    </button>
                  )}
                </div>

                {cadence && (
                  <div className="flex gap-2">
                    {[
                      { step: 1, label: "Touch 1: Hook (Day 1)", data: cadence.touch_1 },
                      { step: 2, label: "Touch 2: Value Bump (Day 3)", data: cadence.touch_2 },
                      { step: 3, label: "Touch 3: Breakup (Day 7)", data: cadence.touch_3 },
                    ].map((t) => (
                      <button
                        key={t.step}
                        onClick={() => {
                          setActiveTouchStep(t.step);
                          if (t.data?.body) setEditableDraft(t.data.body);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeTouchStep === t.step
                            ? "bg-[#0B1220] text-white"
                            : "bg-[#F5F5FA] text-[#6B7280] hover:text-[#0B1220] border border-[#E5E7EB]"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Editable Draft */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-2">
                  Draft Proposal (Editable before sending)
                </label>
                <textarea
                  ref={textareaRef}
                  value={editableDraft}
                  onChange={(e) => setEditableDraft(e.target.value)}
                  rows={6}
                  className="w-full p-4 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#0B1220] font-sans leading-relaxed focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
                />
              </div>

              {/* AI Re-draft instruction */}
              <div className="p-4 rounded-xl bg-[#FAFBFD] border border-[#E5E7EB]">
                <label className="block text-xs font-semibold text-[#0B1220] mb-2">
                  💬 Natural Language Revision for AI Copywriter (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    value={critique}
                    onChange={(e) => setCritique(e.target.value)}
                    placeholder="e.g. 'Make it punchier and mention our Docker PostgreSQL deployment'..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-[#E5E7EB] bg-white focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0]"
                  />
                  <button
                    onClick={() => handleAction("REDRAFT")}
                    disabled={actionLoading || !critique.trim()}
                    className="px-3.5 py-2 text-xs font-medium rounded-lg bg-[#F5F5FA] hover:bg-[#EBEBF2] text-[#0B1220] border border-[#E5E7EB] disabled:opacity-50 transition-colors"
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
          <div className="px-6 py-4 border-t border-[#E5E7EB] bg-[#FAFBFD] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#6B7280]">
              <span>Hotkeys:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E5E7EB] text-[10px] font-mono shadow-2xs">Enter</kbd> Approve
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E5E7EB] text-[10px] font-mono shadow-2xs ml-1">E</kbd> Edit
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E5E7EB] text-[10px] font-mono shadow-2xs ml-1">X</kbd> Reject
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-[#E5E7EB] text-[10px] font-mono shadow-2xs ml-1">← / →</kbd> Browse
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleAction("REJECT")}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors disabled:opacity-50"
              >
                Reject (X)
              </button>
              <button
                onClick={() => handleAction("APPROVE")}
                disabled={actionLoading}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-[#0B1220] hover:bg-[#1E293B] text-white shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
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
