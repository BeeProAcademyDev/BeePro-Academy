import supabase from '../lib/supabase'
import { isSupabaseAvailable, getCurrentUserId } from './helpers'

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

    const userId = await getCurrentUserId()
    if (!userId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('reviews')
      .insert({
        course_id: courseId,
        user_id: userId,
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
