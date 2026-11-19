import React from 'react';
import { Target, ShieldCheck, CheckCircle2, TrendingUp, Sparkles, MailCheck, Bot } from 'lucide-react';

export default function AutonomousFleetBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      {/* 1. Engineering Dot Grid (50% Opacity) */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(#94A3B8_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:32px_32px] opacity-25 dark:opacity-35" 
      />

      {/* 2. Living Ambient Luminous Glow (50% Opacity) */}
      <div 
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[550px] rounded-full bg-[#3B6BF0]/20 dark:bg-[#3B6BF0]/25 blur-[120px] pointer-events-none opacity-50"
        style={{ animation: 'auraBreathe 8s ease-in-out infinite' }}
      />
      <div 
        className="absolute top-2/3 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 blur-[130px] pointer-events-none opacity-50"
      />

      {/* 3. Floating Autonomous Fleet - Card 1: Datadog (Upper Left, 50% Opacity) */}
      <div 
        className="fleet-card absolute top-24 left-3 sm:left-6 lg:left-8 xl:left-12 w-56 sm:w-64 p-3 rounded-xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border border-[#E5E7EB] dark:border-[#1E293B] shadow-md dark:shadow-black/40 z-0 opacity-50 hover:opacity-80 transition-opacity duration-300"
        style={{ animation: 'fleetFloat1 8s ease-in-out infinite' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center font-bold text-[10px]">
              D
            </div>
            <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Datadog</span>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            94% Match
          </span>
        </div>
        <div className="text-[11px] text-[#4B5563] dark:text-[#CBD5E1] font-medium leading-tight">
          Alexis Vance • VP Growth
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
          <Target className="w-3 h-3 text-[#3B6BF0]" />
          <span>3 web buying signals verified</span>
        </div>
      </div>

      {/* 4. Floating Autonomous Fleet - Card 2: Stripe (Upper Right, 50% Opacity) */}
      <div 
        className="fleet-card absolute top-28 right-3 sm:right-6 lg:right-8 xl:right-12 w-56 sm:w-64 p-3 rounded-xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border border-[#E5E7EB] dark:border-[#1E293B] shadow-md dark:shadow-black/40 z-0 opacity-50 hover:opacity-80 transition-opacity duration-300"
        style={{ animation: 'fleetFloat2 9s ease-in-out infinite 1s' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#635BFF]/15 text-[#635BFF] flex items-center justify-center font-bold text-[10px]">
              S
            </div>
            <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Stripe</span>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            0% Spam Score
          </span>
        </div>
        <div className="text-[11px] text-[#4B5563] dark:text-[#CBD5E1] font-medium leading-tight">
          Primary Inbox Handshake
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
          <ShieldCheck className="w-3 h-3 text-[#3B6BF0]" />
          <span>DKIM / SPF / MX Resolving</span>
        </div>
      </div>

      {/* 5. Floating Autonomous Fleet - Card 3: Ramp (Mid Left, 50% Opacity) */}
      <div 
        className="fleet-card absolute top-[440px] left-2 sm:left-6 lg:left-10 xl:left-16 w-56 sm:w-64 p-3 rounded-xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border border-[#E5E7EB] dark:border-[#1E293B] shadow-md dark:shadow-black/40 z-0 opacity-50 hover:opacity-80 transition-opacity duration-300"
        style={{ animation: 'fleetFloat3 10s ease-in-out infinite 0.5s' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-[10px]">
              R
            </div>
            <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Ramp</span>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Reply Received
          </span>
        </div>
        <div className="text-[11px] text-[#4B5563] dark:text-[#CBD5E1] font-medium leading-tight">
          Positive: "Let's connect Tuesday"
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span>Autonomous sequence paused</span>
        </div>
      </div>

      {/* 6. Floating Autonomous Fleet - Card 4: Snowflake (Mid Right, 50% Opacity) */}
      <div 
        className="fleet-card absolute top-[460px] right-2 sm:right-6 lg:right-10 xl:right-16 w-56 sm:w-64 p-3 rounded-xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border border-[#E5E7EB] dark:border-[#1E293B] shadow-md dark:shadow-black/40 z-0 opacity-50 hover:opacity-80 transition-opacity duration-300"
        style={{ animation: 'fleetFloat4 9.5s ease-in-out infinite 2s' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#0284C7]/15 text-[#0284C7] flex items-center justify-center font-bold text-[10px]">
              S
            </div>
            <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Snowflake</span>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#3B6BF0] border border-blue-200 dark:border-blue-800">
            Fact-Check 10/10
          </span>
        </div>
        <div className="text-[11px] text-[#4B5563] dark:text-[#CBD5E1] font-medium leading-tight">
          David K. • Sales Engineering
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>0 hallucinations • Grounded</span>
        </div>
      </div>

      {/* 7. Floating Autonomous Fleet - Card 5: Notion (Lower Left, 50% Opacity) */}
      <div 
        className="fleet-card absolute top-[850px] left-3 sm:left-8 lg:left-12 xl:left-20 w-56 sm:w-64 p-3 rounded-xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border border-[#E5E7EB] dark:border-[#1E293B] shadow-md dark:shadow-black/40 z-0 opacity-50 hover:opacity-80 transition-opacity duration-300"
        style={{ animation: 'fleetFloat1 11s ease-in-out infinite 3s' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-[10px]">
              N
            </div>
            <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Notion</span>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            Ready for Review
          </span>
        </div>
        <div className="text-[11px] text-[#4B5563] dark:text-[#CBD5E1] font-medium leading-tight">
          3-Para Problem-Agitate-Solve
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
          <Sparkles className="w-3 h-3 text-[#3B6BF0]" />
          <span>Awaiting 1-click approval</span>
        </div>
      </div>

      {/* 8. Floating Autonomous Fleet - Card 6: Linear (Lower Right, 50% Opacity) */}
      <div 
        className="fleet-card absolute top-[880px] right-3 sm:right-8 lg:right-12 xl:right-20 w-56 sm:w-64 p-3 rounded-xl bg-white/90 dark:bg-[#111827]/90 backdrop-blur-md border border-[#E5E7EB] dark:border-[#1E293B] shadow-md dark:shadow-black/40 z-0 opacity-50 hover:opacity-80 transition-opacity duration-300"
        style={{ animation: 'fleetFloat2 10.5s ease-in-out infinite 1.5s' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-md bg-[#5E6AD2]/15 text-[#5E6AD2] flex items-center justify-center font-bold text-[10px]">
              L
            </div>
            <span className="font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC]">Linear</span>
          </div>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            Dispatched
          </span>
        </div>
        <div className="text-[11px] text-[#4B5563] dark:text-[#CBD5E1] font-medium leading-tight">
          Sent via Google Workspace
        </div>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
          <MailCheck className="w-3 h-3 text-emerald-500" />
          <span>Thread #camp_8f21 live</span>
        </div>
      </div>

      {/* 9. Upward Drifting Micro Telemetry Stream (Live Signal Drift, 50% Opacity) */}
      <div 
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#161F33]/80 backdrop-blur-sm border border-[#E5E7EB] dark:border-[#1E293B] shadow-xs absolute left-[15%] top-1/2 opacity-50 hover:opacity-80 transition-opacity duration-300"
        style={{ animation: 'signalDrift 16s linear infinite' }}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span className="text-[11px] font-medium text-[#4B5563] dark:text-[#CBD5E1]">
          Cloudflare • Filtered Out (Saved 6,500 Quota Tokens)
        </span>
      </div>

      <div 
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#161F33]/80 backdrop-blur-sm border border-[#E5E7EB] dark:border-[#1E293B] shadow-xs absolute right-[18%] top-3/4 opacity-50 hover:opacity-80 transition-opacity duration-300"
        style={{ animation: 'signalDrift 19s linear infinite 5s' }}
      >
        <Bot className="w-3.5 h-3.5 text-[#3B6BF0]" />
        <span className="text-[11px] font-medium text-[#4B5563] dark:text-[#CBD5E1]">
          Vercel • Real-time hiring signal verified
        </span>
      </div>
    </div>
  );
}
