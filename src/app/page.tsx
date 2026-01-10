'use client';

/**
 * Landing Page
 * AI Math Tutor v2
 *
 * Welcome page with product introduction and username collection.
 * Redesigned for Phase 2 with TopBar and glass card styling.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { getUsername } from '@/lib/storage';

export default function LandingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Redirect to home if already logged in
  useEffect(() => {
    const username = getUsername();
    if (username) {
      router.push('/home');
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Username must be at most 30 characters');
      return;
    }

    // Save username and redirect
    localStorage.setItem('math-tutor-username', trimmedName);
    router.push('/home');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <TopBar showNavLinks={false} showLocalBadge={false} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-10 max-w-lg">
          {/* Gradient M Logo - 80x80 */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-4xl">M</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            AI Math Tutor
          </h1>

          <p className="text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Your personal AI tutor for Singapore Primary 1-6 Math
          </p>
        </div>

        {/* Inline Username Input */}
        <form onSubmit={handleSubmit} className="w-full max-w-md mb-10">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setError('');
                }}
                placeholder="What should we call you?"
                minLength={2}
                maxLength={30}
                required
                autoFocus
                className={`
                  w-full min-w-[200px] md:min-w-[280px] px-4 py-3
                  bg-white dark:bg-slate-800
                  border rounded-xl
                  text-slate-900 dark:text-slate-100
                  placeholder:text-slate-400 dark:placeholder:text-slate-500
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition-all duration-200
                  ${error ? 'border-red-400' : 'border-slate-200 dark:border-slate-700'}
                `}
              />
              {error && (
                <p className="mt-2 text-sm text-red-500">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={name.trim().length < 2}
              className={`
                px-6 py-3
                bg-gradient-to-r from-blue-500 to-purple-500
                text-white font-semibold
                rounded-xl
                shadow-md hover:shadow-lg
                hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                flex items-center justify-center gap-2
                whitespace-nowrap
              `}
            >
              Let&apos;s Go!
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </form>

        {/* Feature Cards - Glass effect */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full mb-8">
          {/* Chat Card */}
          <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all p-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Chat with AI
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Ask any P1-P6 math question. Upload homework photos.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                SHOW mode
              </span>
              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                TEACH mode
              </span>
            </div>
          </div>

          {/* Quiz Card */}
          <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all p-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <circle cx="12" cy="12" r="10" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Practice Quiz
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Test your skills with interactive quizzes.
            </p>
            {/* P1 Only Badge */}
            <span className="inline-flex items-center px-2 py-0.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-wide">
              P1 Only
            </span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="max-w-md w-full p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
            <div className="text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Please Note:</p>
              <ul className="space-y-1 text-amber-700 dark:text-amber-300 text-xs">
                <li>• Chat history stored locally in browser only</li>
                <li>• No cross-device sync available</li>
                <li>• Do not share personal/sensitive information</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <p>Aligned with Singapore MOE Primary Mathematics Syllabus (P1-P6)</p>
          <a
            href="https://www.linkedin.com/in/javensoh"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-blue-500 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
