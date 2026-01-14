/**
 * localStorage Utility Functions
 * AI Math Tutor v2
 *
 * Handles all localStorage operations with proper error handling
 * and SSR compatibility checks.
 */

import {
  ChatSession,
  UserSettings,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  CURRENT_VERSION,
  STORAGE_LIMITS,
  TutorMode,
} from '@/types';

import {
  QuizAttempt,
  QuizProgress,
  QuizMetadata,
  LevelProgress,
  QUIZ_STORAGE_KEYS,
  QUIZ_STORAGE_LIMITS,
} from '@/types';

// ============ USERNAME ============

/**
 * Get the stored username
 */
export function getUsername(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.USERNAME);
}

/**
 * Set the username (validates length)
 */
export function setUsername(username: string): void {
  const trimmed = username.trim().slice(0, STORAGE_LIMITS.MAX_USERNAME_LENGTH);
  if (trimmed.length < STORAGE_LIMITS.MIN_USERNAME_LENGTH) {
    throw new Error(`Username must be at least ${STORAGE_LIMITS.MIN_USERNAME_LENGTH} characters`);
  }
  localStorage.setItem(STORAGE_KEYS.USERNAME, trimmed);
}

/**
 * Clear the stored username
 */
export function clearUsername(): void {
  localStorage.removeItem(STORAGE_KEYS.USERNAME);
}

// ============ SESSIONS ============

/**
 * Get all chat sessions from localStorage
 */
export function getSessions(): ChatSession[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatSession[];
  } catch {
    console.warn('Failed to parse sessions from localStorage');
    return [];
  }
}

/**
 * Save chat sessions to localStorage (with limits enforced)
 */
export function saveSessions(sessions: ChatSession[]): void {
  // Enforce session limit
  const limited = sessions.slice(0, STORAGE_LIMITS.MAX_SESSIONS);

  // Enforce message limit per session
  limited.forEach(session => {
    session.messages = session.messages.slice(-STORAGE_LIMITS.MAX_MESSAGES_PER_SESSION);
  });

  try {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(limited));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, pruning old sessions...');
      pruneStorageIfNeeded();
      // Retry with fewer sessions
      const reduced = limited.slice(0, 20);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(reduced));
    } else {
      throw error;
    }
  }
}

/**
 * Get a specific session by ID
 */
export function getSession(id: string): ChatSession | undefined {
  const sessions = getSessions();
  return sessions.find(s => s.id === id);
}

/**
 * Get the current/last active session
 */
export function getCurrentSession(): ChatSession | undefined {
  const settings = getSettings();
  if (settings.lastActiveSession) {
    return getSession(settings.lastActiveSession);
  }
  // Return the most recent session
  const sessions = getSessions();
  return sessions[0];
}

/**
 * Save a single session (create or update)
 */
export function saveSession(session: ChatSession): void {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === session.id);

  session.updatedAt = new Date().toISOString();

  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session); // Add to beginning (most recent first)
  }

  saveSessions(sessions);
}

/**
 * Delete a session by ID
 */
export function deleteSession(id: string): void {
  const sessions = getSessions();
  const filtered = sessions.filter(s => s.id !== id);
  saveSessions(filtered);
}

/**
 * Create a new empty session
 */
export function createSession(mode: TutorMode = 'SHOW'): ChatSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: 'New Chat',
    mode,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

// ============ SETTINGS ============

/**
 * Get user settings (with defaults)
 */
export function getSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user settings (partial update supported)
 */
export function saveSettings(settings: Partial<UserSettings>): void {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
}

// ============ VERSION & MIGRATION ============

/**
 * Get the current schema version
 */
export function getVersion(): string {
  if (typeof window === 'undefined') return CURRENT_VERSION;
  return localStorage.getItem(STORAGE_KEYS.VERSION) || '0.0.0';
}

/**
 * Set the schema version
 */
export function setVersion(version: string): void {
  localStorage.setItem(STORAGE_KEYS.VERSION, version);
}

/**
 * Run any necessary migrations
 */
