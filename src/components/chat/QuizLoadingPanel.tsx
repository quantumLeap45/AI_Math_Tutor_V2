'use client';

/**
 * Quiz Loading Panel
 * AI Math Tutor v2
 *
 * Displays a polished loading experience while quiz questions are being generated.
 * Shows an animated progress bar, spinner, and rotating tips (fun facts + encouragement).
 */

import React, { useState, useEffect } from 'react';

/** Mix of math fun facts and encouragement messages */
const LOADING_TIPS = [
  { icon: '\u{1F9E0}', text: 'Did you know? The word "mathematics" comes from the Greek word "mathema" meaning "learning".' },
  { icon: '\u{1F31F}', text: "You're doing great! Practice makes perfect in math." },
  { icon: '\u{1F522}', text: 'Fun fact: Zero was invented in India around the 5th century!' },
  { icon: '\u{1F4A1}', text: 'Tip: Read each question carefully before choosing your answer.' },
  { icon: '\u{1F4D0}', text: "Did you know? A triangle's angles always add up to 180 degrees." },
  { icon: '\u{1F3AF}', text: 'Stay focused! Take your time with each question.' },
  { icon: '\u{1F9EE}', text: 'Fun fact: The equals sign (=) was invented in 1557!' },
  { icon: '\u{1F4AA}', text: "Mistakes help you learn. Don't be afraid to try!" },
  { icon: '\u{1F535}', text: 'Did you know? Circles have been studied for over 3,000 years.' },
  { icon: '\u{1F3C6}', text: 'Challenge yourself! Every question is a chance to grow.' },
  { icon: '\u{1F4CA}', text: 'Fun fact: The Fibonacci sequence appears everywhere in nature!' },
  { icon: '\u{2728}', text: 'Believe in yourself! You can solve these problems.' },
];

interface QuizLoadingPanelProps {
  /** Whether the panel is visible */
  isVisible: boolean;
  /** Called when the user clicks Cancel */
  onCancel: () => void;
}

export function QuizLoadingPanel({ isVisible, onCancel }: QuizLoadingPanelProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Rotate tips every 4 seconds with crossfade
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
        setIsFading(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [isVisible]);

  // Reset tip index when panel becomes visible
  useEffect(() => {
    if (isVisible) {
      setCurrentTipIndex(0);
      setIsFading(false);
    }
  }, [isVisible]);

  const currentTip = LOADING_TIPS[currentTipIndex];

  return (
    <div
      className={`
        w-[450px] bg-white dark:bg-slate-800
        border-l-2 border-blue-200 dark:border-blue-800
        flex flex-col transition-all duration-300 ease-in-out
        ${isVisible ? 'opacity-100' : 'opacity-0 translate-x-full'}
        ${!isVisible ? 'pointer-events-none' : ''}
      `}
      aria-label="Quiz loading"
      role="status"
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Generating Quiz...
          </span>
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
          >
            Cancel
          </button>
        </div>
        {/* Animated indeterminate progress bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-3 overflow-hidden">
          <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-loading-bar" />
        </div>
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Animated spinner icon */}
        <div className="w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
          <div className="w-10 h-10 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 text-center">
          Creating your questions...
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center">
          Our AI is crafting questions just for you
        </p>

        {/* Rotating tip card */}
        <div
          className={`
            w-full max-w-sm p-4 rounded-xl
            bg-gradient-to-br from-blue-50 to-purple-50
            dark:from-blue-900/20 dark:to-purple-900/20
            border border-blue-100 dark:border-blue-800
            transition-opacity duration-300
            ${isFading ? 'opacity-0' : 'opacity-100'}
          `}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{currentTip.icon}</span>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {currentTip.text}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
