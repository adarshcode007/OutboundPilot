import React from 'react';

export default function Navbar({ onNavigate }) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E5E7EB] transition-colors">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group select-none"
          onClick={() => onNavigate("landing")}
        >
          <div className="w-8 h-8 rounded-lg bg-[#0B1220] flex items-center justify-center text-white text-sm font-bold shadow-xs transition-transform group-hover:scale-105">
            ⚡
          </div>
          <div>
            <div className="font-serif text-xl text-[#0B1220] tracking-tight leading-tight">
              OutboundSDR
            </div>
            <div className="text-[11px] font-sans text-[#6B7280] tracking-wide uppercase">
              Autonomous B2B Swarm
            </div>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a 
            href="#architecture" 
            className="text-sm font-medium text-[#6B7280] hover:text-[#0B1220] transition-colors"
          >
            Architecture
          </a>
          <a 
            href="#simulator" 
            className="text-sm font-medium text-[#6B7280] hover:text-[#0B1220] transition-colors"
          >
            Live Simulator
          </a>
          <a 
            href="#security" 
            className="text-sm font-medium text-[#6B7280] hover:text-[#0B1220] transition-colors"
          >
            Guardrails
          </a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5F5FA] text-[#6B7280] border border-[#E5E7EB]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Engine Online
          </div>
          <button 
            className="bg-[#0B1220] hover:bg-[#1E293B] text-white text-sm font-medium px-4 py-2 rounded-lg transition-all shadow-xs active:scale-[0.98]"
            onClick={() => onNavigate("workspace")}
          >
            Launch Workspace →
          </button>
        </div>
      </div>
    </header>
  );
}
