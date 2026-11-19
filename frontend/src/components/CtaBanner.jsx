import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function CtaBanner({ onNavigate }) {
  return (
    <section className="py-20 md:py-28 bg-white dark:bg-[#0B0F17] border-t border-[#E5E7EB] dark:border-[#1E293B] transition-colors">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="bg-[#FAFBFD] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-3xl p-10 md:p-16 relative overflow-hidden shadow-xs">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#3B6BF0]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#3B6BF0] text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Start Reaching Real Decision Makers</span>
          </div>

          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight leading-tight mb-4 relative z-10">
            Automate your outbound research.
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] dark:text-[#94A3B8] max-w-xl mx-auto leading-relaxed mb-8 relative z-10">
            Experience the precision of deep company research paired with the confidence of 1-click human review.
          </p>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button 
              className="w-full sm:w-auto bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] font-medium text-sm sm:text-base px-6 py-3 rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 group"
              onClick={() => onNavigate("workspace")}
            >
              <span>Open Sales Studio</span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
