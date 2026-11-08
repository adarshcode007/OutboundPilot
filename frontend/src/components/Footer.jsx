import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-[#E5E7EB] py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
        <div className="flex items-center gap-2">
          <span className="font-serif text-base text-[#0B1220]">OutboundSDR</span>
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
