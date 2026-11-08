import React from 'react';

export default function CtaBanner({ onNavigate }) {
  return (
    <section className="py-20 md:py-28 bg-white border-t border-[#E5E7EB]">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="bg-[#F5F5FA] border border-[#E5E7EB] rounded-3xl p-10 md:p-16 relative overflow-hidden">
          {/* Subtle accent glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#3B6BF0]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0B1220] tracking-tight leading-tight mb-4 relative z-10">
            Deploy your autonomous SDR swarm.
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] max-w-xl mx-auto leading-relaxed mb-8 relative z-10">
            Experience the precision of multi-agent intelligence paired with the control of human-in-the-loop review.
          </p>

          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              className="w-full sm:w-auto bg-[#0B1220] hover:bg-[#1E293B] text-white font-medium text-base px-6 py-3 rounded-lg transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-2"
              onClick={() => onNavigate("workspace")}
            >
              <span>Launch Live Command Center</span>
              <span className="text-gray-400">→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
