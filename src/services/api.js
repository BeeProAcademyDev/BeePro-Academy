import supabase from '../lib/supabase'
import { courses as mockCourses, categories as mockCategories } from '../data/courses'

// Check if Supabase is available
const isSupabaseAvailable = () => !!supabase

// ============ AUTH SERVICES ============
export const authService = {
  // Sign up with email and password
  async signUp({ email, password, fullName, role = 'student' }) {
    if (!isSupabaseAvailable()) {
      // Mock signup
      return {
        user: { id: 'mock-user-id', email, full_name: fullName, role },
        session: { access_token: 'mock-token' }
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role
        }
      }
    })

    if (error) throw error

    // Create user profile in users table
    if (data.user) {
      await supabase.from('users').insert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        role
      })
    }

    return data
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  },

  // Sign out
  async signOut() {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  },

  // Get current user
  async getCurrentUser() {
    if (!isSupabaseAvailable()) {
      return null
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Get user profile from users table
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    return { ...user, ...profile }
  },

  // Reset password
  async resetPassword(email) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) throw error
    return { success: true }
  },

  // Update password
  async updatePassword(newPassword) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
    return { success: true }
  },

  // Sign in with Google OAuth
  async signInWithGoogle() {
    if (!isSupabaseAvailable()) {
      throw new Error('Supabase is not configured. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in deployment environment variables.')
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })

    if (error) throw error
    return data
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
  // Enroll in a course
  async enrollInCourse(courseId) {
    if (!isSupabaseAvailable()) {
      return { id: 'mock-enrollment-id', course_id: courseId, progress: 0 }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        user_id: user.id,
        course_id: courseId,
        progress: 0
      })
      .select()
      .single()

    if (error) throw error
    return data
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
      const newProfile = {
        id: userId,
        email: userData.email || '',
        full_name: userData.full_name || userData.email?.split('@')[0] || 'User',
        role: 'student',
        avatar_url: userData.avatar_url || null
      }

      const { data: createdProfile, error: createError } = await supabase
        .from('users')
        .upsert(newProfile, { onConflict: 'id' })
        .select()
        .single()

      if (createError) {
        console.error('Error creating profile:', createError)
        return newProfile // Return the new profile object even if insert fails
      }
      return createdProfile
    }

    return profile
  },

  // Update user profile
  async updateProfile(userId, profileData) {
    if (!isSupabaseAvailable()) {
      return { id: userId, ...profileData }
    }

    const { data, error } = await supabase
      .from('users')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
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

  // Update user role (admin only)
  async updateUserRole(userId, role) {
    if (!isSupabaseAvailable()) {
      return { id: userId, role }
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ============ MEETING SERVICES ============
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

    if (error) throw error
    return data
  },

  // Get meetings for a course
  async getMeetingsByCourse(courseId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('course_id', courseId)
      .order('scheduled_at', { ascending: true })

    if (error) throw error
    return data
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

    if (error) throw error
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

    if (error) throw error
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

    if (error) throw error
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

  // Get notifications for a user
  async getUserNotifications(userId, { limit = 20, unreadOnly = false } = {}) {
    if (!isSupabaseAvailable()) {
      return []
    }

    let query = supabase
      .from('notifications')
      .select(`
        *,
        course:courses(id, title, thumbnail_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query

    if (error) throw error
    return data
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

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
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
  notifications: notificationService
}