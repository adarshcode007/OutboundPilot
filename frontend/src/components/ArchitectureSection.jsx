import React from 'react';
import { Search, Target, PenLine, ShieldCheck, CheckSquare, Send, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    step: "Step 1",
    name: "Web & Company Research",
    icon: Search,
    desc: "Scans recent company news, hiring announcements, tech stack changes, and growth signals across the web.",
    tag: "Real-Time Research",
  },
  {
    step: "Step 2",
    name: "Lead Fit Qualification",
    icon: Target,
    desc: "Evaluates whether the company matches your ideal client or job criteria. If not a fit, it automatically stops to protect your time and domain.",
    tag: "Smart Match Filter",
  },
  {
    step: "Step 3",
    name: "Personalized Copywriting",
    icon: PenLine,
    desc: "Writes a concise 3-paragraph outreach email grounded strictly in verified research, following proven high-response copywriting frameworks.",
    tag: "Under 110 Words",
  },
  {
    step: "Step 4",
    name: "AI Quality & Accuracy Check",
    icon: ShieldCheck,
    desc: "Automatically checks the draft against the research to ensure 100% accuracy, remove spam trigger words, and maintain a consultative tone.",
    tag: "Fact-Check Passed",
  },
  {
    step: "Step 5",
    name: "Your Review & Approval",
    icon: CheckSquare,
    desc: "Execution pauses completely. You review the draft, make quick one-click edits if needed, or ask the AI to re-write based on your feedback.",
    tag: "You Hold The Key",
    highlight: true,
  },
  {
    step: "Step 6",
    name: "Direct Inbox Dispatch",
    icon: Send,
    desc: "Sends the approved email natively through your connected Google Workspace or email provider with complete deliverability tracking.",
    tag: "Direct Delivery",
  },
];

export default function ArchitectureSection() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 border-t border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0B0F17] transition-colors">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold tracking-wider uppercase text-[#3B6BF0] mb-2">
            How It Works
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight leading-tight mb-4">
            An intelligent sales team that works for you.
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            Six seamless steps that take your target accounts from raw company names into personalized, delivered sales conversations.
          </p>
        </div>

        {/* 6-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STEPS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className={`rounded-2xl p-6 border transition-all duration-200 hover:shadow-xs flex flex-col justify-between ${
                  item.highlight
                    ? "bg-white dark:bg-[#111827] border-[#3B6BF0]/50 ring-1 ring-[#3B6BF0]/20 shadow-xs"
                    : "bg-white dark:bg-[#111827] border-[#E5E7EB] dark:border-[#1E293B] hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F5F5FA] dark:bg-[#161F33] border border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-center text-[#3B6BF0]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-[#F5F5FA] dark:bg-[#161F33] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#1E293B]">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="font-sans text-base font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-2">
                    {item.name}
                  </h3>
                  <p className="text-sm text-[#4B5563] dark:text-[#94A3B8] leading-relaxed mb-6">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-between text-xs font-medium text-[#6B7280] dark:text-[#94A3B8]">
                  <span>{item.tag}</span>
                  <span className="text-[#3B6BF0]">✓</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
