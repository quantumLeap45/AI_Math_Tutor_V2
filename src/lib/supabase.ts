/**
 * Supabase Client
 * AI Math Tutor v2
 *
 * Server-side Supabase client for database operations.
 * Uses anon key with RLS policies for authorization.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '@/config';

const supabaseConfig = config.getSupabase();

if (!supabaseConfig.url || !supabaseConfig.anonKey) {
  console.warn('Supabase credentials not configured. Database features will be disabled.');
}

// Create Supabase client for server-side use
export const supabase = supabaseConfig.url && supabaseConfig.anonKey
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey)
  : null;

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return config.isSupabaseConfigured();
}

/**
 * Database interface for daily quota
 */
export interface DailyQuotaRow {
  id: number;
  ip_address: string;
  request_date: string;
  requests_count: number;
  last_request: string;
  created_at: string;
  updated_at: string;
}
