import React, { useState, useEffect } from 'react';

const API_URL = typeof window !== 'undefined' && window.location.port === "5173" ? "" : "http://localhost:8000";

export default function LeadTable({
    leads = [],
    quota = { daily_limit: 10, used_today: 0, remaining_today: 10 },
    onRefresh,
    onOpenBriefing,
}) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("")
    const [processing, setProcessing] = useState(false)
    const [actionNotice, setActionNotice] = useState(null);
    const [schedulerInfo, setSchedulerInfo] = useState(null)

    // Fetch live scheduler status
    const fetchSchedulerStatus = async () => {
        try {
            const res = await fetch(`${API_URL}/api/scheduler/status`);
            if (res.ok) {
                const data = await res.json();
                setSchedulerInfo(data);
            }
        } catch (e) {
            console.warn("Scheduler status fetch error: ", e)
        }
    }

    useEffect(() => {
        fetchSchedulerStatus();
    }, []);

    // Filter leads based on search term
    const filteredLeads = leads.filter(l => {
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
        const queuedVisible = filteredLeads.filter(l => l.status === "QUEUED");
        if (selectedIds.size === queuedVisible.length && queuedVisible.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(queuedVisible.map(l => l.id)));
        }
    };

    // Launch campaign for selected leads
    const handleProcessSelected = async () => {
        if (selectedIds.size === 0) return;

        if (selectedIds.size > quota.remaining_today) {
            alert(`Quota Warning: You selected ${selectedIds.size} leads, but only ${quota.remaining_today} slots remain today.`);
            return;
        }

        setProcessing(true);
        setActionNotice(null);

        try {
            const res = await fetch(`${API_URL}/api/leads/process-selected`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lead_ids: Array.from(selectedIds) }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Failed to process selected leads.")
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
            const res = await fetch(`${API_URL}/api/scheduler/run-now`, {
                method: "POST"
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
    const draftedCount = leads.filter(l => l.status === "DRAFTED").length;

    return (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
            {/* Top Header & Quota Counter */}
            <div className="card-header" style={{ flexWrap: "wrap", gap: "12px" }}>
                <div>
                    <div className="card-title">
                        <span>📋</span> Prioritized Target Lead Queue
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-dim)", marginTop: "4px" }}>
                        Sorted by Regex Smart Priority Score (0–100) • Zero LLM tokens spent on ranking
                    </div>
                </div>

                {/* Live Daily Quota & Scheduler Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {schedulerInfo && (
                        <div className="pill" style={{ borderColor: "rgba(56, 189, 248, 0.4)", color: "#38bdf8" }}>
                            <span>⏰</span>
                            <strong>{schedulerInfo.target_time} AM</strong> Auto-Drip
                            {schedulerInfo.is_processing && (
                                <span className="tag tag-warning pulse-anim" style={{ fontSize: "0.65rem", padding: "2px 6px", marginLeft: "4px" }}>
                                    Running...
                                </span>
                            )}
                        </div>
                    )}

                    <div className="pill" style={{ borderColor: quota.remaining_today > 0 ? "var(--success-border)" : "var(--danger-border)" }}>
                        <span style={{ color: quota.remaining_today > 0 ? "var(--success)" : "var(--danger)" }}>●</span>
                        <strong>{quota.remaining_today} / {quota.daily_limit}</strong> Daily Quota Remaining
                    </div>
                    <button
                        className="btn btn-secondary"
                        style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                        onClick={() => {
                            if (onRefresh) onRefresh();
                            fetchSchedulerStatus();
                        }}
                    >
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* Action Bar & Controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "1rem", flexWrap: "wrap" }}>
                {/* Search Input */}
                <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter by company, role, or contact name..."
                    style={{ maxWidth: "340px", fontSize: "0.85rem", padding: "8px 12px" }}
                />

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                    {draftedCount > 0 && (
                        <button
                            className="btn btn-primary"
                            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 15px rgba(245, 158, 11, 0.3)" }}
                            onClick={onOpenBriefing}
                        >
                            ☀️ Open Morning Briefing ({draftedCount} Ready)
                        </button>
                    )}

                    <button
                        className="btn btn-outline"
                        style={{ fontSize: "0.85rem" }}
                        onClick={handleTriggerCron}
                        disabled={processing || quota.remaining_today <= 0}
                    >
                        ⏰ Run Scheduled Drip
                    </button>
                    <button
                        className="btn btn-primary"
                        style={{ fontSize: "0.85rem" }}
                        onClick={handleProcessSelected}
                        disabled={processing || selectedIds.size === 0}
                    >
                        {processing ? "Orchestrating..." : `⚡ Launch Selected (${selectedIds.size})`}
                    </button>
                </div>
            </div>

            {/* Action Feedback Notice */}
            {actionNotice && (
                <div style={{ background: "rgba(99, 102, 241, 0.12)", border: "1px solid var(--border-accent)", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", color: "#a5b4fc", marginBottom: "1rem" }}>
                    {actionNotice}
                </div>
            )}

            {/* Data Table */}
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-dim)", textTransform: "uppercase", fontSize: "0.72rem", letterSpacing: "0.05em" }}>
                            <th style={{ padding: "10px 12px", width: "40px" }}>
                                <input
                                    type="checkbox"
                                    onChange={toggleSelectAll}
                                    checked={
                                        filteredLeads.filter(l => l.status === "QUEUED").length > 0 &&
                                        selectedIds.size === filteredLeads.filter(l => l.status === "QUEUED").length
                                    }
                                />
                            </th>
                            <th style={{ padding: "10px 12px" }}>Priority</th>
                            <th style={{ padding: "10px 12px" }}>Target Account</th>
                            <th style={{ padding: "10px 12px" }}>Executive Contact</th>
                            <th style={{ padding: "10px 12px" }}>Status</th>
                            <th style={{ padding: "10px 12px" }}>AI Signals</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeads.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-dim)" }}>
                                    No leads in queue. Upload a CSV above or add target accounts!
                                </td>
                            </tr>
                        ) : (
                            filteredLeads.map((lead) => {
                                const isSelected = selectedIds.has(lead.id);
                                const isQueued = lead.status === "QUEUED";
                                return (
                                    <tr
                                        key={lead.id}
                                        style={{
                                            borderBottom: "1px solid var(--border-subtle)",
                                            background: isSelected ? "rgba(99, 102, 241, 0.08)" : "transparent",
                                            transition: "background-color 0.15s ease",
                                        }}
                                    >
                                        {/* Checkbox */}
                                        <td style={{ padding: "12px" }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                disabled={!isQueued}
                                                onChange={() => toggleSelectOne(lead.id)}
                                            />
                                        </td>
                                        {/* Priority Badge */}
                                        <td style={{ padding: "12px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span
                                                    className="tag"
                                                    style={{
                                                        fontSize: "0.7rem",
                                                        padding: "2px 8px",
                                                        background:
                                                            lead.priority_tier === "HIGH" ? "var(--success-bg)" :
                                                                lead.priority_tier === "MEDIUM" ? "var(--warning-bg)" : "rgba(100, 116, 139, 0.15)",
                                                        color:
                                                            lead.priority_tier === "HIGH" ? "#34d399" :
                                                                lead.priority_tier === "MEDIUM" ? "#fbbf24" : "#94a3b8",
                                                        border: `1px solid ${lead.priority_tier === "HIGH" ? "var(--success-border)" :
                                                            lead.priority_tier === "MEDIUM" ? "var(--warning-border)" : "rgba(100, 116, 139, 0.3)"
                                                            }`,
                                                    }}
                                                >
                                                    {lead.priority_score} pts
                                                </span>
                                            </div>
                                        </td>
                                        {/* Company */}
                                        <td style={{ padding: "12px" }}>
                                            <strong style={{ color: "#ffffff", fontSize: "0.9rem" }}>{lead.company}</strong>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                                                {lead.role || "Executive"}
                                            </div>
                                        </td>
                                        {/* Contact */}
                                        <td style={{ padding: "12px" }}>
                                            <div style={{ color: "var(--text-high)" }}>{lead.contact_name || "—"}</div>
                                            <div style={{ fontSize: "0.75rem", fontFamily: "JetBrains Mono", color: "var(--text-muted)" }}>
                                                {lead.contact_email || "No email"}
                                            </div>
                                        </td>
                                        {/* Status Pill */}
                                        <td style={{ padding: "12px" }}>
                                            <span
                                                className={`tag ${lead.status === "DRAFTED" ? "tag-warning" :
                                                    lead.status === "APPROVED" || lead.status === "DISPATCHED" ? "tag-success" :
                                                        lead.status === "DISQUALIFIED" ? "tag-danger" : "tag-info"
                                                    }`}
                                                style={{ fontSize: "0.68rem" }}
                                            >
                                                {lead.status === "DRAFTED" ? "Ready for Review" : lead.status}
                                            </span>
                                        </td>
                                        {/* AI Signals & Tags */}
                                        <td style={{ padding: "12px" }}>
                                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", maxWidth: "260px" }}>
                                                {(lead.priority_tags || []).slice(0, 2).map((t, idx) => (
                                                    <span
                                                        key={idx}
                                                        style={{
                                                            fontSize: "0.65rem",
                                                            padding: "1px 6px",
                                                            borderRadius: "4px",
                                                            background: "#080c16",
                                                            border: "1px solid var(--border-subtle)",
                                                            color: "#a5b4fc",
                                                        }}
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
    )
}