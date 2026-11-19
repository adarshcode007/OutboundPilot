import React, { useState, useEffect } from 'react';
import { apiFetch } from '../apiClient';
import { 
  Target, Briefcase, Sparkles, Bot, TrendingUp, Cloud, User, 
  Lightbulb, Save, Check, Search, PenLine, ShieldCheck, Mail, 
  ExternalLink, CheckCircle2, AlertCircle, Info, X
} from 'lucide-react';

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
      text: `Loaded preset: "${presetKey.replace('_', ' ')}". Click "Save Profile & Update Settings" to activate it for all outreach runs.`,
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
          text: 'Campaign profile saved successfully! Your AI team is now aligned with your goals.',
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
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : notice.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notice.text}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="opacity-70 hover:opacity-100 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Mode Switcher */}
      <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E5E7EB] dark:border-[#1E293B]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#3B6BF0] flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <h2 className="font-serif text-xl text-[#0B1220] dark:text-[#F8FAFC]">
                Offer &amp; Campaign Profile
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#3B6BF0] border border-blue-200 dark:border-blue-800">
                Personalized Targeting
              </span>
            </div>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] max-w-xl">
              Tell the AI what you are offering or looking for. The research, scoring, and email writing will automatically personalize themselves around your exact background and goals.
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
              <Briefcase className="w-3.5 h-3.5 text-[#3B6BF0]" />
              <span>B2B Business Offer</span>
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
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Job Seeker Mode</span>
            </button>
          </div>
        </div>

        {/* 1-Click Preset Templates */}
        <div className="pt-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#3B6BF0]" />
              <span>Quick Template Presets</span>
            </span>
            <span className="text-[10px] text-[#9CA3AF]">(click to fill form)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => handleApplyPreset('JOB_SEEKER')}
              className="p-3 text-left rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] hover:border-[#3B6BF0] dark:hover:border-[#3B6BF0] hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all group"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] group-hover:text-[#3B6BF0]">
                <Briefcase className="w-3.5 h-3.5 text-purple-500" />
                <span>AI / Full-Stack Engineer</span>
              </div>
              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 line-clamp-2">
                Outreach for developer roles with Python, React &amp; AI stack.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('AI_AGENCY')}
              className="p-3 text-left rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] hover:border-[#3B6BF0] dark:hover:border-[#3B6BF0] hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all group"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] group-hover:text-[#3B6BF0]">
                <Bot className="w-3.5 h-3.5 text-[#3B6BF0]" />
                <span>Agentic AI Agency</span>
              </div>
              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 line-clamp-2">
                Outbound pipeline automation for high-growth tech companies.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('GROWTH_AGENCY')}
              className="p-3 text-left rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] hover:border-[#3B6BF0] dark:hover:border-[#3B6BF0] hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all group"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] group-hover:text-[#3B6BF0]">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>B2B Pipeline Agency</span>
              </div>
              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 line-clamp-2">
                High-converting email outreach booking 15-30 sales demos/mo.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleApplyPreset('CLOUD_CONSULTING')}
              className="p-3 text-left rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] hover:border-[#3B6BF0] dark:hover:border-[#3B6BF0] hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all group"
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] group-hover:text-[#3B6BF0]">
                <Cloud className="w-3.5 h-3.5 text-indigo-500" />
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
        {/* Left 2 Columns: Identity, Offer, Target & Proof */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Sender Identity */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#3B6BF0]" />
              <span>1. Your Sender Identity &amp; Sign-off</span>
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
                  Company or Brand
                </label>
                <input
                  type="text"
                  value={formData.company_or_brand}
                  onChange={(e) => setFormData({ ...formData, company_or_brand: e.target.value })}
                  placeholder={isJobSeeker ? "e.g. Open to Roles" : "e.g. Acme Solutions"}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0]"
                />
              </div>
            </div>
          </div>

          {/* Card 2: What are you pitching? (Offer / Skills) */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>2. {isJobSeeker ? 'Your Skills & Technical Background' : 'What You Sell / Offer Description'}</span>
              </span>
              <span className="text-[10px] text-[#9CA3AF]">
                {isJobSeeker ? 'used for candidate pitch' : 'used for solution pitch'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                {isJobSeeker ? 'Summary of Your Engineering Experience & Stack' : 'Description of What You Sell & Problems Solved'}
              </label>
              <textarea
                rows={3}
                value={formData.offer_description}
                onChange={(e) => setFormData({ ...formData, offer_description: e.target.value })}
                placeholder={
                  isJobSeeker
                    ? "Full-stack engineer with deep expertise in AI workflows, FastAPI, React 19, and scalable database systems."
                    : "Autonomous sales research platform that automates lead enrichment, qualification, and executive outreach."
                }
                className="w-full text-xs p-3 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0] leading-relaxed"
                required
              />
            </div>
          </div>

          {/* Card 3: Target Qualification Criteria */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-[#3B6BF0]" />
                <span>3. Ideal Company Profile (Who is a good fit?)</span>
              </span>
              <span className="text-[10px] font-semibold text-[#3B6BF0]">
                Governs Smart Match Score
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                {isJobSeeker ? 'Target Hiring Companies, Engineering Roles & Languages' : 'Target Customer Criteria (Industry, Size, Triggers)'}
              </label>
              <textarea
                rows={3}
                value={formData.target_icp_criteria}
                onChange={(e) => setFormData({ ...formData, target_icp_criteria: e.target.value })}
                placeholder={
                  isJobSeeker
                    ? "Tech startups, scale-ups, and AI companies hiring Full-Stack Engineers, AI Engineers, or Python/React Developers."
                    : "High-growth B2B software, fintech, and modern tech companies with 20-500 employees looking to scale sales."
                }
                className="w-full text-xs p-3 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0] leading-relaxed"
                required
              />
              <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1.5">
                The system scores target companies (1 to 10) against this profile and automatically filters out accounts that don't match.
              </p>
            </div>
          </div>

          {/* Card 4: Proof Points & Links */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[#3B6BF0]" />
              <span>4. Concrete Proof Points &amp; Links</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                  Key Value Metrics / Concrete Achievements
                </label>
                <textarea
                  rows={2}
                  value={formData.key_benefits}
                  onChange={(e) => setFormData({ ...formData, key_benefits: e.target.value })}
                  placeholder={
                    isJobSeeker
                      ? "Architected production-ready multi-agent pipelines, reduced AI token costs by 60%, and built resilient database state machines."
                      : "Cuts manual lead research time by 80%, protects domain reputation with automated fit checks, and books high-intent meetings."
                  }
                  className="w-full text-xs p-3 rounded-xl border border-[#E5E7EB] dark:border-[#1E293B] bg-[#FAFBFD] dark:bg-[#0E1422] text-[#0B1220] dark:text-[#F8FAFC] focus:outline-hidden focus:border-[#3B6BF0] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                  Portfolio / GitHub / Website Link
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
              Reset to Saved
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-[#3B6BF0] hover:bg-blue-600 text-white shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile &amp; Update Settings</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: AI Team Simulator & Live Preview */}
        <div className="space-y-6">
          {/* How AI Team Adapts Card */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-xs space-y-4 transition-colors">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-[#3B6BF0]" />
                <span>How Your AI Team Works</span>
              </span>
              <span className="text-[10px] font-mono text-[#3B6BF0]">
                {formData.campaign_type}
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                  <Search className="w-3.5 h-3.5 text-[#3B6BF0]" />
                  <span>Company Research</span>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  {isJobSeeker
                    ? 'Researches company engineering stack, frameworks used, recent technical milestones, and open roles.'
                    : 'Researches company growth signals, cloud infrastructure, bottlenecks, and expansion initiatives.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                  <Target className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Match Qualification</span>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  {isJobSeeker
                    ? 'Evaluates whether company has technical alignment and openings matching your background.'
                    : 'Evaluates if company matches your ideal client size, industry, and acute need for your offer.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                  <PenLine className="w-3.5 h-3.5 text-amber-500" />
                  <span>Personalized Email Pitch</span>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  {isJobSeeker
                    ? 'Drafts candidate outreach highlighting your real projects, metrics, and portfolio links.'
                    : 'Drafts high-converting 3-paragraph outreach highlighting verified company challenges and your solution.'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#0E1422] border border-[#E5E7EB] dark:border-[#1E293B]">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#0B1220] dark:text-[#F8FAFC] mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>Safety &amp; Tone Review</span>
                </div>
                <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
                  Guarantees every statement about the prospect is true, removes spam phrases, and keeps copy under 110 words.
                </p>
              </div>
            </div>
          </div>

          {/* Live Dynamic Email Preview Mockup */}
          <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-xs space-y-3 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#3B6BF0]" />
                <span>Live Sample Email</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Primary Inbox Ready
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