export function runMigrations(): void {
  getVersion();

  // No migrations needed for v1.0.0
  // Add migration logic here as schema evolves

  // Always set to current version
  setVersion(CURRENT_VERSION);
}

// ============ STORAGE MANAGEMENT ============

/**
 * Clear all app data from localStorage
 */
export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * Prune storage if quota is exceeded
 */
export function pruneStorageIfNeeded(): void {
  try {
    // Try to save a test value
    localStorage.setItem('math-tutor-test', 'x'.repeat(1000));
    localStorage.removeItem('math-tutor-test');
  } catch {
    console.warn('localStorage quota exceeded, pruning...');

    const sessions = getSessions();

    // Strategy 1: Remove images from old messages
    sessions.forEach(session => {
      session.messages.forEach((msg, idx) => {
        if (idx < session.messages.length - 10) {
          delete msg.imageUrl; // Remove images from old messages
        }
      });
    });

    // Strategy 2: Remove oldest sessions if still needed
    if (sessions.length > 20) {
      sessions.splice(20); // Keep only 20 most recent
    }

    saveSessions(sessions);
  }
}

/**
 * Initialize storage on app load
 */
export function initializeStorage(): void {
  if (typeof window === 'undefined') return;

  runMigrations();
  pruneStorageIfNeeded();
}

/**
 * Export all data (for backup purposes)
 */
export function exportData(): string {
  const data = {
    username: getUsername(),
    sessions: getSessions(),
    settings: getSettings(),
    version: getVersion(),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(data, null, 2);
}

// ============ QUIZ STORAGE ============

/**
 * Get all quiz attempts from localStorage
 */
export function getQuizAttempts(): QuizAttempt[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(QUIZ_STORAGE_KEYS.ATTEMPTS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QuizAttempt[];
  } catch {
    console.warn('Failed to parse quiz attempts from localStorage');
    return [];
  }
}

/**
 * Save quiz attempts to localStorage (with limits enforced)
 */
export function saveQuizAttempts(attempts: QuizAttempt[]): void {
  const limited = attempts.slice(0, QUIZ_STORAGE_LIMITS.MAX_ATTEMPTS);
  try {
    localStorage.setItem(QUIZ_STORAGE_KEYS.ATTEMPTS, JSON.stringify(limited));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, pruning old quiz attempts...');
      // Keep only most recent 20
      const reduced = limited.slice(0, 20);
      localStorage.setItem(QUIZ_STORAGE_KEYS.ATTEMPTS, JSON.stringify(reduced));
    } else {
      throw error;
    }
  }
}

/**
 * Get a specific quiz attempt by ID
 */
export function getQuizAttempt(id: string): QuizAttempt | undefined {
  const attempts = getQuizAttempts();
  return attempts.find(a => a.id === id);
}

/**
 * Save a quiz attempt (create or update)
 */
export function saveQuizAttempt(attempt: QuizAttempt): void {
  const attempts = getQuizAttempts();
  const index = attempts.findIndex(a => a.id === attempt.id);

  if (index >= 0) {
    attempts[index] = attempt;
  } else {
    attempts.unshift(attempt);
  }

  saveQuizAttempts(attempts);

  // Update progress stats
  updateQuizProgressFromAttempt(attempt);
}

/**
 * Delete a quiz attempt by ID
 */
export function deleteQuizAttempt(id: string): void {
  const attempts = getQuizAttempts();
  const filtered = attempts.filter(a => a.id !== id);
  saveQuizAttempts(filtered);
}

/**
 * Get the current active quiz session (in progress)
 */
export function getCurrentQuiz(): QuizAttempt | undefined {
  if (typeof window === 'undefined') return undefined;
  const raw = localStorage.getItem(QUIZ_STORAGE_KEYS.CURRENT);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as QuizAttempt;
  } catch {
    return undefined;
  }
}

/**
 * Save the current active quiz session
 */
export function saveCurrentQuiz(attempt: QuizAttempt): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUIZ_STORAGE_KEYS.CURRENT, JSON.stringify(attempt));
  } catch (error) {
    console.error('Failed to save current quiz:', error);
  }
}

