import React from 'react';

const AGENTS = [
  {
    step: "Step 1",
    name: "Researcher Agent",
    icon: "🔍",
    desc: "Executes live web reconnaissance via DuckDuckGo. Discovers recent funding rounds, executive transitions, engineering stack footprints, and strategic product initiatives.",
    spec: "Tool: ddgs_search + Web Recon",
  },
  {
    step: "Step 2",
    name: "ICP Analyst",
    icon: "📊",
    desc: "Evaluates target fit using strict Pydantic schemas. If fit < 7/10, triggers an early exit to protect sender domain and conserve token compute.",
    spec: "Schema: CampaignDecision",
  },
  {
    step: "Step 3",
    name: "Copywriter Agent",
    icon: "✍️",
    desc: "Synthesizes tailored outreach referencing verified facts. Strictly under 120 words with zero spam buzzwords and single specific call-to-actions.",
    spec: "Engine: Context-Isolated LLM",
  },
  {
    step: "Step 4",
    name: "AI Quality Judge",
    icon: "🛡️",
    desc: "Actor-critic evaluator. Checks factual grounding against research notes and deliverability rules. Discards hallucinated claims before human eyes see them.",
    spec: "Guardrail: Actor-Critic Evaluator",
  },
  {
    step: "Step 5",
    name: "Human Review Gate",
    icon: "⏸️",
    desc: "LangGraph checkpoint interrupt. Pauses execution before dispatcher. Humans can approve, manually edit the email, or provide critique for AI re-drafts.",
    spec: "Gate: interrupt_before=['dispatcher']",
    highlight: true,
  },
  {
    step: "Step 6",
    name: "Durable Dispatcher",
    icon: "🐘",
    desc: "Dispatches approved proposal to destination webhook and writes immutable audit checkpoints into PostgreSQL with zero state loss.",
    spec: "Ledger: PostgreSQL Checkpointer",
  },
];

export default function ArchitectureSection() {
  return (
    <section id="architecture" className="py-20 md:py-28 border-t border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0B0F17] transition-colors">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-16">
          <div className="text-xs font-semibold tracking-wider uppercase text-[#3B6BF0] mb-2">
            The Multi-Agent Pipeline
          </div>
          <h2 className="font-serif text-3xl md:text-5xl font-normal text-[#0B1220] dark:text-[#F8FAFC] tracking-tight leading-tight mb-4">
            Context-isolated specialist swarm.
          </h2>
          <p className="text-base md:text-lg text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
            A cyclic LangGraph state machine orchestrating 6 dedicated agents with checkpointed interruption gates and zero monolithic prompts.
          </p>
        </div>

        {/* 6-Agent Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AGENTS.map((agent) => (
            <div
              key={agent.step}
              className={`rounded-2xl p-6 border transition-all hover:shadow-xs flex flex-col justify-between ${
                agent.highlight
                  ? "bg-white dark:bg-[#111827] border-[#3B6BF0]/50 ring-1 ring-[#3B6BF0]/20"
                  : "bg-white dark:bg-[#111827] border-[#E5E7EB] dark:border-[#1E293B] hover:border-gray-300 dark:hover:border-gray-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#F5F5FA] dark:bg-[#161F33] border border-[#E5E7EB] dark:border-[#1E293B] flex items-center justify-center text-lg">
                    {agent.icon}
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full bg-[#F5F5FA] dark:bg-[#161F33] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#1E293B]">
                    {agent.step}
                  </span>
                </div>

                <h3 className="font-sans text-lg font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-2">
                  {agent.name}
                </h3>
                <p className="text-sm text-[#4B5563] dark:text-[#94A3B8] leading-relaxed mb-6">
                  {agent.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#1E293B] text-xs font-mono text-[#6B7280] dark:text-[#94A3B8]">
                {agent.spec}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
