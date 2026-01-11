'use client';

/**
 * TopBar Component
 * AI Math Tutor v2
 *
 * Global navigation bar with logo, nav links, local badge, username, and theme toggle.
 * Behavior varies by page (landing hides nav links, internal pages show all).
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LocalBadge } from './LocalBadge';
import { useTheme } from './ThemeProvider';

export interface TopBarProps {
  username?: string;
  currentPage?: 'home' | 'chat' | 'quiz';
  showNavLinks?: boolean;
  showLocalBadge?: boolean;
}

const NAV_LINKS = [
  { href: '/home', label: 'Home', page: 'home' as const },
  { href: '/chat', label: 'Chat', page: 'chat' as const },
  { href: '/quiz', label: 'Quiz', page: 'quiz' as const },
] as const;

export function TopBar({
  username,
  currentPage,
  showNavLinks = true,
  showLocalBadge = true,
}: TopBarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Determine active page based on pathname if not provided
  const activePage = currentPage || (() => {
    if (pathname === '/home') return 'home';
    if (pathname === '/chat' || pathname.startsWith('/chat/')) return 'chat';
    if (pathname === '/quiz') return 'quiz';
    return undefined;
  })();

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
      <div className="h-full w-full max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8">
        <div className="h-full flex items-center justify-between gap-4">
          {/* Left: Logo + optional nav links */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              {/* Gradient M logo */}
              <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <span className="text-white font-bold text-lg">M</span>
              </div>
              {/* Text - hidden on small mobile */}
              <span className="hidden sm:block text-lg font-semibold text-slate-900 dark:text-slate-100">
                AI Math Tutor
              </span>
            </Link>

            {/* Desktop nav links */}
            {showNavLinks && (
              <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
                {NAV_LINKS.map((link) => {
                  const isActive = activePage === link.page;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`
                        px-3 py-2 rounded-lg font-medium text-sm transition-colors relative
                        ${isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {link.label}
                      {isActive && (
                        <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-blue-500 rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right side elements */}
          <div className="flex items-center gap-3">
            {/* Desktop: LocalBadge + Username + Theme Toggle */}
            <div className="hidden lg:flex items-center gap-3">
              {showLocalBadge && <LocalBadge />}

              {username && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-slate-500 dark:text-slate-400"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                    {username}
                  </span>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile hamburger button */}
            {showNavLinks && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 -mr-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? (
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
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                ) : (
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
                    <path d="M3 12h18" />
                    <path d="M3 6h18" />
                    <path d="M3 18h18" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div className="fixed top-16 right-0 bottom-0 w-64 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 z-50 lg:hidden animate-in slide-in-from-right duration-200">
            <nav className="p-4 space-y-2" aria-label="Mobile navigation">
              {NAV_LINKS.map((link) => {
                const isActive = activePage === link.page;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors
                      ${isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }
                    `}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile-only: LocalBadge and Username */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
              {showLocalBadge && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Data Storage</span>
                  <LocalBadge />
                </div>
              )}

              {username && (
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
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
                    className="text-slate-500 dark:text-slate-400"
                  >
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 dark:text-slate-500">Signed in as</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {username}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}

/**
 * Theme Toggle Component (uses ThemeProvider context)
 */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        /* Moon icon for dark mode */
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
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      ) : (
        /* Sun icon for light mode */
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
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