/**
 * Clear the current active quiz session
 */
export function clearCurrentQuiz(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(QUIZ_STORAGE_KEYS.CURRENT);
}

/**
 * Get quiz progress statistics
 */
export function getQuizProgress(): QuizProgress {
  if (typeof window === 'undefined') {
    return getDefaultQuizProgress();
  }

  const raw = localStorage.getItem(QUIZ_STORAGE_KEYS.PROGRESS);
  if (!raw) {
    return getDefaultQuizProgress();
  }

  try {
    return { ...getDefaultQuizProgress(), ...JSON.parse(raw) };
  } catch {
    return getDefaultQuizProgress();
  }
}

/**
 * Save quiz progress statistics
 */
export function saveQuizProgress(progress: QuizProgress): void {
  if (typeof window === 'undefined') return;
  progress.lastUpdated = new Date().toISOString();
  try {
    localStorage.setItem(QUIZ_STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (error) {
    console.error('Failed to save quiz progress:', error);
  }
}

/**
 * Update quiz progress from a completed attempt
 */
export function updateQuizProgressFromAttempt(attempt: QuizAttempt): void {
  const progress = getQuizProgress();
  const currentLevel = attempt.config.level;

  // Update totals
  progress.totalQuizzes += 1;
  progress.totalQuestions += attempt.questions.length;

  // Calculate score
  const score = attempt.score ?? 0;

  // Update overall accuracy
  const totalCorrectBefore = progress.overallAccuracy * (progress.totalQuizzes - 1) / 100;
  const newTotalCorrect = totalCorrectBefore + (score / 100);
  progress.overallAccuracy = Math.round((newTotalCorrect / progress.totalQuizzes) * 100);

  // Update best score
  if (score > progress.bestScore) {
    progress.bestScore = score;
  }

  // Update level progress
  if (!progress.byLevel[currentLevel]) {
    progress.byLevel[currentLevel] = {
      level: currentLevel,
      quizzesCompleted: 0,
      questionsAnswered: 0,
      averageScore: 0,
      masteredTopics: [],
      needsPractice: [],
    };
  }

  // MIGRATION: If level exists but has old format (missing arrays), add them
  const levelProgress = progress.byLevel[currentLevel];
  if (!levelProgress.masteredTopics) {
    levelProgress.masteredTopics = [];
  }
  if (!levelProgress.needsPractice) {
    levelProgress.needsPractice = [];
  }

  levelProgress.quizzesCompleted += 1;
  levelProgress.questionsAnswered += attempt.questions.length;

  // Update level average score
  const previousTotal = levelProgress.averageScore * (levelProgress.quizzesCompleted - 1);
  levelProgress.averageScore = Math.round((previousTotal + score) / levelProgress.quizzesCompleted);

  // Update topic breakdown
  const topicScores: Record<string, { correct: number; total: number }> = {};

  for (let i = 0; i < attempt.questions.length; i++) {
    const q = attempt.questions[i];
    const a = attempt.answers[i];

    if (!topicScores[q.topic]) {
      topicScores[q.topic] = { correct: 0, total: 0 };
    }
    topicScores[q.topic].total += 1;
    if (a.isCorrect) {
      topicScores[q.topic].correct += 1;
    }
  }

  // Update mastered topics and needs practice
  for (const [topic, scores] of Object.entries(topicScores)) {
    const accuracy = (scores.correct / scores.total) * 100;

    if (accuracy >= 80 && !levelProgress.masteredTopics.includes(topic)) {
      levelProgress.masteredTopics.push(topic);
    }

    if (accuracy < 60 && !levelProgress.needsPractice.includes(topic)) {
      levelProgress.needsPractice.push(topic);
    }

    // Also update global weak areas
    if (accuracy < 60 && !progress.weakAreas.includes(topic)) {
      progress.weakAreas.push(topic);
      // Limit weak areas
      if (progress.weakAreas.length > QUIZ_STORAGE_LIMITS.MAX_WEAK_AREAS) {
        progress.weakAreas = progress.weakAreas.slice(0, QUIZ_STORAGE_LIMITS.MAX_WEAK_AREAS);
      }
    }
  }

  saveQuizProgress(progress);
}

/**
 * Clear all quiz-related data
 */
export function clearQuizData(): void {
  if (typeof window === 'undefined') return;
  Object.values(QUIZ_STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// ============ MULTI-RESUME SUPPORT ============

/**
 * Get all in-progress quiz attempts from localStorage
 * Returns array of up to MAX_IN_PROGRESS (50) quizzes
 */
export function getInProgressQuizzes(): QuizAttempt[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(QUIZ_STORAGE_KEYS.IN_PROGRESS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QuizAttempt[];
  } catch {
    console.warn('Failed to parse in-progress quizzes from localStorage');
    return [];
  }
}

/**
 * Save in-progress quiz attempts to localStorage
 * Enforces MAX_IN_PROGRESS limit (50)
 */
export function saveInProgressQuizzes(quizzes: QuizAttempt[]): void {
  if (typeof window === 'undefined') return;

  // Filter only in-progress quizzes
  const inProgress = quizzes.filter(q => q.state === 'in_progress');

  // Enforce limit - keep most recent by startedAt
  const limited = inProgress
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, QUIZ_STORAGE_LIMITS.MAX_IN_PROGRESS);

  try {
    localStorage.setItem(QUIZ_STORAGE_KEYS.IN_PROGRESS, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to save in-progress quizzes:', error);
  }
}

/**
 * Get a specific in-progress quiz by ID
 */
export function getInProgressQuiz(id: string): QuizAttempt | undefined {
  const quizzes = getInProgressQuizzes();
  return quizzes.find(q => q.id === id);
}

/**
 * Add or update an in-progress quiz
 * Returns the updated list of in-progress quizzes
 */
export function addOrUpdateInProgressQuiz(quiz: QuizAttempt): QuizAttempt[] {
  const quizzes = getInProgressQuizzes();
  const index = quizzes.findIndex(q => q.id === quiz.id);

  if (index >= 0) {
    quizzes[index] = { ...quiz, lastSavedAt: new Date().toISOString() };
  } else {
    quizzes.push({ ...quiz, lastSavedAt: new Date().toISOString() });
  }

  saveInProgressQuizzes(quizzes);
  return quizzes;
}

/**
 * Remove an in-progress quiz by ID
 * Returns true if the quiz was found and removed
 */
export function removeInProgressQuiz(id: string): boolean {
  const quizzes = getInProgressQuizzes();
  const filtered = quizzes.filter(q => q.id !== id);

  if (filtered.length < quizzes.length) {
    saveInProgressQuizzes(filtered);
    return true;
  }

  return false;
}

/**
 * Get metadata for all in-progress quizzes
 * Returns lightweight QuizMetadata array without full questions
 */
export function getInProgressQuizMetadata(): QuizMetadata[] {
  const quizzes = getInProgressQuizzes();
  return quizzes.map(q => ({
    id: q.id,
    config: q.config,
    currentIndex: q.currentIndex,
    totalQuestions: q.questions.length,
    startedAt: q.startedAt,
    lastSavedAt: q.lastSavedAt || q.startedAt,
  }));
}

/**
 * Get default quiz progress structure
 */
function getDefaultQuizProgress(): QuizProgress {
  const byLevel: Record<string, LevelProgress> = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'].reduce((acc, level) => {
    acc[level] = {
      level: level as 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6',
      quizzesCompleted: 0,
      questionsAnswered: 0,
      averageScore: 0,
      masteredTopics: [],
      needsPractice: [],
    };
    return acc;
  }, {} as Record<string, LevelProgress>);

  return {
    totalQuizzes: 0,
    totalQuestions: 0,
    overallAccuracy: 0,
    bestScore: 0,
    currentStreak: 0,
    byLevel: byLevel as Record<'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6', LevelProgress>,
    weakAreas: [],
    lastUpdated: new Date().toISOString(),
  };
}
