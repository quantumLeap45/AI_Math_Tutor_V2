'use client';

/**
 * Landing Page
 * AI Math Tutor v2
 *
 * Welcome page with floating math symbols animation and username collection.
 * Features returning user flow - shows "Welcome back" instead of input form.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUsername } from '@/lib/storage';
import { ThemeToggle } from '@/components/ThemeToggle';

// Math symbols for animation
const MATH_GLYPHS = ['π', '∑', '√', '∫', '∞', '≠', '≤', '≥', '±', '×', '÷', '½', '¼', '²', '³', '°', '∠', '△', '○', '□', '∂', '∇', '∆', '∝', 'φ', 'ψ', 'ω', 'λ', 'β', 'α', 'γ', 'δ', 'ε', 'θ', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '=', '(', ')', '∀', '∃', '∈', '⊂', '∪', '∩'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  glyph: string;
  opacity: number;
  seed: number;
  phase: number;
}

export default function LandingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [returningUser, setReturningUser] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Canvas animation refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef(0);
  const lastScrambleRef = useRef(0);
  const isDarkRef = useRef(false);

  // Check for returning user on mount
  useEffect(() => {
    const username = getUsername();
    if (username) {
      setReturningUser(username);
    }
    setMounted(true);
  }, []);

  // Simplex-like noise function
  const noise2D = useCallback((x: number, y: number) => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const hash = (n: number) => {
      let h = n * 374761393;
      h = (h ^ (h >> 13)) * 1103515245;
      return (h ^ (h >> 16)) / 2147483648;
    };

    const tl = hash(X + Y * 57);
    const tr = hash(X + 1 + Y * 57);
    const bl = hash(X + (Y + 1) * 57);
    const br = hash(X + 1 + (Y + 1) * 57);

    const t = tl * (1 - xf) + tr * xf;
    const b = bl * (1 - xf) + br * xf;

    return t * (1 - yf) + b * yf;
  }, []);

  // Create particle
  const createParticle = useCallback((randomY = false) => {
    const size = 11 + Math.random() * 6;
    return {
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 800),
      y: randomY ? Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 600) : (typeof window !== 'undefined' ? window.innerHeight : 600) + 20,
      vx: 0,
      vy: 0,
      baseVx: (Math.random() - 0.5) * 0.3,
      baseVy: (Math.random() - 0.5) * 0.2 - 0.2,
      size,
      glyph: MATH_GLYPHS[Math.floor(Math.random() * MATH_GLYPHS.length)],
      opacity: 0.18 + (Math.random() - 0.5) * 0.03,
      seed: Math.random() * 1000,
      phase: Math.random() * Math.PI * 2,
    };
  }, []);

  // Animation loop
  useEffect(() => {
    if (!mounted || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.scale(dpr, dpr);

      // Calculate particle count based on screen area
      const density = 7000;
      const particleCount = Math.floor((width * height) / density);

      // Initialize particles
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push(createParticle(true));
      }
    };

    resize();
    window.addEventListener('resize', resize);

    // Cache theme value via MutationObserver instead of querying DOM every frame
    isDarkRef.current = document.documentElement.classList.contains('dark');
    const themeObserver = new MutationObserver(() => {
      isDarkRef.current = document.documentElement.classList.contains('dark');
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const CONFIG = {
      baseOpacity: 0.18,
      damping: 0.96,
      noiseScale: 0.006,
      noiseSpeed: 0.0003,
      driftBias: -0.4,
      scrambleIntervalMs: 120,
      scrambleStrength: 0.8,
      glyphMutationRate: 0.02,
    };

    const animate = () => {
      const now = Date.now();
      timeRef.current += CONFIG.noiseSpeed;

      // Periodic scramble
      if (now - lastScrambleRef.current > CONFIG.scrambleIntervalMs) {
        const scrambleCount = Math.floor(particlesRef.current.length * 0.2);
        for (let i = 0; i < scrambleCount; i++) {
          const p = particlesRef.current[Math.floor(Math.random() * particlesRef.current.length)];
          if (p) {
            p.vx += (Math.random() - 0.5) * CONFIG.scrambleStrength * 2;
            p.vy += (Math.random() - 0.5) * CONFIG.scrambleStrength * 2;
          }
        }
        // Mutate glyphs
        particlesRef.current.forEach(p => {
          if (Math.random() < CONFIG.glyphMutationRate) {
            p.glyph = MATH_GLYPHS[Math.floor(Math.random() * MATH_GLYPHS.length)];
          }
        });
        lastScrambleRef.current = now;
      }

      ctx.clearRect(0, 0, width, height);

      const fillColor = isDarkRef.current ? '16, 185, 129' : '5, 150, 105';

      // Gradient mask for edge fading
      const gradient = ctx.createRadialGradient(
        width / 2, height * 0.6, 0,
        width / 2, height * 0.6, Math.max(width, height) * 0.8
      );
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(0.4, 'rgba(0,0,0,0.9)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      particlesRef.current.forEach(p => {
        // Value noise for drift
        const nx = (p.x + p.seed) * CONFIG.noiseScale;
        const ny = (p.y + p.seed) * CONFIG.noiseScale;
        const t = timeRef.current * 100;

        const noiseVx = (noise2D(nx + t, ny) - 0.5) * 0.5;
        const noiseVy = (noise2D(nx, ny + t + 100) - 0.5) * 0.3;

        // Apply noise + base drift + upward bias
        p.vx += noiseVx * 0.1;
        p.vy += noiseVy * 0.1 + CONFIG.driftBias * 0.05;
        p.vx += p.baseVx * 0.1;
        p.vy += p.baseVy * 0.1;

        // Apply damping
        p.vx *= CONFIG.damping;
        p.vy *= CONFIG.damping;

        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap/recycle particles
        if (p.y < -20) {
          Object.assign(p, createParticle(false));
        }
        if (p.y > height + 20) {
          Object.assign(p, createParticle(false));
          p.y = -20;
        }
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;

        // Reset opacity slowly
        p.opacity += (CONFIG.baseOpacity - p.opacity) * 0.02;

        // Skip if off screen
        if (p.x < -30 || p.x > width + 30 || p.y < -30 || p.y > height + 30) return;

        // Draw with glow
        ctx.font = `${p.size}px "JetBrains Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow layer
        ctx.fillStyle = `rgba(${fillColor}, ${p.opacity * 0.3})`;
        ctx.fillText(p.glyph, p.x + 1, p.y + 1);

        // Main layer
        ctx.fillStyle = `rgba(${fillColor}, ${p.opacity})`;
        ctx.fillText(p.glyph, p.x, p.y);
      });

      // Apply edge fade mask
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
      themeObserver.disconnect();
    };
  }, [mounted, createParticle, noise2D]);

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

  const handleContinue = () => {
    router.push('/home');
  };

  // Loading state
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Canvas background */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0, filter: 'blur(0.5px)' }}
      />

      {/* Navigation */}
      <header className="sticky top-0 z-50 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="hidden sm:block text-lg font-semibold text-slate-900 dark:text-slate-100">
              AI Math Tutor
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/home"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg shadow-none transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">
        <div className="text-center max-w-lg">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400 mb-8 animate-fade-in-up">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Built for Singapore Primary Students
          </div>

          {/* Logo */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <span className="text-white font-bold text-4xl">M</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            Your personal<br />
            <span className="text-emerald-500">math tutor</span> anytime
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            Get instant help with Primary 1-6 math. Ask questions, practice with quizzes, and learn at your own pace.
          </p>

          {/* Returning user or new user form */}
          {returningUser ? (
            <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Welcome back,
                </p>
                <button
                  onClick={handleContinue}
                  className="w-full px-6 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-lg rounded-lg shadow-none transition-colors flex items-center justify-center gap-2"
                >
                  <span className="text-xl">{returningUser}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: '400ms' }}>
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
                      border rounded-lg
                      text-slate-900 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                      focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
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
                    bg-emerald-500 hover:bg-emerald-600
                    text-white font-medium
                    rounded-lg
                    shadow-none
                    transition-colors duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
                    flex items-center justify-center gap-2
                    whitespace-nowrap
                  `}
                >
                  Let's Go!
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Features Section */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
              What Can AI Math Tutor Do?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Our goal is to provide comprehensive math support for Primary 1 to 6 students, aligned with the Singapore MOE Mathematics Syllabus.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* AI Chat Feature */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Chat Tutor</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span>Ask any math question and get step-by-step explanations</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span><strong>SHOW mode:</strong> Get full solutions with working</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span><strong>TEACH mode:</strong> Get hints and guidance without direct answers</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span>Upload images of math problems (worksheets, textbook questions)</span>
                </li>
              </ul>
            </div>

            {/* Quiz Mode Feature */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 17h.01" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Quiz Mode</h3>
              </div>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span>Generate custom quizzes by topic, level (P1-P6), and difficulty</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span>Built-in AI helper gives hints without revealing answers</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span>Quiz summary with score, accuracy, and review options</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  <span>Retry quizzes to improve your score</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Important Limitation */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              Important Limitation - Image Upload
            </h4>
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              While our AI chat can <strong>read and understand text-based math problems</strong> from uploaded images, it currently <strong>does not support visual/diagram-based questions</strong>. For example, if a question shows a triangle with labeled side lengths and angles, the AI cannot interpret the visual diagram to solve the problem. This capability requires advanced visual understanding that we're working to add in the future.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-slate-200 dark:border-slate-700 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <p>Aligned with Singapore MOE Primary Mathematics Syllabus (P1-P6)</p>
        </div>
      </footer>
    </div>
  );
}