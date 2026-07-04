import supabase from '../lib/supabase'
import { isSupabaseAvailable } from './helpers'

export const courseService = {
  // Get all courses with optional filters
  async getCourses({ category, level, search, limit = 20, offset = 0 } = {}) {
    if (!isSupabaseAvailable()) {
      return { data: [], count: 0 }
    }

    let query = supabase
      .from('courses')
      .select(`
        *,
        instructor:users!instructor_id(id, full_name, avatar_url, bio),
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
      return null
    }

    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:users!instructor_id(id, full_name, avatar_url, bio, role),
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
      return []
    }

    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        instructor:users!instructor_id(id, full_name, avatar_url, bio),
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
