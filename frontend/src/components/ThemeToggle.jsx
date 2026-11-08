import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = "", variant = "segmented" }) {
  const { theme, toggleTheme } = useTheme();

  // Minimalist single-button variant
  if (variant === "single") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle color theme"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0B1220] dark:hover:text-[#F8FAFC] bg-[#F5F5FA] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] transition-colors focus:outline-none active:scale-[0.96] cursor-pointer ${className}`}
      >
        {theme === 'dark' ? (
          /* Sleek 14px Minimalist Sun */
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M4.93 4.93l1.41 1.41" />
            <path d="M17.66 17.66l1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M6.34 17.66l-1.41 1.41" />
            <path d="M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          /* Sleek 14px Minimalist Crescent Moon */
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    );
  }

  // Executive Segmented Switcher (Linear / Vercel style)
  return (
    <div
      className={`inline-flex items-center p-0.5 rounded-lg bg-[#F5F5FA] dark:bg-[#111827] border border-[#E5E7EB] dark:border-[#1E293B] transition-colors ${className}`}
      role="group"
      aria-label="Theme selector"
    >
      {/* Light option */}
      <button
        type="button"
        onClick={() => {
          if (theme !== 'light') toggleTheme();
        }}
        aria-label="Light mode"
        title="Light mode"
        className={`w-7 h-7 rounded-[6px] flex items-center justify-center transition-all cursor-pointer ${
          theme === 'light'
            ? 'bg-white text-[#0B1220] shadow-xs border border-[#E5E7EB]'
            : 'text-[#9CA3AF] dark:text-[#64748B] hover:text-[#4B5563] dark:hover:text-[#CBD5E1]'
        }`}
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2" />
          <path d="M12 19.5v2" />
          <path d="M4.93 4.93l1.41 1.41" />
          <path d="M17.66 17.66l1.41 1.41" />
          <path d="M2.5 12h2" />
          <path d="M19.5 12h2" />
          <path d="M6.34 17.66l-1.41 1.41" />
          <path d="M19.07 4.93l-1.41 1.41" />
        </svg>
      </button>

      {/* Dark option */}
      <button
        type="button"
        onClick={() => {
          if (theme !== 'dark') toggleTheme();
        }}
        aria-label="Dark mode"
        title="Dark mode"
        className={`w-7 h-7 rounded-[6px] flex items-center justify-center transition-all cursor-pointer ${
          theme === 'dark'
            ? 'bg-[#1E293B] text-[#F8FAFC] shadow-xs border border-gray-700'
            : 'text-[#9CA3AF] dark:text-[#64748B] hover:text-[#4B5563] dark:hover:text-[#CBD5E1]'
        }`}
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
    </div>
  );
}
