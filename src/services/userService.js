import supabase from '../lib/supabase'
import { isSupabaseAvailable, syncSignupUserProfile } from './helpers'

export const userService = {
  // Get user profile
  async getProfile(userId) {
    if (!isSupabaseAvailable()) {
      return null
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    // If no profile found, return null instead of throwing
    if (error && error.code !== 'PGRST116') throw error
    return data
  },

  // Get or create user profile
  async getOrCreateProfile(userId, userData = {}) {
    if (!isSupabaseAvailable()) {
      return null
    }

    // First try to get existing profile
    let { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    // If profile doesn't exist, create it
    if (!profile) {
      try {
        profile = await syncSignupUserProfile({
          userId,
          email: userData.email || '',
          fullName: userData.full_name || userData.email?.split('@')[0] || 'User',
          phone: userData.phone || userData.phone_number || '',
          resolvedRole: 'student'
        })
        if (userData.avatar_url) {
          await supabase
            .from('users')
            .update({ avatar_url: userData.avatar_url })
            .eq('id', userId)
        }
      } catch (createError) {
        console.error('Error creating profile:', createError)
        return {
          id: userId,
          email: userData.email || '',
          full_name: userData.full_name || userData.email?.split('@')[0] || 'User',
          role: 'student',
          avatar_url: userData.avatar_url || null
        }
      }
    }

    // Ensure missing role is stored as student in the database
    if (profile) {
      const role = (profile.role || '').toString().trim()
      if (!role) {
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update({ role: 'student' })
          .eq('id', userId)
          .select('*')
          .maybeSingle()

        if (!updateError && updated) {
          profile = updated
        } else {
          profile = { ...profile, role: 'student' }
        }
      }
    }

    return profile
  },

  // Update user profile
  async updateProfile(userId, profileData) {
    if (!isSupabaseAvailable()) {
      return { id: userId, ...profileData }
    }

    const { role, is_suspended, ...safeProfileData } = profileData || {}

    const { data, error } = await supabase
      .from('users')
      .update(safeProfileData)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Return the database profile only. Role changes are never synchronized from
  // client input; admins must be assigned by database-authorized RPCs.
  async ensureUserRole(userId, email, role) {
    if (!isSupabaseAvailable()) {
      return { id: userId, email, role: role === 'admin' ? 'student' : role }
    }

    if (!userId) {
      throw new Error('Missing required user role synchronization data')
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) throw profileError
    return profile || { id: userId, email, role: 'student' }
  },

  // Upload avatar
  async uploadAvatar(userId, file) {
    if (!isSupabaseAvailable()) {
      return { url: URL.createObjectURL(file) }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `avatar.${fileExt}`
    const filePath = `${userId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('user-avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('user-avatars')
      .getPublicUrl(filePath)

    // Update user profile with avatar URL
    await this.updateProfile(userId, { avatar_url: publicUrl })

    return { url: publicUrl }
  }
}
