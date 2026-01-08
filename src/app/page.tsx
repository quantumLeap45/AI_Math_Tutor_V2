'use client';

/**
 * Landing Page
 * AI Math Tutor v2
 *
 * Welcome page with product introduction and username collection.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { UsernameForm } from '@/components/UsernameForm';
import { getUsername } from '@/lib/storage';

export default function LandingPage() {
  const router = useRouter();

  // Redirect to home if already logged in
  useEffect(() => {
    const username = getUsername();
    if (username) {
      router.push('/home');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-3xl">M</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            AI Math Tutor
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Your personal AI tutor for Singapore Primary 1-6 Mathematics
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg w-full mb-8 animate-slideIn">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
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
                className="text-blue-600 dark:text-blue-400"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              SHOW Mode
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Get complete solutions with step-by-step explanations
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3">
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
                className="text-purple-600 dark:text-purple-400"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
              TEACH Mode
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Learn through guided questions and progressive hints
            </p>
          </div>
        </div>

        {/* Username Form Card */}
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-lg p-6 mb-8 animate-slideIn">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 text-center">
            Let&apos;s Get Started
          </h2>
          <UsernameForm />
        </div>

        {/* Limitations Notice */}
        <div className="max-w-md w-full p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm animate-fadeIn">
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
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Please Note:</p>
              <ul className="space-y-1 text-amber-700 dark:text-amber-300">
                <li>• Chat history is stored locally in your browser only</li>
                <li>• No cross-device sync available</li>
                <li>• Do not share personal or sensitive information</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-slate-200 dark:border-slate-700">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
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
