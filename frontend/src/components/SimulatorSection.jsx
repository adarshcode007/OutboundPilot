import React, { useState } from 'react';
import { PRESETS } from '../data/presets';
import { CheckCircle2, XCircle, ArrowRight, Building2, User, Mail, Sparkles, Filter } from 'lucide-react';

export default function SimulatorSection({ onSelectPreset }) {
  const [activeSimIndex, setActiveSimIndex] = useState(0);
  const activeSim = PRESETS[activeSimIndex];

  const isDisqualified = activeSim.company === "Bob's Bakery";

  return (
    <section id="simulator" className="py-20 md:py-28 bg-white dark:bg-[#0B0F17] border-t border-[#E5E7EB] dark:border-[#1E293B] transition-colors">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-semibold tracking-wider uppercase text-[#3B6BF0] mb-2">
            Interactive Preview
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight leading-tight mb-4">
            See how the system decides what to send.
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            Select a prospect scenario below to see how smart qualification filters protect your time and ensure you only reach out to high-potential accounts.
          </p>
        </div>

        {/* Simulator Box */}
        <div className="bg-[#FAFBFD] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 md:p-8 shadow-xs">
          {/* Archetype Selector Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-[#E5E7EB] dark:border-[#1E293B] pb-4">
            {PRESETS.map((p, idx) => {
              const isActive = activeSimIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveSimIndex(idx)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white dark:bg-[#1E293B] text-[#0B1220] dark:text-white shadow-xs border border-[#E5E7EB] dark:border-gray-700"
                      : "text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#161F33]"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>{p.company}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      p.tagType === 'tag-danger'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        : p.tagType === 'tag-warning'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {p.tag}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Simulator Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Account Spec & Evaluation */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B] rounded-xl p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-2xl text-[#0B1220] dark:text-[#F8FAFC] tracking-tight">
                    {activeSim.company}
                  </h3>
                  <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>{activeSim.role}</span>
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${
                    activeSim.tagType === 'tag-danger'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      : activeSim.tagType === 'tag-warning'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {activeSim.tag}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#94A3B8] leading-relaxed">
                {activeSim.desc}
              </p>

              {/* Decision Box */}
              <div className="p-4 rounded-xl bg-[#F5F5FA] dark:bg-[#161F33] border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-[#3B6BF0]" />
                  <span>Automated System Decision:</span>
                </div>
                <div
                  className={`text-xs font-medium leading-relaxed ${
                    isDisqualified
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  {isDisqualified
                    ? "→ Filtered Out Automatically: Does not match target criteria. Stops before writing or sending any email to protect your sender reputation."
                    : "→ High Match Qualified: Gathers real-time company news, crafts a personalized pitch, and queues it for your review."}
                </div>
              </div>

              <button
                onClick={() => onSelectPreset && onSelectPreset(activeSim)}
                className="w-full bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] font-medium text-xs sm:text-sm py-2.5 px-4 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <span>Try this prospect in workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right Column: Visual Outcome */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B] rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Outreach Output Preview
                </div>
                <div className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[#4B5563] dark:text-gray-300">
                  {isDisqualified ? 'Status: Filtered' : 'Status: Ready for Approval'}
                </div>
              </div>

              {isDisqualified ? (
                <div className="p-8 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold text-sm text-[#0B1220] dark:text-white">
                    Outreach Halted (Score 2/10)
                  </h4>
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    Bob's Bakery is a local retail food business with no active software engineering footprint. The system automatically disqualified this lead to prevent sending irrelevant cold emails.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 font-sans text-xs text-[#1F2937] dark:text-gray-200 leading-relaxed bg-[#FAFBFD] dark:bg-[#111827]/60 p-4 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B]">
                  <div className="font-semibold text-[#0B1220] dark:text-white pb-2 border-b border-[#E5E7EB]/60 dark:border-[#1E293B]/60">
                    Subject: {activeSim.company.toLowerCase()} platform &amp; automation
                  </div>

                  <p>Hi {activeSim.name.split(" ")[0]},</p>

                  <p className="text-[#4B5563] dark:text-gray-300">
                    Noticed your team's recent expansion in engineering and modern digital infrastructure.
                  </p>

                  <p className="text-[#3B6BF0] dark:text-blue-400 font-medium">
                    We help companies automate outbound sales research and outreach, reducing manual research time by 80% while keeping every message factually grounded.
                  </p>

                  <p className="text-[#4B5563] dark:text-gray-300">
                    Open to seeing how similar teams handle this, or is this not a priority right now?
                  </p>

                  <div className="pt-2 text-[11px] text-[#6B7280] dark:text-gray-400">
                    <div>Best,</div>
                    <div className="font-semibold text-[#0B1220] dark:text-white">David Miller</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
