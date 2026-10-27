import React from 'react';

export default function CtaBanner({ onNavigate }) {
  return (
    <section className="cta-banner">
      <h2>Deploy Your Autonomous SDR Swarm</h2>
      <p>
        Experience the precision of multi-agent intelligence paired with the control of human-in-the-loop review.
      </p>
      <button 
        className="btn btn-primary btn-lg"
        onClick={() => onNavigate("workspace")}
      >
        🚀 Launch Live Command Center
      </button>
    </section>
  );
}
