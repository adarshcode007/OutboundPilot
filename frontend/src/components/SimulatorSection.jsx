import React, { useState } from 'react';
import { PRESETS } from '../data/presets';

export default function SimulatorSection({ onSelectPreset }) {
  const [activeSimIndex, setActiveSimIndex] = useState(0);
  const activeSim = PRESETS[activeSimIndex];

  return (
    <section id="simulator" className="py-20 md:py-28 bg-white border-t border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-semibold tracking-wider uppercase text-[#3B6BF0] mb-2">
            Interactive Simulator
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0B1220] tracking-tight leading-tight mb-4">
            See autonomous decision making in action.
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] leading-relaxed">
            Select an account archetype below to verify how multi-agent guardrails qualify leads and halt spam before it starts.
          </p>
        </div>

        {/* Simulator Box */}
        <div className="bg-[#F5F5FA] border border-[#E5E7EB] rounded-2xl p-6 md:p-8">
          {/* Archetype Selector Tabs */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-[#E5E7EB] pb-4">
            {PRESETS.map((p, idx) => {
              const isActive = activeSimIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveSimIndex(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white text-[#0B1220] shadow-xs border border-[#E5E7EB]"
                      : "text-[#6B7280] hover:text-[#0B1220] hover:bg-white/60"
                  }`}
                >
                  <span>{p.company}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                      p.tagType === 'tag-danger'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : p.tagType === 'tag-warning'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
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
            <div className="lg:col-span-5 bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-xs">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-serif text-2xl text-[#0B1220] tracking-tight">
                    {activeSim.company}
                  </h3>
                  <div className="text-xs text-[#6B7280] mt-0.5">
                    {activeSim.role} • {activeSim.email}
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full ${
                    activeSim.tagType === 'tag-danger'
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : activeSim.tagType === 'tag-warning'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {activeSim.tag}
                </span>
              </div>

              <p className="text-sm text-[#4B5563] leading-relaxed mb-6">
                {activeSim.desc}
              </p>

              <div className="p-4 rounded-lg bg-[#F5F5FA] border border-[#E5E7EB] mb-6">
                <div className="text-xs font-semibold text-[#0B1220] uppercase tracking-wide mb-1.5">
                  Pipeline Decision:
                </div>
                <div
                  className={`text-xs font-medium ${
                    activeSim.company === "Bob's Bakery"
                      ? "text-rose-600"
                      : "text-emerald-700"
                  }`}
                >
                  {activeSim.company === "Bob's Bakery"
                    ? "→ Aborts early at Step 2 (Analyst). Protects sender reputation & saves tokens."
                    : "→ Qualified. Executes web recon, passes 8/10 Judge, pauses for HITL review."}
                </div>
              </div>

              <button
                className="w-full bg-[#0B1220] hover:bg-[#1E293B] text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all shadow-xs active:scale-[0.98] flex items-center justify-center gap-2"
                onClick={() => onSelectPreset(activeSim)}
              >
                <span>Test {activeSim.company} in Live Workspace</span>
                <span>→</span>
              </button>
            </div>

            {/* Right Column: State Machine JSON Snapshot */}
            <div className="lg:col-span-7 bg-[#0B1220] text-gray-200 rounded-xl p-6 font-mono text-xs leading-relaxed overflow-x-auto shadow-sm">
              <div className="text-gray-500 mb-3 border-b border-gray-800 pb-2 flex items-center justify-between">
                <span>// LangGraph State Machine Checkpoint ({activeSim.company})</span>
                <span className="text-[10px] uppercase text-emerald-400">PostgreSQL Checked</span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <span className="text-sky-300">target_account:</span>{" "}
                  <span className="text-amber-200">"{activeSim.company}"</span>
                </div>
                <div>
                  <span className="text-sky-300">target_executive:</span>{" "}
                  <span className="text-amber-200">"{activeSim.name} ({activeSim.role})"</span>
                </div>
                <div>
                  <span className="text-sky-300">analyst_score:</span>{" "}
                  <span className={activeSim.company === "Bob's Bakery" ? "text-rose-400" : "text-emerald-400"}>
                    {activeSim.company === "Bob's Bakery" ? "2/10 [DISQUALIFIED - EARLY EXIT]" : "9/10 [QUALIFIED]"}
                  </span>
                </div>
                <div>
                  <span className="text-sky-300">evaluator_guardrail:</span>{" "}
                  <span className="text-emerald-400">
                    {activeSim.company === "Bob's Bakery" ? "SKIPPED_EARLY_EXIT" : "8/10 PASS (Grounding: 9/10, Deliv: 9/10)"}
                  </span>
                </div>
                <div>
                  <span className="text-sky-300">hitl_checkpoint:</span>{" "}
                  <span className="text-amber-300">
                    {activeSim.company === "Bob's Bakery" ? "NONE" : "PAUSED_BEFORE_DISPATCH"}
                  </span>
                </div>
                <div>
                  <span className="text-sky-300">audit_postgres_id:</span>{" "}
                  <span className="text-gray-400">"camp_a7e2b109"</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
