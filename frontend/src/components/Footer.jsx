import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-[#0B0F17] border-t border-[#E5E7EB] dark:border-[#1E293B] py-12 transition-colors">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280] dark:text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <span className="font-serif text-base text-[#0B1220] dark:text-[#F8FAFC]">OutboundSDR</span>
          <span>— Autonomous B2B Multi-Agent Workforce</span>
        </div>
        <div className="flex items-center gap-6 font-mono text-[11px]">
          <span>FastAPI 1.0</span>
          <span>LangGraph 1.2</span>
          <span>PostgreSQL 16</span>
        </div>
      </div>
    </footer>
  );
}
