import React from 'react';

export default function Navbar({ onNavigate }) {
  return (
    <nav className="navbar">
      <div className="nav-brand" onClick={() => onNavigate("landing")}>
        <div className="brand-mark">⚡</div>
        <div className="brand-title-group">
          <h1>OutboundSDR</h1>
          <p>Autonomous B2B Orchestration</p>
        </div>
      </div>

      <ul className="nav-links">
        <li><a className="nav-link" href="#architecture">Architecture</a></li>
        <li><a className="nav-link" href="#simulator">Live Simulator</a></li>
        <li><a className="nav-link" href="#security">Guardrails</a></li>
      </ul>

      <div className="nav-actions">
        <div className="pill">
          <div className="pill-dot"></div>
          Engine Online
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => onNavigate("workspace")}
        >
          Get Started →
        </button>
      </div>
    </nav>
  );
}
