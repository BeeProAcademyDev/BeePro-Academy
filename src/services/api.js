import supabase from '../lib/supabase'
import { isExternalGoogleMeet, getJitsiExternalUrl, normalizeMeetingRecord, resolveJitsiRoomName } from '../lib/jitsi'

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function mergeMeetingRows(primary = [], secondary = []) {
  const byId = new Map()

  ;[...primary, ...secondary].forEach((row) => {
    if (!row) return
    const key = row.id || `${row.title}-${row.scheduled_at}`
    const existing = byId.get(key)
    if (!existing) {
      byId.set(key, row)
      return
    }

    byId.set(key, {
      ...existing,
      ...row,
      jitsi_room_name: hasText(row.jitsi_room_name)
        ? row.jitsi_room_name
        : existing.jitsi_room_name,
      platform: row.platform || existing.platform,
      meet_link: row.meet_link ?? existing.meet_link
    })
  })

  return Array.from(byId.values())
}
import {
  clarifySupabaseConnectionError,
  isAuthEmailDeliveryError,
  mapAuthLoginError,
  mapAuthSignupError,
  mapSignupProfileError
} from '../lib/supabaseErrors'
import { resolveSignupRole, isAdminEmail, normalizeDbRole, normalizeRole } from '../lib/roles'
import { courses as mockCourses, categories as mockCategories } from '../data/courses'

// Check if Supabase is available
const isSupabaseAvailable = () => !!supabase

const SUPABASE_CONFIG_ERROR =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel (Production + Preview), then redeploy.'

function assertSupabaseAvailable() {
  if (!isSupabaseAvailable()) {
    throw new Error(SUPABASE_CONFIG_ERROR)
  }
}

function parseRpcJsonResult(data) {
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

function assertRoleUpdateResult(profile, expectedRole) {
  const expected = normalizeDbRole(expectedRole)
  const actual = normalizeDbRole(profile?.role)

  if (!profile?.id || actual !== expected) {
    throw new Error(
      'Role was not updated in the database. Run supabase/fix-admin-access.sql and ensure migration 017 is applied.'
    )
  }

  return profile
}

const isMissingTableError = (error) => {
  const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
  return (
    error?.code === 'PGRST205' ||
    text.includes('could not find the table') ||
    text.includes('schema cache')
  )
}

const warnMissingMeetingsTable = () => {
  console.warn(
    'meetings table is missing in Supabase. Run supabase/migrations/022_ensure_meetings_table.sql in the SQL Editor.'
  )
}

async function syncSignupUserProfile({ userId, email, fullName, resolvedRole }) {
  const safeRole = resolvedRole === 'admin' ? 'student' : resolvedRole

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
      .update({ full_name: fullName })
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

  return { id: userId, email: emailToUse, role: safeRole }
}

// ============ AUTH SERVICES ============
export const authService = {
  // Sign up with email and password
  async signUp({ email, password, fullName, role = 'student' }) {
    let resolvedRole
    try {
      resolvedRole = resolveSignupRole(role, email)
    } catch (roleError) {
      if (roleError.message === 'ADMIN_EMAIL_NOT_ALLOWED') {
        throw new Error('Only configured admin emails can register as admin. Add your email to VITE_ADMIN_EMAILS.')
      }
      throw roleError
    }

    if (!isSupabaseAvailable()) {
      return {
        user: { id: 'mock-user-id', email, full_name: fullName, role: resolvedRole },
        session: { access_token: 'mock-token' }
      }
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
          resolvedRole
        })

        if (resolvedRole === 'admin') {
          const { data: syncData, error: syncError } = await supabase.rpc('sync_admin_role_if_allowed')
          if (syncError) throw clarifySupabaseConnectionError(syncError)
          if (syncData?.success === false) {
            throw new Error(syncData.error || 'Admin email is not on server allowlist.')
          }
        }
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
      // Mock signin
      return {
        user: { id: 'mock-user-id', email, full_name: 'Demo User', role: 'student' },
        session: { access_token: 'mock-token' }
      }
    }

    try {
      const normalizedEmail = (email || '').toString().trim().toLowerCase()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      })

      if (error) throw mapAuthLoginError(clarifySupabaseConnectionError(error))

      if (data?.user && isAdminEmail(normalizedEmail)) {
        try {
          await supabase.rpc('sync_admin_role_if_allowed')
        } catch (syncError) {
          console.warn('[signIn] Admin role sync failed:', syncError?.message || syncError)
        }
      }

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

      const appRole = (profile?.role || user.user_metadata?.role || 'student').toString().trim().toLowerCase()
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

