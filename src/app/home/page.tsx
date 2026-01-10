'use client';

/**
 * Home Page
 * AI Math Tutor v2
 *
 * Navigation hub with personalized greeting and feature cards.
 * Updated for Phase 2 with TopBar and glass card styling.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { NavCard } from '@/components/NavCard';
import { getUsername } from '@/lib/storage';

export default function HomePage() {
  const router = useRouter();
  const [username, setUsernameState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hasCheckedAuth = useRef(false);

  // Auth check and username load (runs once on mount)
  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    const storedUsername = getUsername();
    if (!storedUsername) {
      router.push('/');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Initializing from localStorage (external system)
    setUsernameState(storedUsername);
    setMounted(true);
  }, [router]);

  // Don't render until mounted to prevent hydration issues
  if (!mounted || !username) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <TopBar username={username} currentPage="home" showNavLinks showLocalBadge />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Greeting */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Hi, {username}! 👋
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            What would you like to do today?
          </p>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl w-full">
          {/* AI Chat Card */}
          <NavCard
            title="AI Chat"
            description="Ask me any P1-P6 math question. Type or upload homework photo."
            href="/chat"
            icon={
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
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            }
          />

          {/* Quiz Card */}
          <NavCard
            title="Quiz"
            description="Test your math skills with interactive quizzes."
            href="/quiz"
            icon={
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
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            }
          />
        </div>

        {/* Pro tip */}
        <div className="mt-12 max-w-md text-center">
          <p className="text-sm text-slate-500 dark:text-slate-500">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              💡 Pro tip:
            </span>{' '}
            Use <span className="text-blue-600 dark:text-blue-400 font-medium">SHOW mode</span>{' '}
            for complete solutions, or{' '}
            <span className="text-purple-600 dark:text-purple-400 font-medium">TEACH mode</span>{' '}
            to learn step-by-step with hints.
          </p>
        </div>
      </main>
    </div>
  );
}
