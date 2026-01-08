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
  const currentVersion = getVersion();

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
