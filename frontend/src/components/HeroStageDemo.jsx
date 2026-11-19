import React, { useState, useEffect } from 'react';
import { Search, Target, PenLine, ShieldCheck, CheckCircle2, ArrowRight, Sparkles, Mail, Send, Check } from 'lucide-react';

export default function HeroStageDemo() {
  const [activeStep, setActiveStep] = useState(3); // 1: Research, 2: Match, 3: Draft, 4: Approved
  const [copied, setCopied] = useState(false);

  // Subtle auto-step cycle for smooth demonstration
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto my-12 text-left select-none">
      {/* Subtle background ambient blur */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-[#3B6BF0]/20 via-indigo-500/10 to-[#3B6BF0]/20 rounded-3xl blur-xl opacity-70 dark:opacity-50 pointer-events-none"></div>

      {/* Main Faux App Window */}
      <div className="relative rounded-2xl border border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0E1422] shadow-2xl overflow-hidden transition-all duration-300">
        {/* Window Chrome Header */}
        <div className="h-11 px-4 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#111827] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 dark:bg-rose-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 dark:bg-amber-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 dark:bg-emerald-500/80"></span>
            <span className="ml-3 text-xs font-mono text-[#6B7280] dark:text-[#94A3B8] hidden sm:inline">
              outboundsdr.app / campaign-demo
            </span>
          </div>

          {/* Step Pill Controls */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#0B0F17] p-1 rounded-lg border border-[#E5E7EB] dark:border-[#1E293B]">
            {[
              { id: 1, label: 'Research', icon: Search },
              { id: 2, label: 'Match (9.4/10)', icon: Target },
              { id: 3, label: 'Email Draft', icon: PenLine },
              { id: 4, label: 'Approved', icon: CheckCircle2 },
            ].map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveStep(s.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    isActive
                      ? 'bg-[#0B1220] dark:bg-white text-white dark:text-[#0B1220] shadow-xs'
                      : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Agent</span>
          </div>
        </div>

        {/* Window Body: 2-Column Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
          {/* Left Pane: Prospect Intelligence Card */}
          <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0B0F17]/50 flex flex-col justify-between space-y-5">
            <div>
              {/* Prospect Profile Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B6BF0] to-indigo-600 text-white flex items-center justify-center font-semibold text-sm shadow-sm">
                    DD
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[#0B1220] dark:text-[#F8FAFC]">
                      Alexis Martin
                    </h4>
                    <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
                      VP of Engineering • Datadog
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Great Match
                </span>
              </div>

              {/* Research Insights Accordion */}
              <div className="space-y-3 font-sans text-xs">
                <div className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] shadow-2xs">
                  <div className="flex items-center gap-1.5 font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                    <Search className="w-3.5 h-3.5 text-[#3B6BF0]" />
                    <span>Verified Company Signals</span>
                  </div>
                  <p className="text-[#6B7280] dark:text-[#94A3B8] leading-relaxed text-[11px]">
                    Expanding real-time cloud telemetry and distributed infrastructure monitoring. Hiring 15+ backend and platform engineers.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] shadow-2xs">
                  <div className="flex items-center gap-1.5 font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                    <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Target Match Rating</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                    <span>Opportunity Score</span>
                    <span className="font-semibold text-[#0B1220] dark:text-[#F8FAFC]">
                      9.4 / 10
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: '94%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Checklist */}
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Fact-Checked Notes</span>
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>0 Spam Words</span>
              </span>
            </div>
          </div>

          {/* Right Pane: Generated Email Pitch */}
          <div className="lg:col-span-7 p-6 flex flex-col justify-between bg-white dark:bg-[#0E1422] space-y-4">
            <div>
              {/* Email Header Bar */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E5E7EB] dark:border-[#1E293B] text-xs">
                <div className="flex items-center gap-2 text-[#6B7280] dark:text-[#94A3B8]">
                  <Mail className="w-3.5 h-3.5" />
                  <span>To: <strong>alexis@datadog.com</strong></span>
                </div>
                <div className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[#4B5563] dark:text-gray-300">
                  PAS Framework • 84 words
                </div>
              </div>

              {/* Email Content Box */}
              <div className="space-y-3 font-sans text-xs text-[#1F2937] dark:text-gray-200 leading-relaxed bg-[#FAFBFD] dark:bg-[#111827]/60 p-4 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="font-semibold text-[#0B1220] dark:text-white pb-2 border-b border-[#E5E7EB]/60 dark:border-[#1E293B]/60">
                  Subject: datadog infra scaling &amp; automation
                </div>

                <p>Hi Alexis,</p>

                <p className="text-[#4B5563] dark:text-gray-300">
                  Noticed your team's expansion in real-time distributed telemetry and streaming infrastructure across multi-cloud regions.
                </p>

                <p className="text-[#3B6BF0] dark:text-blue-400 font-medium">
                  We built an autonomous workforce that cuts manual research time by 80% and guarantees zero hallucinated claims, booking 15-30 qualified conversations each month.
                </p>

                <p className="text-[#4B5563] dark:text-gray-300">
                  Open to seeing how similar platform teams handle this, or is this not a priority right now?
                </p>

                <div className="pt-2 text-[11px] text-[#6B7280] dark:text-gray-400">
                  <div>Best,</div>
                  <div className="font-semibold text-[#0B1220] dark:text-white">David Miller</div>
                  <div>Enterprise Growth • OutboundPilot</div>
                </div>
              </div>
            </div>

            {/* Action Footer: Review & Approve */}
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>You hold the send key: 1-click approval required</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveStep(4);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                    activeStep === 4
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#3B6BF0] hover:bg-blue-600 text-white'
                  }`}
                >
                  {activeStep === 4 ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Approved &amp; Sent</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Approve &amp; Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Satellite Card (Stageshow Pattern) */}
        <div className="hidden md:flex absolute -bottom-5 right-8 items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#161F33] border border-[#E5E7EB] dark:border-[#1E293B] shadow-xl text-xs">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-[#0B1220] dark:text-[#F8FAFC]">
              Verified Domain Delivery
            </div>
            <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
              Lands directly in primary inbox • Zero spam
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
