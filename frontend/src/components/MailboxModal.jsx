import React from 'react';
import { Mail, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';

export default function MailboxModal({ isOpen, onClose, mailboxInfo, onDisconnect, onConnect, configError }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#3B6BF0] flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="font-serif text-lg font-normal text-[#0B1220] dark:text-[#F8FAFC]">
              {mailboxInfo?.connected ? "Connected Outbound Email" : "Connect Google Workspace / Gmail"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content: If connected */}
        {mailboxInfo?.connected ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Active Sending Account
                </span>
              </div>
              <div className="font-mono text-sm font-bold text-[#0B1220] dark:text-[#F8FAFC]">
                {mailboxInfo.email}
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                All approved emails are sent directly through your verified Google account. They land in your recipient's primary inbox and automatically appear in your personal Gmail Sent folder.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                className="px-4 py-2 text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
              >
                Disconnect Account
              </button>
            </div>
          </div>
        ) : configError ? (
          /* Content: Setup instructions if GOOGLE_CLIENT_ID not configured */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Google Account Setup</span>
              </div>
              <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                To send from your personal domain, configure Google Cloud credentials in your <code>.env</code> file:
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#0B0F17] border border-[#E5E7EB] dark:border-[#1E293B] font-mono text-xs text-[#1F2937] dark:text-gray-300 space-y-1 overflow-x-auto">
              <div>GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com</div>
              <div>GOOGLE_CLIENT_SECRET=your_client_secret</div>
              <div>GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold bg-[#0B1220] dark:bg-white text-white dark:text-[#0B1220] rounded-xl transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        ) : (
          /* Content: Ready to connect */
          <div className="space-y-4">
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] leading-relaxed">
              Connect your Google Workspace or Gmail account so emails send directly from your real work address (e.g. <code>you@yourcompany.com</code>).
            </p>

            <div className="p-3.5 rounded-xl bg-[#FAFBFD] dark:bg-[#0B0F17] border border-[#E5E7EB] dark:border-[#1E293B] space-y-2.5 text-xs">
              <div className="font-semibold text-[#0B1220] dark:text-[#F8FAFC]">
                Why connect with Google:
              </div>
              <ul className="space-y-2 text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Primary Inbox Delivery:</strong> Reaches the real recipient instead of spam or promotions folders.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Visible in Your Sent Folder:</strong> Every approved email appears in your real Gmail Sent mailbox.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Zero Technical Setup:</strong> No password sharing or complex server configuration required.</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConnect}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold bg-[#3B6BF0] hover:bg-blue-600 text-white rounded-xl transition-all shadow-xs"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Connect with Google</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
