'use client';

/**
 * Username Form Component
 * AI Math Tutor v2
 *
 * Collects username on landing page with validation.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setUsername } from '@/lib/storage';
import { STORAGE_LIMITS } from '@/types';

export function UsernameForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const minLength = STORAGE_LIMITS.MIN_USERNAME_LENGTH;
  const maxLength = STORAGE_LIMITS.MAX_USERNAME_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();

    // Validate
    if (trimmedName.length < minLength) {
      setError(`Name must be at least ${minLength} characters`);
      return;
    }

    if (trimmedName.length > maxLength) {
      setError(`Name must be at most ${maxLength} characters`);
      return;
    }

    try {
      setIsLoading(true);
      setUsername(trimmedName);
      router.push('/home');
    } catch {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          What should I call you?
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={name}
          onChange={e => {
            setName(e.target.value);
            setError('');
          }}
          placeholder="Enter your name"
          minLength={minLength}
          maxLength={maxLength}
          required
          autoComplete="off"
          autoFocus
          className={`
            w-full px-4 py-3
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
        disabled={isLoading || name.trim().length < minLength}
        className={`
          w-full px-6 py-3
          bg-gradient-to-r from-blue-500 to-purple-500
          text-white font-medium
          rounded-xl
          shadow-md
          hover:shadow-lg hover:scale-[1.02]
          active:scale-[0.98]
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
          flex items-center justify-center gap-2
        `}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Starting...
          </>
        ) : (
          'Start Learning'
        )}
      </button>
    </form>
  );
}

export default UsernameForm;
