import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      <div>
        <strong>OutboundSDR</strong> — Autonomous B2B Multi-Agent Workforce.
      </div>
      <div style={{ display: "flex", gap: "1.5rem" }}>
        <span>FastAPI 1.0.0</span>
        <span>LangGraph 1.2.17</span>
        <span>Docker PostgreSQL 16</span>
      </div>
    </footer>
  );
}
