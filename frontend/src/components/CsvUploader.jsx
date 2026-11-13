import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { apiFetch } from '../apiClient';

// Smart header normalization rules
function normalizeHeader(header) {
  if (!header) return "";
  const clean = String(header).toLowerCase().replace(/[\s_-]+/g, "");

  // 1. Email check first (prevents "contact email" matching "contact" or "name")
  if (clean.includes("email") || clean.includes("mail")) {
    return "contact_email";
  }

  // 2. Company / Account / Organization
  if (["company", "companyname", "account", "organization", "firm", "business", "client"].some(k => clean.includes(k))) {
    return "company";
  }

  // 3. Role / Job Title / Position
  if (["role", "jobtitle", "title", "position", "targetrole", "occupation", "headline"].some(k => clean.includes(k))) {
    return "role";
  }

  // 4. Contact Name / Full Name / Person
  if (["fullname", "firstname", "lastname", "leadname", "name", "contact", "person"].some(k => clean.includes(k))) {
    return "contact_name";
  }

  return clean;
}

export default function CsvUploader({ onUploadSuccess }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;

    const validExtensions = ['.csv', '.xlsx', '.xls', '.tsv', '.txt'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setError("Please upload a valid CSV or Excel file (.csv, .xlsx, .xls).");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const buffer = await file.arrayBuffer();
      // XLSX parses Excel (.xlsx/.xls) and delimited text (.csv/.tsv) seamlessly
      const workbook = XLSX.read(buffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("Spreadsheet contains no sheets.");
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (!rawRows || rawRows.length === 0) {
        throw new Error("No data rows found in spreadsheet.");
      }

      const parsedLeads = rawRows.map(row => {
        const normalized = {};
        for (const [key, val] of Object.entries(row)) {
          const normKey = normalizeHeader(key);
          normalized[normKey] = typeof val === 'string' ? val.trim() : String(val ?? '').trim();
        }
        return {
          company: normalized.company || "",
          role: normalized.role || "",
          contact_name: normalized.contact_name || "",
          contact_email: normalized.contact_email || "",
        };
      }).filter(lead => lead.company || lead.contact_email);

      if (parsedLeads.length === 0) {
        throw new Error("No valid leads found. Please ensure headers include Company, Role, and Email.");
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
      setError(err.message || "Failed to process lead file.");
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
    <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 mb-6 shadow-xs transition-colors">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E5E7EB] dark:border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">📁</span>
          <h3 className="font-serif text-xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight">
            Batch Lead Ingestion &amp; Auto-Mapper
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F5FA] dark:bg-[#161F33] text-[#3B6BF0] border border-[#E5E7EB] dark:border-[#1E293B]">
            <span>⚡</span>
            <span>0 LLM Tokens (Regex Scored)</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800">
            CSV / XLSX / XLS
          </span>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-[#3B6BF0] bg-[#3B6BF0]/5 dark:bg-[#3B6BF0]/10"
            : "border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0B0F17] hover:bg-[#F5F5FA] dark:hover:bg-[#161F33] hover:border-gray-300 dark:hover:border-gray-700"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx, .xls, .tsv, .txt, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />
        <div className="text-3xl mb-2">📄</div>
        <div className="text-sm font-semibold text-[#0B1220] dark:text-[#F8FAFC]">
          {uploading ? "Extracting & Prioritizing Leads..." : "Click or drag & drop CSV or Excel spreadsheet here"}
        </div>
        <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
          Supports .csv and .xlsx — Auto-detects Company, Target Role, Contact Name, Email
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
