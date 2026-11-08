import React from 'react';

const GUARANTEES = [
  {
    icon: "🛡️",
    title: "Actor-Critic Quality Guardrails",
    desc: "Before outreach reaches any human or inbox, an automated LLM-as-a-Judge cross-examines the pitch against raw research notes, scoring factual grounding and spam delivery risks.",
  },
  {
    icon: "🐘",
    title: "Durable PostgreSQL Checkpointing",
    desc: "Every agent transition, prompt, and intermediate message is persisted in PostgreSQL checkpointer tables (checkpoints, writes, blobs). Safe from crashes and restartable at any gate.",
  },
  {
    icon: "🔒",
    title: "Strict Context Isolation",
    desc: "Specialized workers have independent system prompts with strict separation of concerns, eliminating prompt injection and hallucinations common in monolithic LLM scripts.",
  },
  {
    icon: "⚡",
    title: "Sub-Second Groq Inference",
    desc: "Powered by Groq's high-throughput LPU architecture running fast open-source models, delivering end-to-end multi-agent orchestration in under 3 seconds per lead.",
  },
];

export default function SecuritySection() {
  return (
    <section id="security" className="py-20 md:py-28 bg-[#FAFBFD] border-t border-[#E5E7EB]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold tracking-wider uppercase text-[#3B6BF0] mb-2">
            Enterprise Reliability
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0B1220] tracking-tight leading-tight mb-4">
            Zero hallucinations. Total governance.
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] leading-relaxed">
            Engineered from first principles for mission-critical B2B pipelines where accuracy, durability, and domain reputation cannot be compromised.
          </p>
        </div>

        {/* 4-Item Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {GUARANTEES.map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-8 hover:border-gray-300 transition-all hover:shadow-xs"
            >
              <div className="w-12 h-12 rounded-xl bg-[#F5F5FA] border border-[#E5E7EB] flex items-center justify-center text-xl mb-5">
                {item.icon}
              </div>
              <h3 className="font-serif text-2xl text-[#0B1220] mb-3 tracking-tight">
                {item.title}
              </h3>
              <p className="text-sm md:text-base text-[#4B5563] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
