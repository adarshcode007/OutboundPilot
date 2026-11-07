import React, { useState } from 'react';

const API_URL = typeof window !== 'undefined' && window.location.port === "5173" ? "" : "http://localhost:8000";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister ? `${API_URL}/api/auth/register` : `${API_URL}/api/auth/login`;
    const payload = isRegister 
      ? { email: email.trim(), password, full_name: fullName.trim() }
      : { email: email.trim(), password };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Essential for receiving and setting httpOnly cookies
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Authentication failed. Please check your credentials.");
      }

      // Success
      if (onAuthSuccess) {
        onAuthSuccess(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminLogin = () => {
    setEmail("admin@outboundsdr.ai");
    setPassword("Password123!");
    setIsRegister(false);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(3, 7, 18, 0.85)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "20px",
    }}>
      <div style={{
        background: "#0b0f19",
        border: "1px solid var(--border-accent, #3730a3)",
        borderRadius: "14px",
        width: "100%",
        maxWidth: "440px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.2)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "24px 24px 16px 24px",
          borderBottom: "1px solid var(--border-subtle, #1e293b)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.4rem" }}>🔐</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#f8fafc" }}>
                {isRegister ? "Create SDR Account" : "Sign In to SDR Workforce"}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted, #94a3b8)", marginTop: "2px" }}>
                Protected with JWT in secure httpOnly cookies
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                fontSize: "1.2rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Error Notice */}
        {error && (
          <div style={{
            margin: "16px 24px 0 24px",
            padding: "10px 14px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            borderRadius: "6px",
            fontSize: "0.82rem",
            color: "#f87171",
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Quick Demo Login Pill */}
        <div style={{
          margin: "16px 24px 0 24px",
          padding: "12px 14px",
          background: "rgba(99, 102, 241, 0.08)",
          border: "1px dashed var(--border-accent, #4f46e5)",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#a5b4fc" }}>
              ⚡ Quick Demo Account:
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim, #94a3b8)", fontFamily: "JetBrains Mono, monospace" }}>
              admin@outboundsdr.ai
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ fontSize: "0.72rem", padding: "4px 10px" }}
            onClick={handleQuickAdminLogin}
          >
            Auto-Fill
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px 24px" }}>
          {isRegister && (
            <div className="form-group" style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-medium, #cbd5e1)", display: "block", marginBottom: "6px" }}>
                Full Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Sarah Connor"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isRegister}
                style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-medium, #cbd5e1)", display: "block", marginBottom: "6px" }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="e.g. sdr@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "20px" }}>
            <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-medium, #cbd5e1)", display: "block", marginBottom: "6px" }}>
              Password
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: "100%", padding: "8px 12px", fontSize: "0.85rem" }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "10px", fontSize: "0.9rem", fontWeight: 700 }}
            disabled={loading}
          >
            {loading ? "Authenticating..." : (isRegister ? "Create Account & Sign In" : "Sign In →")}
          </button>

          {/* Toggle Register/Login */}
          <div style={{ marginTop: "16px", textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted, #94a3b8)" }}>
            {isRegister ? (
              <span>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(null); }}
                  style={{ background: "none", border: "none", color: "#818cf8", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Need an account?{" "}
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(null); }}
                  style={{ background: "none", border: "none", color: "#818cf8", fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Create one now
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

