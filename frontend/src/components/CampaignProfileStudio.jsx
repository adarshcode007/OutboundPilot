import React, { useState, useEffect } from 'react';
import { apiFetch } from '../apiClient';

export default function CampaignProfileStudio({ onProfileUpdated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [presets, setPresets] = useState({});

  // Active Profile Form State
  const [formData, setFormData] = useState({
    campaign_type: 'OFFER',
    sender_name: 'David',
    sender_title: 'Enterprise Account Executive',
    company_or_brand: 'Outbound Pilot AI',
    offer_description: '',
    target_icp_criteria: '',
    key_benefits: '',
    portfolio_or_links: '',
  });

  // Fetch active campaign profile and presets on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/profile/campaign');
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setFormData({
            campaign_type: data.profile.campaign_type || 'OFFER',
            sender_name: data.profile.sender_name || '',
            sender_title: data.profile.sender_title || '',
            company_or_brand: data.profile.company_or_brand || '',
            offer_description: data.profile.offer_description || '',
            target_icp_criteria: data.profile.target_icp_criteria || '',
            key_benefits: data.profile.key_benefits || '',
            portfolio_or_links: data.profile.portfolio_or_links || '',
          });
        }
        if (data.presets) {
          setPresets(data.presets);
        }
      }
    } catch (err) {
      console.error('Failed to load campaign profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (presetKey) => {
    const preset = presets[presetKey];
    if (!preset) return;
    setFormData({
      campaign_type: preset.campaign_type || 'OFFER',
      sender_name: preset.sender_name || '',
      sender_title: preset.sender_title || '',
      company_or_brand: preset.company_or_brand || '',
      offer_description: preset.offer_description || '',
      target_icp_criteria: preset.target_icp_criteria || '',
      key_benefits: preset.key_benefits || '',
      portfolio_or_links: preset.portfolio_or_links || '',
    });
    setNotice({
      type: 'info',
      text: `Loaded preset: "${presetKey.replace('_', ' ')}". Click "Save Profile & Update Agents" to activate it for all pipeline runs.`,
    });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setNotice(null);

    try {
      const res = await apiFetch('/api/profile/campaign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        setNotice({
          type: 'success',
          text: 'Campaign profile saved successfully! The Researcher, ICP Analyst, Copywriter, and Evaluator agents are now aligned with your goals.',
        });
        if (onProfileUpdated) {
          onProfileUpdated(data.profile);
        }
      } else {
        const err = await res.json();
        setNotice({
          type: 'error',
          text: err.detail || 'Failed to save campaign profile.',
        });
      }
    } catch (err) {
      setNotice({
        type: 'error',
        text: 'Network error saving campaign profile.',
      });
    } finally {
      setSaving(false);
    }
  };

  const isJobSeeker = formData.campaign_type === 'JOB_SEEKER';

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      {notice && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border transition-all ${
            notice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : notice.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{notice.type === 'success' ? '✓' : notice.type === 'info' ? 'ℹ' : '⚠'}</span>
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="opacity-70 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header & Mode Switcher */}
      <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎯</span>
              <h2 className="font-serif text-xl text-[#0B1220] dark:text-[#F8FAFC]">
                Offer &amp; Persona Studio
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#3B6BF0] border border-blue-200 dark:border-blue-800">
                Multi-Agent Grounding
              </span>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-xl">
              Configure what you are pitching. The Researcher gathers targeted intelligence, the ICP Analyst scores fit against your exact criteria, and the Copywriter crafts high-converting pitches tailored to this profile.
            </p>
          </div>

          {/* Primary Campaign Type Mode Toggle */}
          <div className="flex items-center p-1 bg-[#F5F5FA] dark:bg-[#0B1220] border border-[#E5E7EB] dark:border-[#1E293B] rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, campaign_type: 'OFFER' })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                !isJobSeeker
                  ? 'bg-white dark:bg-[#1E293B] text-[#0B1220] dark:text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <span>💼</span>
              <span>B2B Offer Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, campaign_type: 'JOB_SEEKER' })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                isJobSeeker
                  ? 'bg-white dark:bg-[#1E293B] text-[#0B1220] dark:text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC]'
              }`}
            >
              <span>🚀</span>
              <span>Job Seeker Mode</span>
            </button>
          </div>
        </div>

        {/* 1-Click Preset Templates */}
        <div className="pt-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-3 flex items-center justify-between">
            <span>⚡ 1-Click Profile Presets</span>
            <span className="text-[10px] lowercase text-[#9CA3AF]">(click to pre-fill)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleApplyPreset('JOB_SEEKER')}
              className="p-3 text-left rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] hover:border-[#3B6BF0] dark:hover:border-[#3B6BF0] hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all group"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] group-hover:text-[#3B6BF0]">
                <span>💼</span>
                <span>AI / Full-Stack Engineer</span>
              </div>
              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 line-clamp-2">
                Job outreach targeting hiring leads with Python, React &amp; LLM stack.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('AI_AGENCY')}
              className="p-3 text-left rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] hover:border-[#3B6BF0] dark:hover:border-[#3B6BF0] hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all group"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] group-hover:text-[#3B6BF0]">
                <span>🤖</span>
                <span>Agentic AI Agency</span>
              </div>
              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 line-clamp-2">
                Autonomous SDR pipeline service for high-growth B2B tech scale-ups.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('GROWTH_AGENCY')}
              className="p-3 text-left rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] hover:border-[#3B6BF0] dark:hover:border-[#3B6BF0] hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all group"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] group-hover:text-[#3B6BF0]">
                <span>📈</span>
                <span>B2B Pipeline Agency</span>
              </div>
              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 line-clamp-2">
                Pay-for-performance cold email outbound booking 15-30 sales demos/mo.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('CLOUD_CONSULTING')}
              className="p-3 text-left rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] hover:border-[#3B6BF0] dark:hover:border-[#3B6BF0] hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all group"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] group-hover:text-[#3B6BF0]">
                <span>☁️</span>
                <span>Cloud &amp; DevOps Advisory</span>
              </div>
              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 line-clamp-2">
                Guaranteed 25-40% cloud bill reduction for AWS/GCP workloads.
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Form */}
      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Identity, Offer, ICP & Proof */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Sender Identity */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-2">
              <span>👤</span>
              <span>1. Sender Identity &amp; Sign-off</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.sender_name}
                  onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                  placeholder="e.g. Adarsh"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                  Your Professional Title
                </label>
                <input
                  type="text"
                  value={formData.sender_title}
                  onChange={(e) => setFormData({ ...formData, sender_title: e.target.value })}
                  placeholder={isJobSeeker ? "e.g. Full-Stack & AI Engineer" : "e.g. Founder & Solutions Lead"}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                  Company / Organization
                </label>
                <input
                  type="text"
                  value={formData.company_or_brand}
                  onChange={(e) => setFormData({ ...formData, company_or_brand: e.target.value })}
                  placeholder={isJobSeeker ? "e.g. Open to Roles / Freelance" : "e.g. Acme AI Solutions"}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: What are you pitching? (Offer / Skills) */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>{isJobSeeker ? '💼' : '💡'}</span>
                <span>2. {isJobSeeker ? 'Candidate Expertise & Technical Stack' : 'Product / Service Offer'}</span>
              </span>
              <span className="text-[10px] lowercase text-[#9CA3AF]">
                {isJobSeeker ? 'used by copywriter for candidate pitch' : 'used by copywriter for solution pitch'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                {isJobSeeker ? 'Summary of Your Engineering Skills & Specialties' : 'Detailed Offer Description & Problem Solved'}
              </label>
              <textarea
                rows={3}
                value={formData.offer_description}
                onChange={(e) => setFormData({ ...formData, offer_description: e.target.value })}
                placeholder={
                  isJobSeeker
                    ? "Full-stack engineer with deep expertise in LangGraph multi-agent architectures, FastAPI, React 19, and production PostgreSQL checkpointer state machines."
                    : "Autonomous multi-agent SDR workforce that automates pipeline generation, lead research, and executive outbound copywriting."
                }
                className="w-full text-xs p-3 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0] leading-relaxed"
                required
              />
            </div>
          </div>

          {/* Card 3: Target ICP Qualification Criteria */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>🎯</span>
                <span>3. Target ICP (Ideal Prospect / Company) Criteria</span>
              </span>
              <span className="text-[10px] font-bold text-[#3B6BF0]">
                governs ICP Analyst Agent scoring
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                {isJobSeeker ? 'Target Hiring Companies, Roles & Engineering Stack' : 'Target Customer Criteria (Industry, Size, Trigger Events)'}
              </label>
              <textarea
                rows={3}
                value={formData.target_icp_criteria}
                onChange={(e) => setFormData({ ...formData, target_icp_criteria: e.target.value })}
                placeholder={
                  isJobSeeker
                    ? "Tech companies, AI startups, and scale-ups hiring Full-Stack Engineers, AI Engineers, or Backend Developers working with Python & React."
                    : "High-growth B2B SaaS, fintech, and tech scale-ups with 20-500 employees looking to scale sales without ballooning headcount."
                }
                className="w-full text-xs p-3 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0] leading-relaxed"
                required
              />
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1.5">
                The ICP Analyst agent will score target accounts (1-10) against this criteria and automatically disqualify accounts below 5/10.
              </p>
            </div>
          </div>

          {/* Card 4: Proof Points & Links */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-2">
              <span>📊</span>
              <span>4. Concrete Proof Points &amp; Links</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                  Key Value Metrics / Concrete Proof Points
                </label>
                <textarea
                  rows={2}
                  value={formData.key_benefits}
                  onChange={(e) => setFormData({ ...formData, key_benefits: e.target.value })}
                  placeholder={
                    isJobSeeker
                      ? "Architected production-ready multi-agent pipelines, reduced inference token expenditure by 60%, and built resilient PostgreSQL checkpointer state machines."
                      : "Cuts manual lead research time by 80%, saves 4,000 LLM tokens per exit with automated ICP guardrails, and books high-intent meetings."
                  }
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                  Portfolio / GitHub / Case Study / Website URL
                </label>
                <input
                  type="url"
                  value={formData.portfolio_or_links}
                  onChange={(e) => setFormData({ ...formData, portfolio_or_links: e.target.value })}
                  placeholder="https://github.com/adarshcode007/OutboundPilot"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0]"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={fetchProfile}
              className="px-4 py-2 text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] rounded-xl hover:bg-[#F5F5FA] dark:hover:bg-[#161F33] transition-colors"
            >
              Reset to Saved Profile
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-[#3B6BF0] hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving &amp; Updating Agents...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Save Profile &amp; Update Agents</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Multi-Agent Adaptation Simulator */}
        <div className="space-y-6">
          {/* Agent Adaptation Overview Card */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center justify-between">
              <span>🤖 How Agents Will Adapt</span>
              <span className="text-[10px] font-mono text-[#3B6BF0]">
                {formData.campaign_type}
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                  <span>🔍</span>
                  <span>Researcher Agent</span>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  {isJobSeeker
                    ? 'Researches company tech stack, engineering languages/frameworks, recent team expansions, and open developer roles.'
                    : 'Researches enterprise growth signals, cloud infrastructure, scaling bottlenecks, and operational challenges.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                  <span>🎯</span>
                  <span>ICP Analyst Agent</span>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  {isJobSeeker
                    ? 'Evaluates whether company has matching engineering stack and career openings matching your background.'
                    : 'Evaluates if company matches your target ICP size, industry, and need for your product/service.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                  <span>✍️</span>
                  <span>Copywriter Agent</span>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  {isJobSeeker
                    ? 'Drafts personalized candidate outreach highlighting relevant projects, metrics, and portfolio links.'
                    : 'Drafts PAS/BAB B2B outreach highlighting verified prospect bottlenecks and your specific solution.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                  <span>⚖️</span>
                  <span>Compliance Judge</span>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  Checks that statements about the prospect are grounded in verified research and guarantees a 75-110 word 3-paragraph format.
                </p>
              </div>
            </div>
          </div>

          {/* Live Dynamic Email Preview Mockup */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-xs space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                ✉️ Live Email Preview
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                PAS Framework
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#FAFBFD] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B] font-mono text-[11px] text-[#0B1220] dark:text-[#F8FAFC] space-y-3 leading-relaxed">
              <div className="text-[#6B7280] dark:text-[#94A3B8] border-b border-[#E5E7EB] dark:border-[#1E293B] pb-2">
                <span className="font-semibold text-[#0B1220] dark:text-[#F8FAFC]">Subject: </span>
                {isJobSeeker ? 'fullstack eng role inquiry' : 'datadog infra scaling'}
              </div>

              <p>Hi Alexis,</p>

              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                {isJobSeeker
                  ? 'Noticed your team’s recent engineering updates and push into scaling real-time telemetry infrastructure.'
                  : 'Noticed your team’s recent expansion in enterprise telemetry and distributed stream monitoring.'}
              </p>

              <p className="text-[#3B6BF0]">
                {formData.key_benefits
                  ? formData.key_benefits
                  : isJobSeeker
                  ? 'I built production-grade multi-agent architectures reducing inference token usage by 60%.'
                  : 'We help engineering teams automate manual SDR workflows while slashing research time by 80%.'}
              </p>

              <p className="text-[#6B7280] dark:text-[#94A3B8]">
                {isJobSeeker
                  ? 'Open to a brief 10-minute intro chat this week if you have bandwidth?'
                  : 'Open to seeing how similar teams handle this, or is this not a priority right now?'}
              </p>

              <div className="pt-2 text-[#0B1220] dark:text-[#F8FAFC]">
                <div>Best,</div>
                <div className="font-semibold">{formData.sender_name || 'Your Name'}</div>
                <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
                  {formData.sender_title || 'Your Title'}
                  {formData.company_or_brand ? ` | ${formData.company_or_brand}` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
