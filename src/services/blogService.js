import supabase from '../lib/supabase'
import { isSupabaseAvailable } from './helpers'

const mockBlogPosts = []

export const blogService = {
  async getPublishedPosts() {
    if (!isSupabaseAvailable()) {
      return mockBlogPosts
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:users!author_id(id, full_name, avatar_url),
        course:courses(id, title, thumbnail_url)
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getAdminPosts() {
    if (!isSupabaseAvailable()) {
      return mockBlogPosts
    }

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`
        *,
        author:users!author_id(id, full_name, avatar_url),
        course:courses(id, title, thumbnail_url)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createPost(postData) {
    if (!isSupabaseAvailable()) {
      return { ...postData, id: `mock-blog-${Date.now()}`, created_at: new Date().toISOString() }
    }

    const { id, author, course, ...payload } = postData
    const { data, error } = await supabase
      .from('blog_posts')
      .insert(payload)
      .select(`
        *,
        author:users!author_id(id, full_name, avatar_url),
        course:courses(id, title, thumbnail_url)
      `)
      .single()

    if (error) throw error
    return data
  },

  async updatePost(id, postData) {
    if (!isSupabaseAvailable()) {
      return { ...postData, id, updated_at: new Date().toISOString() }
    }

    const { id: postId, author, course, created_at, updated_at, ...payload } = postData
    const { data, error } = await supabase
      .from('blog_posts')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        author:users!author_id(id, full_name, avatar_url),
        course:courses(id, title, thumbnail_url)
      `)
      .single()

    if (error) throw error
    return data
  },

  async deletePost(id) {
    if (!isSupabaseAvailable()) {
      return { success: true }
    }

    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  }
}
