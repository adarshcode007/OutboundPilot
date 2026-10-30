import React, { useState, useRef } from 'react';

const API_URL = typeof window !== 'undefined' && window.location.port === "5173" ? "" : "http://localhost:8000";

// Fuzzy header mapping rules
const HEADER_MAP = {
    company: ["company", "company_name", "account", "organization", "firm"],
    role: ["role", "job_title", "title", "position", "target_role"],
    contact_name: ["name", "full_name", "first_name", "contact", "lead_name"],
    contact_email: ["email", "work_email", "contact_email", "email_address"],
};

function normalizeHeader(header) {
    const clean = header.toLowerCase().replace(/[\s_-]+/g, "");
    for (const [standardKey, aliases] of Object.entries(HEADER_MAP)) {
        if (aliases.some(alias => clean.includes(alias.replace(/[\s_-]+/g, "")))) {
            return standardKey;
        }
    }
    return header.trim();
}

// Simple RFC 4180-compliant client-side CSV parser
function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => normalizeHeader(h.replace(/^["']|["']$/g, "")));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        // Regex matches commas quotation marks
        const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v =>
            v.replace(/^["']|["']$/g, '').trim()
        );
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
        });
        // Ensure essential keys exist
        if (row.company || row.contact_email) {
            rows.push(row);
        }
    }
    return rows;
}

export default function CsvUploader({ onUploadSuccess }) {
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const processFile = async (file) => {
        if (!file || !file.name.endsWith('.csv')) {
            setError("Please upload a valid .csv file.");
            return;
        }

        setError(null);
        setUploading(true);

        try {
            const text = await file.text();
            const parsedLeads = parseCsv(text);

            if (parsedLeads.length === 0) {
                throw new Error("CSV file contains no valid lead records.");
            }

            // Send to backend for zero-token regex scoring and PostgreSQL insertion
            const res = await fetch(`${API_URL}/api/leads/upload`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ leads: parsedLeads }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.detail || "Failed to upload leads.");
            }

            const data = await res.json();
            if (onUploadSuccess) {
                onUploadSuccess(data);
            }
        } catch (err) {
            setError(err.message || "Failed to process CSV file.")
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
            <div className="card-header">
                <div className="card-title">
                    <span>📁</span> Batch CSV Ingestion & Auto-Mapper
                </div>
                <span className="pill" style={{ color: "#38bdf8" }}>
                    ⚡ 0 LLM Cost (Regex Scored)
                </span>
            </div>
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragging ? 'rgba(99, 102, 241, 0.08)' : '#080c16',
                    transition: 'all 0.2s ease',
                }}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                />
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#ffffff' }}>
                    {uploading ? "Extracting & Prioritizing Leads..." : "Click or drag & drop target CSV file here"}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    Auto-detects: Company, Target Role, Contact Name, Email
                </div>
            </div>

            {error && (
                <div style={{ marginTop: '0.75rem', padding: '10px 14px', borderRadius: '6px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: '#f87171', fontSize: '0.82rem' }}>
                    {error}
                </div>
            )}
        </div>
    )
}