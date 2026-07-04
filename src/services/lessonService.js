import supabase from '../lib/supabase'
import { isSupabaseAvailable } from './helpers'

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
