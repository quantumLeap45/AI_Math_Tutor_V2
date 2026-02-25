/**
 * Centralized Configuration Management
 * AI Math Tutor V2
 *
 * Enterprise-grade configuration pattern based on production LLM applications.
 * Single source of truth for all environment-based settings with validation.
 */

interface AppConfig {
  // AI Provider Configuration
  gemini: {
    apiKey: string;
    model: string;
  };

  // Supabase Configuration
  supabase: {
    url: string;
    anonKey: string;
    enabled: boolean;
  };

  // Pinecone Configuration (for RAG)
  pinecone: {
    apiKey: string;
    index: string;
    environment: string;
    enabled: boolean;
  };

  // OpenAI Configuration (for RAG embeddings only)
  openai: {
    apiKey: string;
    enabled: boolean;
  };

  // Rate Limiting Configuration
  rateLimits: {
    antiSpamWindowMs: number;
    antiSpamMaxRequests: number;
    dailyQuotaLimit: number;
  };

  // OpenRouter Configuration (alternative AI provider)
  openRouter: {
    apiKey: string;
    model: string;
    enabled: boolean;
  };

  // Vercel Blob Configuration (for quiz question images)
  blob: {
    token: string;
    enabled: boolean;
  };

  // Storage Limits
  storage: {
    maxSessions: number;
    maxMessagesPerSession: number;
    maxTitleLength: number;
    maxUsernameLength: number;
    minUsernameLength: number;
  };
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  private constructor() {
    this.config = this.loadAndValidate();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadAndValidate(): AppConfig {
    const env = (name: string): string => {
      const raw = (process.env[name] || '').trim();
      if (raw.length >= 2 && raw[0] === raw[raw.length - 1] && (raw[0] === '"' || raw[0] === '\'')) {
        return raw.slice(1, -1).trim();
      }
      return raw;
    };

    const config: AppConfig = {
      gemini: {
        apiKey: env('GEMINI_API_KEY'),
        model: env('GEMINI_MODEL') || 'gemini-2.5-flash',
      },
      supabase: {
        url: env('NEXT_PUBLIC_SUPABASE_URL'),
        anonKey: env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
        enabled: Boolean(env('NEXT_PUBLIC_SUPABASE_URL') && env('NEXT_PUBLIC_SUPABASE_ANON_KEY')),
      },
      pinecone: {
        apiKey: env('PINECONE_API_KEY'),
        index: env('PINECONE_INDEX_NAME') || env('PINECONE_INDEX') || 'math-tutor',
        environment: env('PINECONE_ENVIRONMENT') || 'production',
        enabled: Boolean(env('PINECONE_API_KEY')),
      },
      openai: {
        apiKey: env('OPENAI_API_KEY'),
        enabled: Boolean(env('OPENAI_API_KEY')),
      },
      openRouter: {
        apiKey: env('OPENROUTER_API_KEY'),
        model: env('OPENROUTER_MODEL') || 'openai/gpt-4o-mini',
        enabled: Boolean(env('OPENROUTER_API_KEY')),
      },
      blob: {
        token: env('BLOB_READ_WRITE_TOKEN'),
        enabled: Boolean(env('BLOB_READ_WRITE_TOKEN')),
      },
      rateLimits: {
        antiSpamWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
        antiSpamMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20', 10),
        dailyQuotaLimit: parseInt(process.env.DAILY_QUOTA_LIMIT || '9999', 10),
      },
      storage: {
        maxSessions: parseInt(process.env.MAX_SESSIONS || '50', 10),
        maxMessagesPerSession: parseInt(process.env.MAX_MESSAGES_PER_SESSION || '100', 10),
        maxTitleLength: 100,
        maxUsernameLength: 30,
        minUsernameLength: 2,
      },
    };

    this.validate(config);
    return config;
  }

  private validate(config: AppConfig): void {
    const errors: string[] = [];

    // Required: At least one AI provider
    if (!config.gemini.apiKey && !config.openRouter.enabled) {
      errors.push('GEMINI_API_KEY or OPENROUTER_API_KEY is required');
    }

    // Warnings for optional services
    if (!config.supabase.enabled) {
      console.warn('⚠️  Supabase not configured - quota tracking disabled');
    }
    if (!config.pinecone.enabled) {
      console.warn('⚠️  Pinecone not configured - RAG disabled');
    }
    if (!config.openai.enabled) {
      console.warn('⚠️  OpenAI not configured - embeddings disabled');
    }
    if (!config.blob.enabled) {
      console.warn('⚠️  Vercel Blob not configured - quiz image uploads disabled');
    }

    // Validate rate limits
    if (config.rateLimits.antiSpamWindowMs < 1000) {
      errors.push('RATE_LIMIT_WINDOW_MS must be at least 1000');
    }
    if (config.rateLimits.antiSpamMaxRequests < 1) {
      errors.push('RATE_LIMIT_MAX_REQUESTS must be at least 1');
    }
    if (config.rateLimits.dailyQuotaLimit < 1) {
      errors.push('DAILY_QUOTA_LIMIT must be at least 1');
    }

    // Validate storage limits
    if (config.storage.maxSessions < 1) {
      errors.push('MAX_SESSIONS must be at least 1');
    }
    if (config.storage.maxMessagesPerSession < 1) {
      errors.push('MAX_MESSAGES_PER_SESSION must be at least 1');
    }

    if (errors.length > 0) {
      throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get all configuration (read-only)
   */
  all(): Readonly<AppConfig> {
    return { ...this.config };
  }

  /**
   * Get Gemini AI configuration
   */
  getGemini(): { apiKey: string; model: string } {
    return { ...this.config.gemini };
  }

  /**
   * Get Supabase configuration
   */
  getSupabase(): { url: string; anonKey: string; enabled: boolean } {
    return { ...this.config.supabase };
  }

  /**
   * Get Pinecone configuration
   */
  getPinecone(): { apiKey: string; index: string; environment: string; enabled: boolean } {
    return { ...this.config.pinecone };
  }

  /**
   * Get OpenAI configuration
   */
  getOpenAI(): { apiKey: string; enabled: boolean } {
    return { ...this.config.openai };
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimits(): { antiSpamWindowMs: number; antiSpamMaxRequests: number; dailyQuotaLimit: number } {
    return { ...this.config.rateLimits };
  }

  /**
   * Get storage limits
   */
  getStorage(): typeof this.config.storage {
    return { ...this.config.storage };
  }

  /**
   * Check if RAG (Retrieval-Augmented Generation) is fully configured
   * Requires both Pinecone and OpenAI
   */
  isRAGConfigured(): boolean {
    return this.config.pinecone.enabled && this.config.openai.enabled;
  }

  /**
   * Check if Supabase is configured
   */
  isSupabaseConfigured(): boolean {
    return this.config.supabase.enabled;
  }

  /**
   * Get OpenRouter configuration
   */
  getOpenRouter(): { apiKey: string; model: string; enabled: boolean } {
    return { ...this.config.openRouter };
  }

  /**
   * Check if OpenRouter is configured
   */
  isOpenRouterConfigured(): boolean {
    return this.config.openRouter.enabled;
  }

  /**
   * Get Vercel Blob configuration
   */
  getBlob(): { token: string; enabled: boolean } {
    return { ...this.config.blob };
  }

  /**
   * Check if Vercel Blob is configured
   */
  isBlobConfigured(): boolean {
    return this.config.blob.enabled;
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

// Export type for use in other modules
export type { AppConfig };
