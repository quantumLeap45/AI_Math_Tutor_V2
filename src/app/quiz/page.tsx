'use client';

/**
 * Quiz Page
 * AI Math Tutor v2
 *
 * Main quiz page - provides interactive math quizzes for P1-P6 students.
 * Features question randomization, progress tracking, and detailed results.
 * Phase 3: Updated to use TopBar for consistent alignment.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { QuizSession } from '@/components/quiz';
import { getUsername } from '@/lib/storage';

export default function QuizPage() {
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <TopBar username={username} currentPage="quiz" showNavLinks showLocalBadge />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <QuizSession />
      </main>
    </div>
  );
}
