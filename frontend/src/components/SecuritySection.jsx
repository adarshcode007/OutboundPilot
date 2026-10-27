import React from 'react';

export default function SecuritySection() {
  return (
    <section id="security" style={{ padding: "0 0 5rem" }}>
      <div className="section-header">
        <div className="section-eyebrow">Enterprise Reliability</div>
        <h2 className="section-title">Zero Hallucinations. Total Governance.</h2>
      </div>

      <div className="bento-grid">
        <div className="bento-card">
          <h3>🛡️ Actor-Critic Quality Guardrails</h3>
          <p>
            Before outreach reaches any human or inbox, an automated LLM-as-a-Judge cross-examines the pitch against raw research notes, scoring factual grounding and spam delivery risks.
          </p>
        </div>
        <div className="bento-card">
          <h3>🐘 Durable PostgreSQL Checkpointing</h3>
          <p>
            Every agent transition, prompt, and intermediate message is persisted in PostgreSQL checkpointer tables (checkpoints, writes, blobs). Safe from crashes and restartable at any gate.
          </p>
        </div>
        <div className="bento-card">
          <h3>🔒 Strict Context Isolation</h3>
          <p>
            Specialized workers have independent system prompts with strict separation of concerns, eliminating prompt injection and hallucinations common in monolithic LLM scripts.
          </p>
        </div>
        <div className="bento-card">
          <h3>⚡ Sub-Second Groq Inference</h3>
          <p>
            Powered by Groq's LPU architecture running openai/gpt-oss-20b, delivering end-to-end multi-agent orchestration in under 3 seconds per lead.
          </p>
        </div>
      </div>
    </section>
  );
}
