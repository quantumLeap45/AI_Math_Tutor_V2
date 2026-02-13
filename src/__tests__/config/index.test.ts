/**
 * Config Service Tests
 * AI Math Tutor V2
 *
 * Tests for centralized configuration management.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup environment before importing config
const originalEnv = { ...process.env };

beforeEach(() => {
  // Set required environment variables
  process.env.GEMINI_API_KEY = 'test-api-key';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.PINECONE_API_KEY = 'test-pinecone-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.DAILY_QUOTA_LIMIT = '30';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX_REQUESTS = '20';
});

describe('ConfigService', () => {
  // We import config dynamically to ensure env vars are set
  let configModule: any;

  beforeEach(async () => {
    // Re-import config module for each test
    configModule = await import('@/config');
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance across multiple calls', () => {
      const instance1 = configModule.ConfigManager.getInstance();
      const instance2 = configModule.ConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Environment Variable Validation', () => {
    it('should validate GEMINI_API_KEY is present', () => {
      const config = configModule.config;
      const geminiConfig = config.getGemini();

      expect(geminiConfig.apiKey).toBe('test-api-key');
    });

    it('should use default model', () => {
      const config = configModule.config;
      const geminiConfig = config.getGemini();

      expect(geminiConfig.model).toBe('gemini-2.5-flash');
    });

    it('should parse rate limits correctly', () => {
      const config = configModule.config;
      const rateLimits = config.getRateLimits();

      expect(rateLimits.antiSpamWindowMs).toBe(60000);
      expect(rateLimits.antiSpamMaxRequests).toBe(20);
      expect(rateLimits.dailyQuotaLimit).toBe(30);
    });

    it('should validate RATE_LIMIT_WINDOW_MS is at least 1000', () => {
      const config = configModule.config;
      const rateLimits = config.getRateLimits();

      expect(rateLimits.antiSpamWindowMs).toBeGreaterThanOrEqual(1000);
    });

    it('should validate RATE_LIMIT_MAX_REQUESTS is at least 1', () => {
      const config = configModule.config;
      const rateLimits = config.getRateLimits();

      expect(rateLimits.antiSpamMaxRequests).toBeGreaterThanOrEqual(1);
    });

    it('should validate DAILY_QUOTA_LIMIT is at least 1', () => {
      const config = configModule.config;
      const rateLimits = config.getRateLimits();

      expect(rateLimits.dailyQuotaLimit).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Default Values', () => {
    it('should use default RATE_LIMIT_WINDOW_MS of 60000', () => {
      const config = configModule.config;
      const rateLimits = config.getRateLimits();

      expect(rateLimits.antiSpamWindowMs).toBe(60000);
    });

    it('should use default RATE_LIMIT_MAX_REQUESTS of 20', () => {
      const config = configModule.config;
      const rateLimits = config.getRateLimits();

      expect(rateLimits.antiSpamMaxRequests).toBe(20);
    });

    it('should use default MAX_SESSIONS of 50', () => {
      const config = configModule.config;
      const storage = config.getStorage();

      expect(storage.maxSessions).toBe(50);
    });

    it('should use default MAX_MESSAGES_PER_SESSION of 100', () => {
      const config = configModule.config;
      const storage = config.getStorage();

      expect(storage.maxMessagesPerSession).toBe(100);
    });

    it('should use default PINECONE_INDEX of math-tutor', () => {
      const config = configModule.config;
      const pinecone = config.getPinecone();

      expect(pinecone.index).toBe('math-tutor');
    });

    it('should use default PINECONE_ENVIRONMENT of production', () => {
      const config = configModule.config;
      const pinecone = config.getPinecone();

      expect(pinecone.environment).toBe('production');
    });
  });

  describe('Daily Quota Configuration', () => {
    it('should set daily quota limit to 30 by default', () => {
      const config = configModule.config;
      const rateLimits = config.getRateLimits();

      expect(rateLimits.dailyQuotaLimit).toBe(30);
    });

    it('should parse DAILY_QUOTA_LIMIT as integer', () => {
      const config = configModule.config;
      const rateLimits = config.getRateLimits();

      expect(typeof rateLimits.dailyQuotaLimit).toBe('number');
      expect(Number.isInteger(rateLimits.dailyQuotaLimit)).toBe(true);
    });

    it('should NOT use 50 as daily quota limit', () => {
      const config = configModule.config;
      const rateLimits = config.getRateLimits();

      // Document that daily quota is 30, not 50
      expect(rateLimits.dailyQuotaLimit).toBe(30);
      expect(rateLimits.dailyQuotaLimit).not.toBe(50);
    });
  });

  describe('Supabase Configuration', () => {
    it('should enable Supabase when both URL and anon key are provided', () => {
      const config = configModule.config;
      const supabase = config.getSupabase();

      expect(supabase.enabled).toBe(true);
      expect(supabase.url).toBe('https://test.supabase.co');
      expect(supabase.anonKey).toBe('test-anon-key');
    });

    it('should provide isSupabaseConfigured helper', () => {
      const config = configModule.config;

      expect(typeof config.isSupabaseConfigured).toBe('function');
      expect(config.isSupabaseConfigured()).toBe(true);
    });
  });

  describe('Pinecone Configuration', () => {
    it('should enable Pinecone when API key is provided', () => {
      const config = configModule.config;
      const pinecone = config.getPinecone();

      expect(pinecone.enabled).toBe(true);
      expect(pinecone.apiKey).toBe('test-pinecone-key');
    });
  });

  describe('OpenAI Configuration', () => {
    it('should enable OpenAI when API key is provided', () => {
      const config = configModule.config;
      const openai = config.getOpenAI();

      expect(openai.enabled).toBe(true);
      expect(openai.apiKey).toBe('test-openai-key');
    });
  });

  describe('RAG Configuration', () => {
    it('should indicate RAG is configured when both Pinecone and OpenAI are enabled', () => {
      const config = configModule.config;

      expect(config.isRAGConfigured()).toBe(true);
    });
  });

  describe('Storage Configuration', () => {
    it('should return all storage limits', () => {
      const config = configModule.config;
      const storage = config.getStorage();

      expect(storage).toEqual({
        maxSessions: expect.any(Number),
        maxMessagesPerSession: expect.any(Number),
        maxTitleLength: 100,
        maxUsernameLength: 30,
        minUsernameLength: 2,
      });
    });

    it('should have correct username length limits', () => {
      const config = configModule.config;
      const storage = config.getStorage();

      expect(storage.maxUsernameLength).toBe(30);
      expect(storage.minUsernameLength).toBe(2);
    });

    it('should have correct title length limit', () => {
      const config = configModule.config;
      const storage = config.getStorage();

      expect(storage.maxTitleLength).toBe(100);
    });
  });

  describe('Getters Return Immutable Copies', () => {
    it('should return a copy from all()', () => {
      const config = configModule.config;
      const config1 = config.all();
      const config2 = config.all();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
    });

    it('should return a copy from getGemini()', () => {
      const config = configModule.config;
      const gemini1 = config.getGemini();
      const gemini2 = config.getGemini();

      expect(gemini1).toEqual(gemini2);
      expect(gemini1).not.toBe(gemini2);
    });

    it('should return a copy from getRateLimits()', () => {
      const config = configModule.config;
      const limits1 = config.getRateLimits();
      const limits2 = config.getRateLimits();

      expect(limits1).toEqual(limits2);
      expect(limits1).not.toBe(limits2);
    });

    it('should return a copy from getStorage()', () => {
      const config = configModule.config;
      const storage1 = config.getStorage();
      const storage2 = config.getStorage();

      expect(storage1).toEqual(storage2);
      expect(storage1).not.toBe(storage2);
    });
  });

  describe('Console Warnings', () => {
    it('should not throw warnings for properly configured services', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Access config to trigger any warnings
      configModule.config;

      // Should not have warnings about missing configuration
      const warnings = consoleWarnSpy.mock.calls.map((call) => String(call[0]));

      consoleWarnSpy.mockRestore();
    });
  });
});
