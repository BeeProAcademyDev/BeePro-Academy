import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug logging
console.log('Supabase URL:', supabaseUrl ? 'Set ✓' : 'NOT SET ✗')
console.log('Supabase Key:', supabaseAnonKey ? 'Set ✓' : 'NOT SET ✗')

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not set. Using mock mode.')
  console.warn('Create .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null

if (supabase) {
  console.log('✅ Supabase client initialized successfully')
} else {
  console.log('❌ Supabase client not initialized - running in mock mode')
}

export default supabase