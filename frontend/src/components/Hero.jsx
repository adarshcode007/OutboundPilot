import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Mail, CheckCircle2, Play } from 'lucide-react';
import HeroStageDemo from './HeroStageDemo';

export default function Hero({ onNavigate }) {
  return (
    <section className="pt-14 pb-20 md:pt-20 md:pb-28 max-w-5xl mx-auto px-6 text-center">
      {/* Eyebrow badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F5FA] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] text-xs font-semibold tracking-wide text-[#6B7280] dark:text-[#94A3B8] mb-8 shadow-2xs">
        <Sparkles className="w-3.5 h-3.5 text-[#3B6BF0]" />
        <span>Intelligent Sales Outreach • 100% Human Approval</span>
      </div>

      {/* Main Serif Display H1 */}
      <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight leading-[1.08] mb-6">
        High-precision outbound sales. <br className="hidden sm:inline" />
        <span className="italic text-[#3B6BF0]">Researched by AI. Controlled by You.</span>
      </h1>

      {/* Hero Subhead */}
      <p className="font-sans text-base sm:text-lg md:text-xl text-[#4B5563] dark:text-[#94A3B8] max-w-2xl mx-auto font-normal leading-relaxed mb-8">
        Say goodbye to generic cold spam. Our intelligent sales assistants research target companies in real-time, score lead fit, write personalized 3-paragraph emails, and never send a message without your approval.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8">
        <button 
          className="w-full sm:w-auto bg-[#0B1220] hover:bg-[#1E293B] dark:bg-white dark:hover:bg-gray-100 text-white dark:text-[#0B1220] font-medium text-sm sm:text-base px-6 py-3 rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 group"
          onClick={() => onNavigate("workspace")}
        >
          <span>Open Sales Studio</span>
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
        <a 
          href="#how-it-works"
          className="w-full sm:w-auto bg-[#F5F5FA] hover:bg-[#EBEBF2] dark:bg-[#111827] dark:hover:bg-[#161F33] text-[#0B1220] dark:text-[#F8FAFC] font-medium text-sm sm:text-base px-6 py-3 rounded-xl transition-all border border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Play className="w-3.5 h-3.5 text-[#3B6BF0]" />
          <span>See How It Works</span>
        </a>
      </div>

      {/* Stageshow Interactive Faux Product Window */}
      <HeroStageDemo />

      {/* Stat Cards - Editorial 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left pt-10 border-t border-[#E5E7EB] dark:border-[#1E293B]">
        <div className="bg-[#FAFBFD] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 transition-all hover:border-gray-300 dark:hover:border-gray-700 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#3B6BF0] flex items-center justify-center mb-4">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="font-serif text-3xl md:text-4xl text-[#0B1220] dark:text-[#F8FAFC] tracking-tight mb-1">
            98.4%
          </div>
          <div className="text-sm font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1">
            Fact-Checked Information
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            Every mention of company news and technology is cross-checked against live web signals before you see it.
          </div>
        </div>

        <div className="bg-[#FAFBFD] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 transition-all hover:border-gray-300 dark:hover:border-gray-700 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Mail className="w-4 h-4" />
          </div>
          <div className="font-serif text-3xl md:text-4xl text-[#0B1220] dark:text-[#F8FAFC] tracking-tight mb-1">
            &lt; 110 Words
          </div>
          <div className="text-sm font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1">
            Primary Inbox Delivery
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            Short, respectful, and scannable emails formatted with proven Problem-Agitate-Solve structure.
          </div>
        </div>

        <div className="bg-[#FAFBFD] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 transition-all hover:border-gray-300 dark:hover:border-gray-700 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="font-serif text-3xl md:text-4xl text-[#0B1220] dark:text-[#F8FAFC] tracking-tight mb-1">
            100%
          </div>
          <div className="text-sm font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1">
            Total Human Control
          </div>
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            No unexpected emails ever leave your account. You hold the key to review, edit, or approve every message.
          </div>
        </div>
      </div>
    </section>
  );
}
