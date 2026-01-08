'use client';

/**
 * Navigation Card Component
 * AI Math Tutor v2
 *
 * Card component for home page navigation options.
 * Supports enabled/disabled states.
 */

import React from 'react';
import Link from 'next/link';

interface NavCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  disabled?: boolean;
  badge?: string;
}

export function NavCard({
  title,
  description,
  icon,
  href,
  disabled = false,
  badge,
}: NavCardProps) {
  const content = (
    <div
      className={`
        relative p-6
        bg-white dark:bg-slate-800
        rounded-2xl
        border border-slate-100 dark:border-slate-700
        shadow-sm
        transition-all duration-200
        ${
          disabled
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:shadow-lg hover:scale-[1.02] hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer'
        }
      `}
    >
      {/* Badge */}
      {badge && (
        <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
          {badge}
        </span>
      )}

      {/* Icon */}
      <div className="w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
        {icon}
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {description}
      </p>

      {/* Arrow indicator for enabled cards */}
      {!disabled && (
        <div className="mt-4 flex items-center text-blue-500 dark:text-blue-400 text-sm font-medium">
          Get started
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
            className="ml-1"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      )}
    </div>
  );

  if (disabled) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export default NavCard;
