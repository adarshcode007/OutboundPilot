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
    <div className="fixed inset-0 bg-[#0B1220]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xl w-full max-w-md overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#E5E7EB] flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🔐</span>
              <h3 className="font-serif text-2xl font-normal text-[#0B1220] tracking-tight">
                {isRegister ? "Create SDR Account" : "Sign In to SDR Workforce"}
              </h3>
            </div>
            <p className="text-xs text-[#6B7280]">
              Protected with JWT in secure httpOnly cookies
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[#9CA3AF] hover:text-[#0B1220] p-1 rounded-md text-lg leading-none transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              !isRegister
                ? "bg-[#0B1220] text-white"
                : "bg-[#F5F5FA] text-[#6B7280] hover:text-[#0B1220] border border-[#E5E7EB]"
            }`}
            onClick={() => { setIsRegister(false); setError(null); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              isRegister
                ? "bg-[#0B1220] text-white"
                : "bg-[#F5F5FA] text-[#6B7280] hover:text-[#0B1220] border border-[#E5E7EB]"
            }`}
            onClick={() => { setIsRegister(true); setError(null); }}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
              {error}
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Sarah Connor"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#0B1220] placeholder:text-gray-400 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. alex@company.com"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#0B1220] placeholder:text-gray-400 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#6B7280] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#0B1220] placeholder:text-gray-400 focus:outline-none focus:border-[#3B6BF0] focus:ring-1 focus:ring-[#3B6BF0] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0B1220] hover:bg-[#1E293B] text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Authenticating..." : isRegister ? "Create Account & Continue" : "Sign In to Workspace"}
          </button>

          {/* Quick Demo Credentials shortcut */}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
            <span>Need seed demo login?</span>
            <button
              type="button"
              onClick={handleQuickAdminLogin}
              className="text-[#3B6BF0] hover:underline font-medium"
            >
              Fill Demo Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
