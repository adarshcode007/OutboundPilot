import React from 'react';

export default function CtaBanner({ onNavigate }) {
  return (
    <section className="py-20 md:py-28 bg-white dark:bg-[#0B0F17] border-t border-[#E5E7EB] dark:border-[#1E293B] transition-colors">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="bg-[#F5F5FA] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-3xl p-10 md:p-16 relative overflow-hidden">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#3B6BF0]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight leading-tight mb-4 relative z-10">
            Deploy your autonomous SDR swarm.
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed mb-8 relative z-10">
            Experience the precision of multi-agent intelligence paired with the control of human-in-the-loop review.
          </p>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button 
              className="w-full sm:w-auto bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] font-medium text-base px-6 py-3 rounded-lg transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-2"
              onClick={() => onNavigate("workspace")}
            >
              <span>Launch Live Command Center</span>
              <span className="text-gray-400 dark:text-gray-600">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
