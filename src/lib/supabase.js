import { createClient } from '@supabase/supabase-js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL
const rawAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseUrl = typeof rawUrl === 'string' ? rawUrl.trim().replace(/\/+$/, '') : ''
const supabaseAnonKey = typeof rawAnonKey === 'string' ? rawAnonKey.trim() : ''

function decodeSupabaseJwtPayload(jwt) {
  try {
    const body = jwt.split('.')[1]
    if (!body) return null
    const b64 = body.replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function warnIfUrlDoesNotMatchAnonHost() {
  if (!supabaseUrl || !supabaseAnonKey) return

  const payload = decodeSupabaseJwtPayload(supabaseAnonKey)
  const ref = typeof payload?.ref === 'string' ? payload.ref : ''

  try {
    const host = new URL(supabaseUrl).hostname.toLowerCase()
    if (ref && host.endsWith('.supabase.co') && host !== `${ref}.supabase.co`) {
      console.warn(
        `[Supabase] URL host "${host}" does not match anon key ref "${ref}". Use Project URL + anon key from the same Dashboard → Settings → API (expected "${ref}.supabase.co").`
      )
    }

    // Hosted keys include `ref`; local demo JWT omits it.
    if (ref && (host === '127.0.0.1' || host === 'localhost' || host === '[::1]')) {
      console.warn(
        '[Supabase] This anon key is for cloud project `' +
          ref +
          '`, but VITE_SUPABASE_URL points at localhost. Use `npx supabase start`, then copy the local URL/key from CLI output—or use your Dashboard Project URL together with this key.'
      )
    }
  } catch {
    console.warn('⚠️ VITE_SUPABASE_URL is not a valid URL.')
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables not set. Using mock mode.')
  console.warn(
    'Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to .env, or run local Supabase: npx supabase start (Docker) and paste the URLs from terminal output.'
  )
} else {
  warnIfUrlDoesNotMatchAnonHost()
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

if (!supabase) {
  console.log('❌ Supabase client not initialized - running in mock mode')
}

export default supabase
