import React from 'react';
import { ShieldCheck, CheckCircle2, Database, MailCheck } from 'lucide-react';

const GUARANTEES = [
  {
    icon: CheckCircle2,
    title: "100% Fact-Checked Content",
    desc: "Before any email is presented for your review, our automated verification system cross-examines every claim against live company news to prevent awkward mistakes.",
  },
  {
    icon: ShieldCheck,
    title: "Complete Human Approval Control",
    desc: "You always have the final say. Review the drafted proposal, make quick edits, or approve with one click before any message is sent to a prospect.",
  },
  {
    icon: Database,
    title: "Automatic History & Saved State",
    desc: "Every campaign, research note, and email draft is automatically and securely stored in your workspace. You can pause, close your laptop, and resume anytime.",
  },
  {
    icon: MailCheck,
    title: "Direct Primary Inbox Delivery",
    desc: "Emails are dispatched natively through your connected Google Workspace or enterprise mailbox, landing directly in primary inboxes with zero spam flags.",
  },
];

export default function SecuritySection() {
  return (
    <section id="security" className="py-20 md:py-28 bg-[#FAFBFD]/80 dark:bg-[#0B0F17]/80 backdrop-blur-xs border-t border-[#E5E7EB] dark:border-[#1E293B] transition-colors">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold tracking-wider uppercase text-[#3B6BF0] mb-2">
            Quality &amp; Safety
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight leading-tight mb-4">
            Safe, accurate, and completely under your control.
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            Built from the ground up for high-touch B2B relationships where brand reputation, accuracy, and trust matter most.
          </p>
        </div>

        {/* 4-Item Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GUARANTEES.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-8 hover:border-gray-300 dark:hover:border-gray-700 transition-all hover:shadow-xs"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#3B6BF0] border border-blue-100 dark:border-blue-900/40 flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl sm:text-2xl text-[#0B1220] dark:text-[#F8FAFC] mb-3 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-sm md:text-base text-[#4B5563] dark:text-[#94A3B8] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
