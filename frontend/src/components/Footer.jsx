import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-[#0B0F17] border-t border-[#E5E7EB] dark:border-[#1E293B] py-10 transition-colors">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B7280] dark:text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <span className="font-serif text-sm font-normal text-[#0B1220] dark:text-[#F8FAFC]">OutboundSDR</span>
          <span>— Intelligent Sales Outreach &amp; Candidate Studio</span>
        </div>
        <div className="flex items-center gap-5 text-[11px]">
          <a href="/privacy" target="_blank" rel="noreferrer" className="hover:text-[#0B1220] dark:hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="/terms" target="_blank" rel="noreferrer" className="hover:text-[#0B1220] dark:hover:text-white transition-colors">
            Terms of Service
          </a>
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            All Systems Operational
          </span>
        </div>
      </div>
    </footer>
  );
}
