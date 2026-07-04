import supabase from '../lib/supabase'
import { isSupabaseAvailable } from './helpers'

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
