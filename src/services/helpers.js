import supabase from '../lib/supabase'
import {
  clarifySupabaseConnectionError,
  mapSignupProfileError
} from '../lib/supabaseErrors'
import { normalizeDbRole } from '../lib/roles'

export const isSupabaseAvailable = () => !!supabase

export const SUPABASE_CONFIG_ERROR =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel (Production + Preview), then redeploy.'

export function assertSupabaseAvailable() {
  if (!isSupabaseAvailable()) {
    throw new Error(SUPABASE_CONFIG_ERROR)
  }
}

export function parseRpcJsonResult(data) {
  if (data == null) {
    return { success: false, error: 'Empty RPC response' }
  }

  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return { success: false, error: data }
    }
  }

  return data
}

export function assertRoleUpdateResult(profile, expectedRole) {
  const expected = normalizeDbRole(expectedRole)
  const actual = normalizeDbRole(profile?.role)

  if (!profile?.id || actual !== expected) {
    throw new Error(
      'Role was not updated in the database. Run supabase/fix-admin-access.sql and ensure migration 017 is applied.'
    )
  }

  return profile
}

export const isMissingTableError = (error) => {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return (
    error?.code === 'PGRST205' ||
    text.includes('could not find the table') ||
    text.includes('schema cache')
  )
}

export const warnMissingMeetingsTable = () => {
  console.warn(
    'meetings table is missing in Supabase. Run supabase/migrations/022_ensure_meetings_table.sql in the SQL Editor.'
  )
}

export function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export async function syncSignupUserProfile({ userId, email, fullName, phone = '', resolvedRole }) {
  const safeRole = resolvedRole === 'admin' ? 'student' : resolvedRole
  const normalizedPhone = (phone || '').toString().trim()

  const { data: profileById, error: fetchByIdError } = await supabase
    .from('users')
    .select('id, role, email')
    .eq('id', userId)
    .maybeSingle()

  if (fetchByIdError) {
    throw mapSignupProfileError(clarifySupabaseConnectionError(fetchByIdError), resolvedRole)
  }

  if (profileById) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ full_name: fullName, phone: normalizedPhone || null })
      .eq('id', userId)

    if (updateError) {
      console.warn('[signup] Could not update profile name:', updateError.message)
    }

    return profileById
  }

  const normalizedEmail = (email || '').trim().toLowerCase()
  let emailToUse = email

  if (normalizedEmail) {
    const { data: profileByEmail, error: fetchByEmailError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle()

    if (fetchByEmailError) {
      throw mapSignupProfileError(clarifySupabaseConnectionError(fetchByEmailError), resolvedRole)
    }

    if (profileByEmail && profileByEmail.id !== userId) {
      emailToUse = `user-${userId}@profile.local`
    }
  }

  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: userId,
      email: emailToUse,
      full_name: fullName,
      phone: normalizedPhone || null,
      role: safeRole
    })

  if (insertError) {
    const { data: retryProfile, error: retryError } = await supabase
      .from('users')
      .select('id, role, email')
      .eq('id', userId)
      .maybeSingle()

    if (!retryError && retryProfile) {
      return retryProfile
    }

    throw mapSignupProfileError(
      clarifySupabaseConnectionError(insertError),
      resolvedRole
    )
  }

  return { id: userId, email: emailToUse, phone: normalizedPhone || null, role: safeRole }
}

export async function getCurrentUserId() {
  if (!isSupabaseAvailable()) return null
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id || null
}

