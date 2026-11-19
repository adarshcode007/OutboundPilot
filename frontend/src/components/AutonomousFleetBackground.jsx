import React from 'react';
import { Target, ShieldCheck, CheckCircle2, TrendingUp, Sparkles, Zap, MailCheck, Bot } from 'lucide-react';

export default function AutonomousFleetBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      {/* 1. Subtle Engineering Dot Grid */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] dark:bg-[radial-gradient(#1E293B_1.2px,transparent_1.2px)] [background-size:28px_28px] opacity-40 dark:opacity-30" 
      />

      {/* 2. Soft Ambient Luminous Glow Orbs (Subtle Breathing Depth) */}
      <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-[#3B6BF0]/5 dark:bg-[#3B6BF0]/8 blur-[120px] animate-pulse" />
      <div className="absolute top-1/2 -right-32 w-[600px] h-[600px] rounded-full bg-indigo-500/4 dark:bg-indigo-500/6 blur-[140px]" />
      <div className="absolute -bottom-32 left-1/3 w-[550px] h-[550px] rounded-full bg-sky-500/4 dark:bg-sky-500/6 blur-[130px]" />

      {/* 3. Left Flank Autonomous Fleet Stream */}
      <div className="absolute left-3 xl:left-8 2xl:left-14 top-0 bottom-0 w-64 hidden lg:flex flex-col justify-around py-16">
        
        {/* Fleet Card 1: Datadog (High ICP Match) */}
        <div 
          className="fleet-card p-3 rounded-xl bg-white/75 dark:bg-[#111827]/75 backdrop-blur-md border border-[#E5E7EB]/80 dark:border-[#1E293B]/80 shadow-xs transition-all duration-300 hover:opacity-100 opacity-60 hover:scale-[1.02]"
          style={{ animation: 'fleetFloat1 20s ease-in-out infinite' }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center font-bold text-[10px]">
                D
              </div>
              <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Datadog</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              94% Match
            </span>
          </div>
          <div className="text-[11px] text-[#4B5563] dark:text-[#94A3B8] font-medium leading-tight">
            Alexis Vance • VP Growth
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#64748B]">
            <Target className="w-3 h-3 text-[#3B6BF0]" />
            <span>3 web buying signals verified</span>
          </div>
        </div>

        {/* Fleet Card 2: Snowflake (Fact-Check Passed) */}
        <div 
          className="fleet-card p-3 rounded-xl bg-white/75 dark:bg-[#111827]/75 backdrop-blur-md border border-[#E5E7EB]/80 dark:border-[#1E293B]/80 shadow-xs transition-all duration-300 hover:opacity-100 opacity-55 hover:scale-[1.02]"
          style={{ animation: 'fleetFloat2 24s ease-in-out infinite 2s' }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#0284C7]/15 text-[#0284C7] flex items-center justify-center font-bold text-[10px]">
                S
              </div>
              <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Snowflake</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#3B6BF0] border border-blue-200 dark:border-blue-800">
              Fact-Check 10/10
            </span>
          </div>
          <div className="text-[11px] text-[#4B5563] dark:text-[#94A3B8] font-medium leading-tight">
            David K. • Sales Engineering
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#64748B]">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>0 hallucinations • Grounded</span>
          </div>
        </div>

        {/* Fleet Card 3: Notion (Human Review Gate) */}
        <div 
          className="fleet-card p-3 rounded-xl bg-white/75 dark:bg-[#111827]/75 backdrop-blur-md border border-[#E5E7EB]/80 dark:border-[#1E293B]/80 shadow-xs transition-all duration-300 hover:opacity-100 opacity-60 hover:scale-[1.02]"
          style={{ animation: 'fleetFloat1 22s ease-in-out infinite 4s' }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-[10px]">
                N
              </div>
              <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Notion</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Ready for Review
            </span>
          </div>
          <div className="text-[11px] text-[#4B5563] dark:text-[#94A3B8] font-medium leading-tight">
            3-Para Problem-Agitate-Solve
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#64748B]">
            <Sparkles className="w-3 h-3 text-[#3B6BF0]" />
            <span>Awaiting one-click approval</span>
          </div>
        </div>

        {/* Fleet Card 4: Linear (Automated Sequence Dispatched) */}
        <div 
          className="fleet-card p-3 rounded-xl bg-white/75 dark:bg-[#111827]/75 backdrop-blur-md border border-[#E5E7EB]/80 dark:border-[#1E293B]/80 shadow-xs transition-all duration-300 hover:opacity-100 opacity-55 hover:scale-[1.02]"
          style={{ animation: 'fleetFloat2 26s ease-in-out infinite 1s' }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#5E6AD2]/15 text-[#5E6AD2] flex items-center justify-center font-bold text-[10px]">
                L
              </div>
              <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Linear</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Dispatched
            </span>
          </div>
          <div className="text-[11px] text-[#4B5563] dark:text-[#94A3B8] font-medium leading-tight">
            Sent via Google Workspace
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#64748B]">
            <MailCheck className="w-3 h-3 text-emerald-500" />
            <span>Thread #camp_8f21 live</span>
          </div>
        </div>

      </div>

      {/* 4. Right Flank Autonomous Fleet Stream */}
      <div className="absolute right-3 xl:right-8 2xl:right-14 top-0 bottom-0 w-64 hidden lg:flex flex-col justify-around py-16">
        
        {/* Fleet Card 5: Stripe (Verified Domain Delivery) */}
        <div 
          className="fleet-card p-3 rounded-xl bg-white/75 dark:bg-[#111827]/75 backdrop-blur-md border border-[#E5E7EB]/80 dark:border-[#1E293B]/80 shadow-xs transition-all duration-300 hover:opacity-100 opacity-60 hover:scale-[1.02]"
          style={{ animation: 'fleetFloat2 22s ease-in-out infinite 3s' }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#635BFF]/15 text-[#635BFF] flex items-center justify-center font-bold text-[10px]">
                S
              </div>
              <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Stripe</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              0% Spam Score
            </span>
          </div>
          <div className="text-[11px] text-[#4B5563] dark:text-[#94A3B8] font-medium leading-tight">
            Primary Inbox Handshake
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#64748B]">
            <ShieldCheck className="w-3 h-3 text-[#3B6BF0]" />
            <span>DKIM / SPF / MX Resolving</span>
          </div>
        </div>

        {/* Fleet Card 6: Ramp (Prospect Replied - Meeting Requested) */}
        <div 
          className="fleet-card p-3 rounded-xl bg-white/75 dark:bg-[#111827]/75 backdrop-blur-md border border-[#E5E7EB]/80 dark:border-[#1E293B]/80 shadow-xs transition-all duration-300 hover:opacity-100 opacity-65 hover:scale-[1.02]"
          style={{ animation: 'fleetFloat1 19s ease-in-out infinite 1.5s' }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-[10px]">
                R
              </div>
              <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Ramp</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Reply Received
            </span>
          </div>
          <div className="text-[11px] text-[#4B5563] dark:text-[#94A3B8] font-medium leading-tight">
            Positive Sentiment: "Let's connect"
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#64748B]">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>Autonomous sequence halted</span>
          </div>
        </div>

        {/* Fleet Card 7: Cloudflare (Quota Saver Early-Exit) */}
        <div 
          className="fleet-card p-3 rounded-xl bg-white/75 dark:bg-[#111827]/75 backdrop-blur-md border border-[#E5E7EB]/80 dark:border-[#1E293B]/80 shadow-xs transition-all duration-300 hover:opacity-100 opacity-55 hover:scale-[1.02]"
          style={{ animation: 'fleetFloat2 25s ease-in-out infinite 5s' }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#F48120]/15 text-[#F48120] flex items-center justify-center font-bold text-[10px]">
                C
              </div>
              <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Cloudflare</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              Filtered Out
            </span>
          </div>
          <div className="text-[11px] text-[#4B5563] dark:text-[#94A3B8] font-medium leading-tight">
            Saved 6,500 Quota Tokens
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#64748B]">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Early exit at Step 2 (Low fit)</span>
          </div>
        </div>

        {/* Fleet Card 8: Vercel (Real-Time Growth Signal) */}
        <div 
          className="fleet-card p-3 rounded-xl bg-white/75 dark:bg-[#111827]/75 backdrop-blur-md border border-[#E5E7EB]/80 dark:border-[#1E293B]/80 shadow-xs transition-all duration-300 hover:opacity-100 opacity-60 hover:scale-[1.02]"
          style={{ animation: 'fleetFloat1 21s ease-in-out infinite 2.5s' }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-[10px]">
                ▲
              </div>
              <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Vercel</span>
            </div>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              Hiring Signal
            </span>
          </div>
          <div className="text-[11px] text-[#4B5563] dark:text-[#94A3B8] font-medium leading-tight">
            Sarah Chen • VP Engineering
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#64748B]">
            <Bot className="w-3 h-3 text-[#3B6BF0]" />
            <span>Expansion signal verified</span>
          </div>
        </div>

      </div>

      {/* 5. Mobile & Tablet Minimalist Subtle Signals (Visible when gutters are hidden) */}
      <div className="lg:hidden absolute top-20 right-4 opacity-40 scale-85 pointer-events-none">
        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md border border-[#E5E7EB] dark:border-[#1E293B] shadow-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-medium text-[#4B5563] dark:text-[#94A3B8]">Datadog • 94% Match</span>
        </div>
      </div>
      <div className="lg:hidden absolute bottom-12 left-4 opacity-35 scale-85 pointer-events-none">
        <div className="p-2.5 rounded-xl bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md border border-[#E5E7EB] dark:border-[#1E293B] shadow-xs flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3B6BF0]" />
          <span className="text-[10px] font-medium text-[#4B5563] dark:text-[#94A3B8]">Primary Inbox Guaranteed</span>
        </div>
      </div>
    </div>
  );
}
