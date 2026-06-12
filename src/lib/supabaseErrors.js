/**
 * Extract a human-readable message from Supabase/PostgREST/auth errors.
 * @param {unknown} error
 * @returns {string}
 */
export function formatErrorMessage(error) {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error

  if (error instanceof Error) {
    return error.message || 'Unknown error'
  }

  if (typeof error === 'object') {
    const record = /** @type {Record<string, unknown>} */ (error)
    const candidates = [
      record.message,
      record.error_description,
      record.error,
      record.msg,
      record.details,
      record.hint
    ]

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate
      }
    }
  }

  return 'Unknown error'
}

/**
 * Friendlier messages for common signup/profile failures.
 * @param {unknown} error
 * @param {string} [resolvedRole]
 * @returns {Error}
 */
export function mapSignupProfileError(error, resolvedRole = '') {
  const message = formatErrorMessage(error)
  const lower = message.toLowerCase()

  if (
    resolvedRole === 'pending_instructor'
    && (lower.includes('users_role_check') || lower.includes('check constraint'))
  ) {
    return new Error(
      'Teacher registration requires the latest database migrations. Run: npx supabase db push (migration 016_role_approval_system).'
    )
  }

  if (
    lower.includes('users_email_key')
    || (lower.includes('duplicate key value violates unique constraint') && lower.includes('email'))
  ) {
    return new Error(
      'This email is already registered. Please sign in with your existing account or use a different email.'
    )
  }

  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return new Error(
      'Could not save your profile after signup. Please try again or contact support.'
    )
  }

  return error instanceof Error ? error : new Error(message)
}

/**
 * Supabase may create the auth user but fail to send the confirmation email (no SMTP).
 * @param {unknown} error
 * @returns {boolean}
 */
export function isAuthEmailDeliveryError(error) {
  const lower = formatErrorMessage(error).toLowerCase()
  return (
    lower.includes('error sending confirmation email')
    || lower.includes('confirmation email')
    || lower.includes('error sending email')
    || lower.includes('email rate limit')
  )
}

/**
 * @param {unknown} error
 * @returns {Error}
 */
export function mapAuthLoginError(error) {
  const message = formatErrorMessage(error)
  const lower = message.toLowerCase()

  if (
    lower.includes('invalid login credentials')
    || lower.includes('invalid email or password')
  ) {
    return new Error(
      'Invalid email or password. If you only ran SQL on the users table, create the account in Supabase Dashboard → Authentication → Users → Add user (check Auto confirm). Or use Forgot password to reset.'
    )
  }

  if (lower.includes('email not confirmed')) {
    return new Error(
      'Email not confirmed. In Supabase Dashboard → Authentication → Providers → Email, disable "Confirm email", or confirm the user under Authentication → Users.'
    )
  }

  return error instanceof Error ? error : new Error(message)
}

export function mapAuthSignupError(error) {
  const message = formatErrorMessage(error)
  const lower = message.toLowerCase()

  if (
    lower.includes('already registered')
    || lower.includes('user already exists')
    || lower.includes('email address is already registered')
  ) {
    return new Error(
      'This email is already registered. Please sign in instead.'
    )
  }

  if (isAuthEmailDeliveryError(error)) {
    return new Error(
      'Account could not be created because the confirmation email failed. In Supabase Dashboard → Authentication → Providers → Email, disable "Confirm email" or configure SMTP (Settings → Auth → SMTP).'
    )
  }

  return error instanceof Error ? error : new Error(message)
}

/**
 * Map low-level fetch / network failures to an actionable UI message.
 * @param {unknown} error
 * @returns {Error}
 */
export function clarifySupabaseConnectionError(error) {
  const message = formatErrorMessage(error)
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
    if (error instanceof Error && error.message) {
      return error
    }
    return new Error(message)
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
