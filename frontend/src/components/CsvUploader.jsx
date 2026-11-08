import React, { useState, useRef } from 'react';
import { apiFetch } from '../apiClient';

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
    const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v =>
      v.replace(/^["']|["']$/g, '').trim()
    );
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || "";
    });
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
      const res = await apiFetch("/api/leads/upload", {
        method: "POST",
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
      setError(err.message || "Failed to process CSV file.");
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
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 mb-6 shadow-xs">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📁</span>
          <h3 className="font-serif text-xl font-normal text-[#0B1220] tracking-tight">
            Batch CSV Ingestion &amp; Auto-Mapper
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F5FA] text-[#3B6BF0] border border-[#E5E7EB]">
          <span>⚡</span>
          <span>0 LLM Tokens (Regex Scored)</span>
        </span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-[#3B6BF0] bg-[#3B6BF0]/5"
            : "border-[#E5E7EB] bg-[#FAFBFD] hover:bg-[#F5F5FA] hover:border-gray-300"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />
        <div className="text-3xl mb-2">📄</div>
        <div className="text-sm font-semibold text-[#0B1220]">
          {uploading ? "Extracting & Prioritizing Leads..." : "Click or drag & drop target CSV file here"}
        </div>
        <div className="text-xs text-[#6B7280] mt-1">
          Auto-detects: Company, Target Role, Contact Name, Email
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
