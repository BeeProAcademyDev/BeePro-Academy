import supabase from '../lib/supabase'
import {
  clarifySupabaseConnectionError,
  isAuthEmailDeliveryError,
  mapAuthLoginError,
  mapAuthSignupError
} from '../lib/supabaseErrors'
import { resolveSignupRole } from '../lib/roles'
import { isSupabaseAvailable, syncSignupUserProfile } from './helpers'

export const authService = {
  // Sign up with email and password
  async signUp({ email, password, fullName, phone = '', role = 'instructor' }) {
    let resolvedRole
    try {
      resolvedRole = resolveSignupRole(role)
    } catch (roleError) {
      throw roleError
    }

    if (!isSupabaseAvailable()) {
      throw new Error('Authentication service is not configured. Please contact support.')
    }

    try {
      const emailRedirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/?auth=login`
        : undefined

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: fullName,
            phone,
            role: resolvedRole
          }
        }
      })

      const emailDeliveryFailed = Boolean(error && data?.user && isAuthEmailDeliveryError(error))

      if (error && !emailDeliveryFailed) {
        throw mapAuthSignupError(clarifySupabaseConnectionError(error))
      }

      if (data?.user) {
        await syncSignupUserProfile({
          userId: data.user.id,
          email: data.user.email,
          fullName,
          phone,
          resolvedRole
        })

      } else if (error) {
        throw mapAuthSignupError(clarifySupabaseConnectionError(error))
      }

      return { ...data, resolvedRole, emailDeliveryFailed }
    } catch (e) {
      throw clarifySupabaseConnectionError(e)
    }
  },

  // Sign in with email and password
  async signIn({ email, password }) {
    if (!isSupabaseAvailable()) {
      throw new Error('Authentication service is not configured. Please contact support.')
    }

    try {
      const normalizedEmail = (email || '').toString().trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      })

      if (error) throw mapAuthLoginError(clarifySupabaseConnectionError(error))

      return data
    } catch (e) {
      throw clarifySupabaseConnectionError(e)
    }
  },

  // Sign out
  async signOut() {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw clarifySupabaseConnectionError(error)
      return { success: true }
    } catch (e) {
      throw clarifySupabaseConnectionError(e)
    }
  },

  // Get current user
  async getCurrentUser() {
    if (!isSupabaseAvailable()) {
      return null
    }

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw clarifySupabaseConnectionError(authError)
      if (!user) return null

      // Get user profile from users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw clarifySupabaseConnectionError(profileError)

      const appRole = (profile?.role || 'student').toString().trim().toLowerCase()
      const safeRole = ['authenticated', 'anon', 'service_role'].includes(appRole) ? 'student' : appRole

      return {
        ...(profile || {}),
        ...user,
        email: user.email || profile?.email || '',
        role: safeRole
      }
    } catch (e) {
      throw clarifySupabaseConnectionError(e)
    }
  },

  // Reset password
  async resetPassword(email) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw clarifySupabaseConnectionError(error)
      return { success: true }
    } catch (e) {
      throw clarifySupabaseConnectionError(e)
    }
  },

  // Update password
  async updatePassword(newPassword) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw clarifySupabaseConnectionError(error)
      return { success: true }
    } catch (e) {
      throw clarifySupabaseConnectionError(e)
    }
  },

  // Sign in with Google OAuth
  async signInWithGoogle() {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in deployment environment variables.')
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      })

      if (error) throw clarifySupabaseConnectionError(error)
      return data
    } catch (e) {
      throw clarifySupabaseConnectionError(e)
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    if (!isSupabaseAvailable()) {
      return { unsubscribe: () => {} }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        callback(event, session)
      }
    )

    return subscription
  }
}