// ============ COURSES SERVICES ============
export const courseService = {
  // Get all courses with optional filters
  async getCourses({ category, level, search, limit = 20, offset = 0 } = {}) {
    if (!isSupabaseAvailable()) {
      // Return mock data
      let filtered = [...mockCourses]
      
      if (category) {
        filtered = filtered.filter(c => c.category === category)
      }
      if (level) {
        filtered = filtered.filter(c => c.level === level)
      }
      if (search) {
        const searchLower = search.toLowerCase()
        filtered = filtered.filter(c => 
          c.title.toLowerCase().includes(searchLower) ||
          c.description.toLowerCase().includes(searchLower)
        )
      }
      
      return {
        data: filtered.slice(offset, offset + limit),
        count: filtered.length
      }
    }

    let query = supabase
      .from('courses')
      .select(`
        *,
        instructor:users!instructor_id(id, full_name, avatar_url),
        lessons(count),
        reviews(rating)
      `, { count: 'exact' })

    if (category) {
      query = query.eq('category', category)
    }
    if (level) {
      query = query.eq('level', level)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Calculate average rating and enrollment count
    const coursesWithStats = data.map(course => ({
      ...course,
      lessonsCount: course.lessons?.[0]?.count || 0,
      rating: course.reviews?.length > 0
        ? course.reviews.reduce((sum, r) => sum + r.rating, 0) / course.reviews.length
        : 0,
      reviewsCount: course.reviews?.length || 0
    }))

    return { data: coursesWithStats, count }
  },

  // Get single course by ID
  async getCourseById(id) {
    if (!isSupabaseAvailable()) {
      const course = mockCourses.find(c => c.id === id)
      return course || null
    }

    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:users!instructor_id(id, full_name, avatar_url, role),
        lessons(id, title, duration, order_index),
        reviews(
          id, rating, comment, created_at,
          user:users(id, full_name, avatar_url)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // Sort lessons by order_index
    if (data.lessons) {
      data.lessons.sort((a, b) => a.order_index - b.order_index)
    }

    // Calculate average rating
    data.rating = data.reviews?.length > 0
      ? data.reviews.reduce((sum, r) => sum + r.rating, 0) / data.reviews.length
      : 0
    data.reviewsCount = data.reviews?.length || 0

    return data
  },

  // Create a new course (instructor/admin only)
  async createCourse(courseData) {
    if (!isSupabaseAvailable()) {
      return { id: 'mock-course-id', ...courseData }
    }

    const { data, error } = await supabase
      .from('courses')
      .insert(courseData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update a course
  async updateCourse(id, courseData) {
    if (!isSupabaseAvailable()) {
      return { id, ...courseData }
    }

    const { data, error } = await supabase
      .from('courses')
      .update(courseData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete a course
  async deleteCourse(id) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  },

  // Get featured/popular courses
  async getFeaturedCourses(limit = 6) {
    if (!isSupabaseAvailable()) {
      return mockCourses.slice(0, limit)
    }

    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:users!instructor_id(id, full_name, avatar_url),
        enrollments(count),
        reviews(rating)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  },

  // Get courses by category
  async getCoursesByCategory(category) {
    return this.getCourses({ category })
  },

  // Get courses by instructor (for teacher dashboard)
  async getInstructorCourses(instructorId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        lessons(count)
      `)
      .eq('instructor_id', instructorId)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    return data?.map(course => ({
      ...course,
      lessonsCount: course.lessons?.[0]?.count || 0
    })) || []
  }
}

// ============ LESSON SERVICES ============
export const lessonService = {
  // Get lessons for a course
  async getLessonsByCourse(courseId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true })

    if (error) throw error
    return data
  },

  // Get single lesson
  async getLessonById(id) {
    if (!isSupabaseAvailable()) {
      return null
    }

    const { data, error } = await supabase
      .from('lessons')
      .select('*, course:courses(id, title, instructor_id)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create a lesson
  async createLesson(lessonData) {
    if (!isSupabaseAvailable()) {
      return { id: 'mock-lesson-id', ...lessonData }
    }

    // Remove fields that don't exist in the database
    const { files, ...dbLessonData } = lessonData

    const { data, error } = await supabase
      .from('lessons')
      .insert(dbLessonData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update a lesson
  async updateLesson(id, lessonData) {
    if (!isSupabaseAvailable()) {
      return { id, ...lessonData }
    }

    const { data, error } = await supabase
      .from('lessons')
      .update(lessonData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete a lesson
  async deleteLesson(id) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  }
}

// ============ ENROLLMENT SERVICES ============
export const enrollmentService = {
  // Enroll in a course (free courses or after payment approval — enforced server-side)
  async enrollInCourse(courseId) {
    if (!isSupabaseAvailable()) {
      return { id: 'mock-enrollment-id', course_id: courseId, progress: 0 }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase.rpc('enroll_student_if_eligible', {
      p_course_id: courseId
    })

    if (error) throw error
    if (data?.success === false) {
      throw new Error(data.error || 'Enrollment is not allowed for this course')
    }

    return {
      id: data.enrollment_id,
      course_id: courseId,
      user_id: user.id,
      progress: 0
    }
  },

  // Get user enrollments
  async getUserEnrollments() {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('enrollments')
      .select(`
        *,
        course:courses(
          id, title, thumbnail_url, category,
          instructor:users!instructor_id(full_name),
          lessons(count)
        )
      `)
      .eq('user_id', user.id)
      .order('enrolled_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Check if user is enrolled in a course
  async isEnrolled(courseId) {
    if (!isSupabaseAvailable()) {
      return false
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return !!data
  },

  // Update progress
  async updateProgress(enrollmentId, progress) {
    if (!isSupabaseAvailable()) {
      return { id: enrollmentId, progress }
    }

    const { data, error } = await supabase
      .from('enrollments')
      .update({ progress })
      .eq('id', enrollmentId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ============ REVIEW SERVICES ============
export const reviewService = {
  // Get reviews for a course
  async getReviewsByCourse(courseId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        user:users(id, full_name, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Create a review
  async createReview({ courseId, rating, comment }) {
    if (!isSupabaseAvailable()) {
      return { id: 'mock-review-id', course_id: courseId, rating, comment }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        course_id: courseId,
        user_id: user.id,
        rating,
        comment
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update a review
  async updateReview(id, { rating, comment }) {
    if (!isSupabaseAvailable()) {
      return { id, rating, comment }
    }

    const { data, error } = await supabase
      .from('reviews')
      .update({ rating, comment })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete a review
  async deleteReview(id) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  }
}

// ============ USER SERVICES ============
export const userService = {
  // Get user profile
  async getProfile(userId) {
    if (!isSupabaseAvailable()) {
      return {
        id: userId,
        full_name: 'Demo User',
        email: 'demo@example.com',
        role: 'student'
      }
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
      return {
        id: userId,
        full_name: userData.full_name || 'Demo User',
        email: userData.email || 'demo@example.com',
        role: 'student'
      }
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

      const authEmail = (userData.email || profile.email || '').toString().trim().toLowerCase()
      if (isAdminEmail(authEmail) && profile.role !== 'admin') {
        try {
          const synced = await userService.ensureUserRole(userId, authEmail, 'admin')
          if (synced?.role === 'admin') {
            profile = { ...profile, ...synced, email: userData.email || synced.email || profile.email }
          }
        } catch (syncError) {
          console.warn('[getOrCreateProfile] Admin role sync failed:', syncError?.message || syncError)
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

    const { role, ...safeProfileData } = profileData || {}

    const { data, error } = await supabase
      .from('users')
      .update(safeProfileData)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Promote caller to admin only if email is on server allowlist
  async ensureUserRole(userId, email, role) {
    if (!isSupabaseAvailable()) {
      return { id: userId, email, role }
    }

    if (!userId) {
      throw new Error('Missing required user role synchronization data')
    }

    if (role !== 'admin') {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      return profile || { id: userId, email, role }
    }

    const { data: syncData, error: syncError } = await supabase.rpc('sync_admin_role_if_allowed')
    if (syncError) throw syncError

    if (syncData?.success === false) {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      return profile || { id: userId, email, role: 'student' }
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError) throw profileError
    return profile
  },

  // Upload avatar
  async uploadAvatar(userId, file) {
    if (!isSupabaseAvailable()) {
      return { url: URL.createObjectURL(file) }
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Update user profile with avatar URL
    await this.updateProfile(userId, { avatar_url: publicUrl })

    return { url: publicUrl }
  }
}

// ============ CATEGORY SERVICES ============
export const categoryService = {
  // Get all categories
  async getCategories() {
    // Categories are static based on the schema
    return mockCategories
  }
}

// ============ ADMIN SERVICES ============
export const adminService = {
  // Get dashboard stats
  async getDashboardStats() {
    if (!isSupabaseAvailable()) {
      return {
        totalUsers: 150,
        totalCourses: 70,
        totalEnrollments: 450,
        totalRevenue: 12500
      }
    }

    const [
      { count: usersCount },
      { count: coursesCount },
      { count: enrollmentsCount }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('enrollments').select('*', { count: 'exact', head: true })
    ])

    return {
      totalUsers: usersCount || 0,
      totalCourses: coursesCount || 0,
      totalEnrollments: enrollmentsCount || 0,
      totalRevenue: 0 // Would need payments table
    }
  },

  // Get all users (admin only)
  async getAllUsers({ limit = 50, offset = 0 } = {}) {
    if (!isSupabaseAvailable()) {
      return { data: [], count: 0 }
    }

    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, count }
  },

  async getAllUsersAdmin() {
    assertSupabaseAvailable()

    const { data, error } = await supabase.rpc('admin_get_all_users')
    if (error) throw error
    return data || []
  },

  // Update user role (admin only — direct table update fallback)
  async updateUserRole(userId, role) {
    assertSupabaseAvailable()

    const normalizedRole = normalizeDbRole(role)
    const { data, error } = await supabase
      .from('users')
      .update({ role: normalizedRole })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return assertRoleUpdateResult(data, normalizedRole)
  },

  async updateUserRoleAdmin(targetUserId, newRole) {
    assertSupabaseAvailable()

    const normalizedRole = normalizeDbRole(newRole)
    const { data, error } = await supabase.rpc('admin_update_user_role', {
      target_user_id: targetUserId,
      new_role: normalizedRole
    })

    if (error) throw error

    const result = parseRpcJsonResult(data)
    if (result?.success === false) {
      throw new Error(result.error || 'Role update failed')
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role, email, full_name')
      .eq('id', targetUserId)
      .single()

    if (profileError) throw profileError
    assertRoleUpdateResult(profile, normalizedRole)

    return result
  },

  async getUserDetailsAdmin(targetUserId) {
    assertSupabaseAvailable()

    const { data, error } = await supabase.rpc('admin_get_user_details', {
      target_user_id: targetUserId
    })

    if (error) throw error
    return data
  },

  async getUserDetailsFallback(targetUserId, selectedFromList = null) {
    assertSupabaseAvailable()

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUserId)
      .maybeSingle()

    let courses = []
    let enrollments = []

    if ((profile?.role || '').toLowerCase() === 'instructor') {
      const { data: instructorCourses } = await supabase
        .from('courses')
        .select('id, title, status')
        .eq('instructor_id', targetUserId)
        .order('created_at', { ascending: false })

      courses = (instructorCourses || []).map((course) => ({
        ...course,
        enrollments: 0
      }))
    }

    if ((profile?.role || '').toLowerCase() === 'student') {
      const { data: studentEnrollments } = await supabase
        .from('enrollments')
        .select('id, progress, course:courses(title, instructor:users!instructor_id(full_name))')
        .eq('user_id', targetUserId)
        .order('enrolled_at', { ascending: false })

      enrollments = (studentEnrollments || []).map((enrollment) => ({
        id: enrollment.id,
        progress: enrollment.progress || 0,
        course_title: enrollment.course?.title || 'N/A',
        instructor_name: enrollment.course?.instructor?.full_name || 'N/A'
      }))
    }

    const fallbackUser = profile || selectedFromList
    if (!fallbackUser) {
      throw new Error('User details are not available')
    }

    return {
      success: true,
      user: fallbackUser,
      courses,
      enrollments
    }
  },

  async approveInstructor(targetUserId) {
    assertSupabaseAvailable()

    const { data, error } = await supabase.rpc('admin_approve_instructor', {
      target_user_id: targetUserId
    })

    if (error) throw error

    const result = parseRpcJsonResult(data)
    if (result?.success === false) {
      throw new Error(result.error || 'Failed to approve instructor')
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .single()

    if (profileError) throw profileError
    assertRoleUpdateResult(profile, 'instructor')

    return result
  },

  async rejectInstructor(targetUserId) {
    assertSupabaseAvailable()

    const { data, error } = await supabase.rpc('admin_reject_instructor', {
      target_user_id: targetUserId
    })

    if (error) throw error

    const result = parseRpcJsonResult(data)
    if (result?.success === false) {
      throw new Error(result.error || 'Failed to reject instructor')
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .single()

    if (profileError) throw profileError
    assertRoleUpdateResult(profile, 'student')

    return result
  }
}

// ============ CHAT SERVICES ============
const getCourseChatChannelName = (courseId) => `course-chat-ws-${courseId}`

/** PostgREST may return composite RPC rows as an object or a one-element array */
const normalizeRpcRow = (data) => {
  if (Array.isArray(data)) return data[0] || null
  if (data && typeof data === 'object') return data
  return null
}

// #region agent log
const __dbgChat = (location, message, data, hypothesisId) => {
  fetch('http://127.0.0.1:7427/ingest/558f5932-6500-4722-9bbf-9e5e1306baf3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '45e2a3' },
    body: JSON.stringify({ sessionId: '45e2a3', location, message, data, hypothesisId, timestamp: Date.now(), runId: 'pre-fix' })
  }).catch(() => {})
}
// #endregion

export const chatService = {
  getCourseChatChannelName,

  subscribeToCourseChat(courseId, handlers = {}) {
    if (!isSupabaseAvailable() || !courseId) {
      return null
    }

    const { onMessage, onConversationUpdate, onStatus } = handlers
    const channel = supabase.channel(getCourseChatChannelName(courseId), {
      config: { broadcast: { self: true } }
    })

    if (onMessage) {
      channel.on('broadcast', { event: 'message' }, ({ payload }) => {
        onMessage(payload)
      })
    }

    if (onConversationUpdate) {
      channel.on('broadcast', { event: 'conversation' }, ({ payload }) => {
        onConversationUpdate(payload)
      })
    }

    channel.subscribe((status) => {
      onStatus?.(status)
    })

    return channel
  },

  async broadcastChatMessage(courseId, message) {
    if (!isSupabaseAvailable() || !courseId || !message) {
      return
    }

    const channel = supabase.channel(getCourseChatChannelName(courseId), {
      config: { broadcast: { self: true } }
    })

    await new Promise((resolve) => {
      const timeoutId = window.setTimeout(() => {
        supabase.removeChannel(channel)
        resolve()
      }, 3000)

      channel.subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return

        window.clearTimeout(timeoutId)
        await channel.send({
          type: 'broadcast',
          event: 'message',
          payload: message
        })
        supabase.removeChannel(channel)
        resolve()
      })
    })
  },

  async getOrCreateConversation({ courseId, studentId, instructorId }) {
    if (!isSupabaseAvailable()) {
      return {
        id: 'mock-conversation-id',
        course_id: courseId,
        student_id: studentId,
        instructor_id: instructorId
      }
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const authUserId = sessionData?.session?.user?.id
    const isSelfStudent = authUserId && studentId === authUserId

    // #region agent log
    __dbgChat('api.js:getOrCreateConversation:entry', 'resolve conversation', {
      courseId,
      studentIdTail: studentId?.slice(-8),
      authUserIdTail: authUserId?.slice(-8),
      isSelfStudent
    }, 'A')
    // #endregion

    if (isSelfStudent) {
      const { data: myConvRaw, error: myConvError } = await supabase.rpc('get_my_course_conversation', {
        p_course_id: courseId
      })
      const myConv = normalizeRpcRow(myConvRaw)

      // #region agent log
      __dbgChat('api.js:getOrCreateConversation:myConvRpc', 'get_my_course_conversation result', {
        courseId,
        convId: myConv?.id || null,
        rpcError: myConvError?.message || null,
        rpcCode: myConvError?.code || null
      }, 'A')
      // #endregion

      if (!myConvError && myConv?.id) {
        try {
          const hydrated = await this._hydrateConversation(myConv.id)
          // #region agent log
          __dbgChat('api.js:getOrCreateConversation:return', 'via myConvRpc', { courseId, convId: hydrated?.id }, 'A')
          // #endregion
          return hydrated
        } catch {
          // #region agent log
          __dbgChat('api.js:getOrCreateConversation:return', 'via myConvRpc unhydrated', { courseId, convId: myConv?.id }, 'A')
          // #endregion
          return myConv
        }
      }

      const myConvMissing =
        myConvError?.code === 'PGRST202' ||
        `${myConvError?.message || ''}`.toLowerCase().includes('could not find the function')

      if (!myConvMissing && myConvError) {
        console.warn('get_my_course_conversation failed:', myConvError.message)
      }
    }

    const { data: rpcRaw, error: rpcError } = await supabase.rpc('get_or_create_course_conversation', {
      p_course_id: courseId,
      p_student_id: studentId
    })
    const rpcData = normalizeRpcRow(rpcRaw)

    if (!rpcError && rpcData?.id) {
      try {
        const hydrated = await this._hydrateConversation(rpcData.id)
        // #region agent log
        __dbgChat('api.js:getOrCreateConversation:return', 'via getOrCreateRpc', { courseId, convId: hydrated?.id }, 'A')
        // #endregion
        return hydrated
      } catch {
        // #region agent log
        __dbgChat('api.js:getOrCreateConversation:return', 'via getOrCreateRpc unhydrated', { courseId, convId: rpcData?.id }, 'A')
        // #endregion
        return rpcData
      }
    }

    const rpcMissing =
      rpcError?.code === 'PGRST202' ||
      `${rpcError?.message || ''}`.toLowerCase().includes('could not find the function')

    if (!rpcMissing && rpcError) {
      throw rpcError
    }

    const { data: existing, error: fetchError } = await supabase
      .from('course_conversations')
      .select(`
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (existing) {
      // #region agent log
      __dbgChat('api.js:getOrCreateConversation:return', 'via directSelect', { courseId, convId: existing?.id }, 'A')
      // #endregion
      return existing
    }

    const { data, error } = await supabase
      .from('course_conversations')
      .insert({
        course_id: courseId,
        student_id: studentId,
        instructor_id: instructorId
      })
      .select(`
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `)
      .single()

    if (error) throw error
    // #region agent log
    __dbgChat('api.js:getOrCreateConversation:return', 'via insert', { courseId, convId: data?.id }, 'A')
    // #endregion
    return data
  },

  async _hydrateConversation(conversationId) {
    const { data, error } = await supabase
      .from('course_conversations')
      .select(`
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `)
      .eq('id', conversationId)
      .single()

    if (error) throw error
    return data
  },

  async getInstructorChatRoster(courseId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase.rpc('get_instructor_course_chat_roster', {
      p_course_id: courseId
    })

    if (!error && data?.success !== false) {
      return data?.students || []
    }

    const rpcMissing =
      error?.code === 'PGRST202' ||
      `${error?.message || ''}`.toLowerCase().includes('could not find the function')

    if (!rpcMissing && data?.success === false) {
      throw new Error(data.error || 'Failed to load chat roster')
    }

    if (!rpcMissing && error) {
      throw error
    }

    const { data: registeredStudents, error: studentsError } = await supabase
      .from('users')
      .select('id, full_name, email, avatar_url, role')
      .order('full_name', { ascending: true })
      .limit(500)

    if (studentsError) throw studentsError

    const studentRows = (registeredStudents || []).filter((row) => {
      const role = (row.role || 'student').toString().trim().toLowerCase()
      return !['teacher', 'instructor', 'admin', 'pending_instructor'].includes(role)
    })

    const conversations = await this.getInstructorConversations(courseId)
    const conversationByStudent = new Map(
      (conversations || []).map((conv) => [conv.student_id, conv])
    )

    return studentRows.map((row) => {
      const conv = conversationByStudent.get(row.id)
      return {
        user_id: row.id,
        full_name: row.full_name,
        email: row.email,
        avatar_url: row.avatar_url,
        conversation_id: conv?.id || null,
        last_message_at: conv?.last_message_at || null,
        unread_count: 0
      }
    })
  },

  async getStudentChatInbox() {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_student_chat_inbox')

    if (!rpcError && Array.isArray(rpcData)) {
      // #region agent log
      __dbgChat('api.js:getStudentChatInbox', 'inbox loaded', {
        count: rpcData.length,
        withMessages: rpcData.filter((r) => (r.message_count || 0) > 0).length
      }, 'D')
      // #endregion
      return rpcData
    }

    const rpcMissing =
      rpcError?.code === 'PGRST202' ||
      `${rpcError?.message || ''}`.toLowerCase().includes('could not find the function')

    if (!rpcMissing && rpcError) {
      console.warn('get_student_chat_inbox RPC failed:', rpcError.message)
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData?.session?.user?.id
    if (!userId) return []

    const { data: conversations, error } = await supabase
      .from('course_conversations')
      .select(`
        id,
        course_id,
        last_message_at,
        course:courses(id, title, thumbnail_url)
      `)
      .eq('student_id', userId)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    const enriched = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { count } = await supabase
          .from('course_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)

        return {
          conversation_id: conv.id,
          course_id: conv.course_id,
          title: conv.course?.title || conv.course_id,
          thumbnail_url: conv.course?.thumbnail_url || null,
          last_message_at: conv.last_message_at,
          message_count: count || 0,
          unread_count: 0
        }
      })
    )

    return enriched.sort((a, b) => {
      if ((b.message_count || 0) !== (a.message_count || 0)) {
        return (b.message_count || 0) - (a.message_count || 0)
      }
      return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
    })
  },

  async getInstructorConversations(courseId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('course_conversations')
      .select(`
        *,
        student:users!student_id(id, full_name, email, avatar_url),
        instructor:users!instructor_id(id, full_name, email, avatar_url)
      `)
      .eq('course_id', courseId)
      .order('last_message_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getMessages(conversationId, { limit = 100 } = {}) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_course_chat_messages', {
      p_conversation_id: conversationId,
      p_limit: limit
    })

    let rpcCount = 0
    if (!rpcError && rpcData != null) {
      const rows = Array.isArray(rpcData) ? rpcData : [rpcData].filter(Boolean)
      rpcCount = rows.length
      if (rows.length > 0) {
        const hydrated = await this._hydrateMessages(rows)
        // #region agent log
        __dbgChat('api.js:getMessages:return', 'via rpc', {
          conversationIdTail: conversationId?.slice(-8),
          rpcCount,
          hydratedCount: hydrated?.length || 0
        }, 'B')
        // #endregion
        return hydrated
      }
    }

    const rpcMissing =
      rpcError?.code === 'PGRST202' ||
      `${rpcError?.message || ''}`.toLowerCase().includes('could not find the function')

    if (!rpcMissing && rpcError) {
      console.warn('get_course_chat_messages RPC failed:', rpcError.message)
    }

    const { data, error } = await supabase
      .from('course_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)

    if (error) throw error
    const hydrated = await this._hydrateMessages(data || [])
    // #region agent log
    __dbgChat('api.js:getMessages:return', 'via fallback select', {
      conversationIdTail: conversationId?.slice(-8),
      rpcCount,
      rpcError: rpcError?.message || null,
      fallbackCount: data?.length || 0,
      hydratedCount: hydrated?.length || 0
    }, 'B')
    // #endregion
    return hydrated
  },

  async _hydrateMessages(messages) {
    if (!messages?.length) return []

    const senderIds = [...new Set(messages.map((row) => row.sender_id).filter(Boolean))]
    if (senderIds.length === 0) return messages

    const { data: senders, error: sendersError } = await supabase
      .from('users')
      .select('id, full_name, avatar_url')
      .in('id', senderIds)

    if (sendersError) {
      return messages
    }

    const senderMap = new Map((senders || []).map((sender) => [sender.id, sender]))

    return messages.map((message) => ({
      ...message,
      sender: senderMap.get(message.sender_id) || null
    }))
  },

  async sendMessage({ conversationId, senderId, content, courseId = null }) {
    if (!isSupabaseAvailable()) {
      return {
        id: `mock-msg-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        created_at: new Date().toISOString()
      }
    }

    const trimmed = content.trim()
    const { data: rpcRaw, error: rpcError } = await supabase.rpc('send_course_chat_message', {
      p_conversation_id: conversationId,
      p_content: trimmed
    })
    const rpcData = normalizeRpcRow(rpcRaw)

    let message = null

    if (!rpcError && rpcData?.id) {
      const hydrated = await this._hydrateMessages([rpcData])
      message = hydrated[0]
    } else {
      const { data, error } = await supabase
        .from('course_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: trimmed
        })
        .select(`
          *,
          sender:users!sender_id(id, full_name, avatar_url)
        `)
        .single()

      if (error) throw error
      message = data
    }

    if (courseId && message) {
      await this.broadcastChatMessage(courseId, message)
    }

    return message
  },

  async markMessagesAsRead(conversationId, userId) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase
      .from('course_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return { success: true }
  }
}

// ============ MEETING SERVICES ============
async function ensureMeetingJoinFields(meeting, preferredRoomName = null) {
  const normalized = normalizeMeetingRecord(meeting)
  if (!normalized?.id || isExternalGoogleMeet(normalized)) {
    return normalized
  }

  const roomName = hasText(preferredRoomName)
    ? preferredRoomName.trim()
    : resolveJitsiRoomName(normalized)
  if (!roomName) return normalized

  if (
    normalized.platform === 'jitsi'
    && hasText(normalized.jitsi_room_name)
    && (!preferredRoomName || normalized.jitsi_room_name.trim() === preferredRoomName.trim())
  ) {
    return normalized
  }

  if (!isSupabaseAvailable()) {
    return { ...normalized, platform: 'jitsi', jitsi_room_name: roomName }
  }

  const { data, error } = await supabase
    .from('meetings')
    .update({
      platform: 'jitsi',
      jitsi_room_name: roomName
    })
    .eq('id', normalized.id)
    .select()
    .single()

  if (error || !data) {
    return { ...normalized, platform: 'jitsi', jitsi_room_name: roomName }
  }

  return normalizeMeetingRecord(data)
}

export const meetingService = {
  // Create a meeting
  async createMeeting(meetingData) {
    if (!isSupabaseAvailable()) {
      return { id: 'mock-meeting-id', ...meetingData }
    }

    const { data, error } = await supabase
      .from('meetings')
      .insert(meetingData)
      .select()
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        warnMissingMeetingsTable()
        throw new Error('Live sessions table is not set up yet. Ask the admin to run migration 022 in Supabase.')
      }
      throw error
    }

    if (
      meetingData.platform === 'jitsi'
      && meetingData.jitsi_room_name
      && (!data.jitsi_room_name || data.platform !== 'jitsi')
    ) {
      const { data: patched, error: patchError } = await supabase
        .from('meetings')
        .update({
          platform: 'jitsi',
          jitsi_room_name: meetingData.jitsi_room_name
        })
        .eq('id', data.id)
        .select()
        .single()

      if (!patchError && patched) {
        return ensureMeetingJoinFields(patched, meetingData.jitsi_room_name)
      }
    }

    return ensureMeetingJoinFields(data, meetingData.jitsi_room_name)
  },

  ensureMeetingJoinFields,

  // Get meetings for a course
  async getMeetingsByCourse(courseId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const normalizeAll = (rows) => (rows || []).map(normalizeMeetingRecord)

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_course_meetings_for_student',
      { p_course_id: courseId }
    )

    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('course_id', courseId)
      .order('scheduled_at', { ascending: true })

    if (error) {
      if (isMissingTableError(error)) {
        warnMissingMeetingsTable()
        return []
      }
      if (!rpcData?.length) {
        throw error
      }
    }

    const merged = mergeMeetingRows(
      Array.isArray(rpcData) ? rpcData : [],
      Array.isArray(data) ? data : []
    )

    if (merged.length > 0) {
      return normalizeAll(merged)
    }

    if (rpcError && !rpcError.message?.includes('Could not find the function')) {
      console.warn('get_course_meetings_for_student RPC failed:', rpcError.message)
    }

    return normalizeAll(data)
  },

  // Get upcoming meetings for a user
  async getUpcomingMeetings(userId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        course:courses(id, title, thumbnail_url)
      `)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10)

    if (error) {
      if (isMissingTableError(error)) {
        warnMissingMeetingsTable()
        return []
      }
      throw error
    }
    return data
  },

  // Update a meeting
  async updateMeeting(id, meetingData) {
    if (!isSupabaseAvailable()) {
      return { id, ...meetingData }
    }

    const { data, error } = await supabase
      .from('meetings')
      .update(meetingData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        warnMissingMeetingsTable()
        throw new Error('Live sessions table is not set up yet. Ask the admin to run migration 022 in Supabase.')
      }
      throw error
    }
    return data
  },

  // Delete a meeting
  async deleteMeeting(id) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)

    if (error) {
      if (isMissingTableError(error)) {
        warnMissingMeetingsTable()
        throw new Error('Live sessions table is not set up yet. Ask the admin to run migration 022 in Supabase.')
      }
      throw error
    }
    return { success: true }
  }
}

// ============ NOTIFICATION SERVICES ============
export const notificationService = {
  // Send notification to enrolled students
  async notifyStudents({ course_id, title, message, type = 'general' }) {
    if (!isSupabaseAvailable()) {
      console.log('Mock notification:', { course_id, title, message, type })
      return { success: true }
    }

    // Get enrolled students
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', course_id)

    if (enrollError) throw enrollError

    // Create notifications for each student
    const notifications = enrollments.map(e => ({
      user_id: e.user_id,
      course_id,
      title,
      message,
      type,
      is_read: false
    }))

    if (notifications.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .insert(notifications)

      if (error) throw error
    }

    return { success: true, count: notifications.length }
  },

  // Notify students who can access the course (paid = approved payment, free = enrolled)
  async notifyEligibleStudents({
    course_id,
    title,
    message,
    type = 'meeting',
    action_url = null
  }) {
    if (!isSupabaseAvailable()) {
      console.log('Mock eligible notification:', { course_id, title, message, type })
      return { success: true, count: 0 }
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('notify_course_students', {
      p_course_id: course_id,
      p_title: title,
      p_message: message,
      p_type: type,
      p_action_url: action_url
    })

    const rpcMissing =
      rpcError?.code === 'PGRST202' ||
      `${rpcError?.message || ''}`.toLowerCase().includes('could not find the function')

    if (!rpcMissing && rpcData?.success === false) {
      throw new Error(rpcData.error || 'Failed to notify students')
    }

    if (!rpcMissing && rpcError) {
      throw rpcError
    }

    const rpcCount = Number(rpcData?.count ?? 0)
    if (!rpcMissing && rpcData?.success !== false && rpcCount > 0) {
      return { success: true, count: rpcCount }
    }

    const { data: approvedPayments, error: paymentError } = await supabase
      .from('payment_submissions')
      .select('student_id')
      .eq('course_id', course_id)
      .in('status', ['approved', 'Approved', 'APPROVED'])

    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('course_id', course_id)

    if (paymentError) throw paymentError
    if (enrollError) throw enrollError

    const studentIds = [
      ...new Set([
        ...(approvedPayments || []).map((row) => row.student_id),
        ...(enrollments || []).map((row) => row.user_id)
      ].filter(Boolean))
    ]

    if (studentIds.length === 0) {
      return { success: true, count: 0 }
    }

    const notifications = studentIds.map((user_id) => ({
      user_id,
      course_id,
      title,
      message,
      type,
      action_url,
      is_read: false
    }))

    const { error } = await supabase.from('notifications').insert(notifications)

    if (error) {
      const text = `${error.message || ''}`.toLowerCase()
      if (text.includes('row-level security') || text.includes('policy')) {
        throw new Error(
          'Notification blocked by database policy. Run supabase/migrations/023_fix_notifications_insert_rls.sql in Supabase SQL Editor, then retry.'
        )
      }

      if (text.includes('course_id')) {
        const fallbackRows = studentIds.map((user_id) => ({
          user_id,
          title,
          message,
          type,
          is_read: false
        }))
        const { error: fallbackError } = await supabase.from('notifications').insert(fallbackRows)
        if (fallbackError) throw fallbackError
        return { success: true, count: fallbackRows.length }
      }
      throw error
    }

    return { success: true, count: notifications.length }
  },

  // Get notifications for a user
  async getUserNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const queryUserId = sessionData?.session?.user?.id || userId

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_my_notifications', {
      p_limit: limit,
      p_unread_only: unreadOnly
    })

    if (!rpcError && Array.isArray(rpcData)) {
      return rpcData
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', queryUserId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  // Mark notification as read
  async markAsRead(notificationId) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) throw error
    return { success: true }
  },

  // Mark all notifications as read
  async markAllAsRead(userId) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return { success: true }
  },

  // Get unread count
  async getUnreadCount(userId) {
    if (!isSupabaseAvailable()) {
      return 0
    }

    const { data: rpcCount, error: rpcError } = await supabase.rpc('get_my_unread_notification_count')
    if (!rpcError && typeof rpcCount === 'number') {
      return rpcCount
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const queryUserId = sessionData?.session?.user?.id || userId

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', queryUserId)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  },

  // Live sessions the student can join right now (fallback when notifications table fails)
  async getLiveSessionInvitesForStudent(userId) {
    if (!isSupabaseAvailable() || !userId) {
      return []
    }

    const { data: sessionData } = await supabase.auth.getSession()
    const queryUserId = sessionData?.session?.user?.id || userId

    const courseMeta = new Map()

    const [{ data: enrollments }, { data: approvedPayments }] = await Promise.all([
      supabase
        .from('enrollments')
        .select('course_id, course:courses(id, title)')
        .eq('user_id', queryUserId),
      supabase
        .from('payment_submissions')
        .select('course_id, course:courses(id, title)')
        .eq('student_id', queryUserId)
        .in('status', ['approved', 'Approved', 'APPROVED'])
    ])

    ;(enrollments || []).forEach((row) => {
      if (row.course_id) {
        courseMeta.set(row.course_id, row.course?.title || courseMeta.get(row.course_id) || 'Course')
      }
    })
    ;(approvedPayments || []).forEach((row) => {
      if (row.course_id) {
        courseMeta.set(row.course_id, row.course?.title || courseMeta.get(row.course_id) || 'Course')
      }
    })

    if (courseMeta.size === 0) {
      return []
    }

    const invites = []

    for (const [courseId, courseTitle] of courseMeta.entries()) {
      const meetings = await meetingService.getMeetingsByCourse(courseId)
      const liveMeetings = (meetings || []).filter((meeting) => meeting.status === 'live')

      for (const meeting of liveMeetings) {
        const roomName = resolveJitsiRoomName(meeting, courseId)
        const jitsiUrl = roomName ? getJitsiExternalUrl(roomName) : ''
        const sessionLabel = meeting.title || 'Live session'
        const learnUrl = meeting.id
          ? `/courses/${courseId}/learn?session=${meeting.id}`
          : `/courses/${courseId}/learn?session=live`

        invites.push({
          id: `live-meeting-${meeting.id}`,
          user_id: queryUserId,
          course_id: courseId,
          title: `Live session invitation: ${sessionLabel}`,
          message: jitsiUrl
            ? `You are invited to a live session in "${courseTitle}".\n\nTap "Join session" to enter.\n\nJitsi link:\n${jitsiUrl}`
            : `You are invited to a live session in "${courseTitle}". Tap "Join session" to enter.`,
          type: 'meeting',
          action_url: learnUrl,
          is_read: false,
          created_at: meeting.updated_at || meeting.scheduled_at || new Date().toISOString(),
          _source: 'live_meeting'
        })
      }
    }

    return invites.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  },

  async getSessionInvites(userId, { limit = 15 } = {}) {
    const [stored, live] = await Promise.all([
      this.getUserNotifications(userId, { limit }).catch(() => []),
      this.getLiveSessionInvitesForStudent(userId).catch(() => [])
    ])

    const merged = []
    const seen = new Set()

    for (const item of [...live, ...stored]) {
      const key = item.id || `${item.course_id}-${item.title}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(item)
    }

    return merged.slice(0, limit)
  }
}

export default {
  auth: authService,
  courses: courseService,
  lessons: lessonService,
  enrollments: enrollmentService,
  reviews: reviewService,
  users: userService,
  categories: categoryService,
  admin: adminService,
  meetings: meetingService,
  notifications: notificationService,
  chat: chatService
}