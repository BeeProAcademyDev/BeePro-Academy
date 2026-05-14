/**
 * Map low-level fetch / network failures to an actionable UI message.
 * @param {unknown} error
 * @returns {Error}
 */
export function clarifySupabaseConnectionError(error) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  const causeMsg =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : ''
  const text = `${message} ${causeMsg}`.toLowerCase()

  const isNetworkFail =
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('network request failed') ||
    text.includes('load failed') ||
    text.includes('err_connection_refused') ||
    (error instanceof TypeError && message.toLowerCase().includes('fetch'))

  if (!isNetworkFail) {
    return error instanceof Error ? error : new Error(String(error))
  }

  const hint = getSupabaseUrlHint()
  return new Error(
    `Cannot reach Supabase.${hint}`
  )
}

function getSupabaseUrlHint() {
  const raw = import.meta.env.VITE_SUPABASE_URL || ''
  let host = ''
  try {
    host = new URL(String(raw).trim()).hostname.toLowerCase()
  } catch {
    return (
      ' Set VITE_SUPABASE_URL (and matching anon key) from Dashboard → Settings → API, restart npm run dev, or run local: npx supabase start.'
    )
  }

  const isLoopback =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '[::1]'

  if (isLoopback) {
    return (
      ' You are pointing at local Supabase. Start it from the project folder: `npx supabase start` (Docker required). For cloud hosting, paste your Project URL and anon key instead, then restart npm run dev.'
    )
  }

  return (
    ' Confirm VITE_SUPABASE_URL and anon key match the same project on the Supabase Dashboard, your network/VPN allows api.supabase.co, and the project is not paused. Restart npm run dev after changing .env.'
  )
}
