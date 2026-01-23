/**
 * Supabase Client
 * AI Math Tutor v2
 *
 * Server-side Supabase client for database operations.
 * Uses service role key for server operations.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Database features will be disabled.');
}

// Create Supabase client for server-side use
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
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
