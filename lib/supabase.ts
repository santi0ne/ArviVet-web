import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Tipos de conveniencia para las operaciones de la base de datos
export type SupabaseClient = typeof supabase;

// Helper functions para manejo de errores consistente
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};

export const createSupabaseResponse = <T>(
  data: T | null,
  error: any = null
): { data: T | null; error: string | null; success: boolean } => {
  return {
    data,
    error: error ? handleSupabaseError(error) : null,
    success: !error,
  };
};
