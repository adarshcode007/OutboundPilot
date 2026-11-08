import React from 'react';

export default function Hero({ onNavigate }) {
  return (
    <section className="pt-16 pb-20 md:pt-24 md:pb-28 max-w-5xl mx-auto px-6 text-center">
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F5FA] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] text-xs font-semibold tracking-wide uppercase text-[#6B7280] dark:text-[#94A3B8] mb-8">
        <span className="text-[#3B6BF0]">✦</span>
        <span>LangGraph &amp; PostgreSQL • Human-in-the-Loop Governance</span>
      </div>

      {/* Main Serif Display H1 */}
      <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight leading-[1.08] mb-6">
        High-precision outbound SDR teams. <br className="hidden sm:inline" />
        <span className="italic text-[#3B6BF0]">Orchestrated by autonomous AI.</span>
      </h1>

      {/* Hero Subhead */}
      <p className="font-sans text-lg md:text-xl text-[#4B5563] dark:text-[#94A3B8] max-w-2xl mx-auto font-normal leading-relaxed mb-10">
        Replace generic cold spam with context-isolated AI agents. Real-time web reconnaissance, deterministic ICP qualification, factually grounded copywriting, and unbreakable human review gates.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16">
        <button 
          className="w-full sm:w-auto bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] font-medium text-base px-6 py-3 rounded-lg transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-2"
          onClick={() => onNavigate("workspace")}
        >
          <span>Launch Workspace</span>
          <span className="text-gray-400 dark:text-gray-600">→</span>
        </button>
        <a 
          href="#architecture"
          className="w-full sm:w-auto bg-[#F5F5FA] hover:bg-[#EBEBF2] dark:bg-[#111827] dark:hover:bg-[#161F33] text-[#0B1220] dark:text-[#F8FAFC] font-medium text-base px-6 py-3 rounded-lg transition-all border border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          Inspect Swarm Architecture
        </a>
      </div>

      {/* Stat Cards - Editorial 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left pt-6 border-t border-[#E5E7EB] dark:border-[#1E293B]">
        <div className="bg-[#F5F5FA] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 transition-all hover:border-gray-300 dark:hover:border-gray-700">
          <div className="font-serif text-3xl md:text-4xl text-[#0B1220] dark:text-[#F8FAFC] tracking-tight mb-1">
            98.4%
          </div>
          <div className="text-sm font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1">
            Factual Grounding Score
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            Actor-Critic LLM judge cross-examines research notes to guarantee zero hallucinated claims.
          </div>
        </div>

        <div className="bg-[#F5F5FA] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 transition-all hover:border-gray-300 dark:hover:border-gray-700">
          <div className="font-serif text-3xl md:text-4xl text-[#0B1220] dark:text-[#F8FAFC] tracking-tight mb-1">
            &lt; 120 Words
          </div>
          <div className="text-sm font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1">
            High-Deliverability Pitch
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            Concise, single-CTA copy engineered specifically for primary inbox delivery.
          </div>
        </div>

        <div className="bg-[#F5F5FA] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 transition-all hover:border-gray-300 dark:hover:border-gray-700">
          <div className="font-serif text-3xl md:text-4xl text-[#0B1220] dark:text-[#F8FAFC] tracking-tight mb-1">
            100%
          </div>
          <div className="text-sm font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1">
            Audit Durability
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            Every prompt, response, and gate transition is persisted immutably in PostgreSQL.
          </div>
        </div>
      </div>
    </section>
  );
}
