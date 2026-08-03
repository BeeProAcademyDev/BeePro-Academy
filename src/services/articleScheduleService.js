import supabase from '../lib/supabase'
import { generateArticleDraft } from '../lib/articleAiGenerator'
import { isSupabaseAvailable } from './helpers'
import { blogService } from './blogService'

const mockArticleSchedules = []

export const articleScheduleService = {
  async getSchedules() {
    if (!isSupabaseAvailable()) {
      return mockArticleSchedules
    }

    const { data, error } = await supabase
      .from('article_schedules')
      .select(`
        *,
        course:courses(id, title, category, level, thumbnail_url),
        blog_post:blog_posts(id, title, slug, status)
      `)
      .order('scheduled_at', { ascending: true })

    if (error) throw error
    return data || []
  },

  async createSchedule(payload) {
    if (!isSupabaseAvailable()) {
      const row = {
        ...payload,
        id: `mock-schedule-${Date.now()}`,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      mockArticleSchedules.unshift(row)
      return row
    }

    const { data, error } = await supabase
      .from('article_schedules')
      .insert(payload)
      .select(`
        *,
        course:courses(id, title, category, level, thumbnail_url),
        blog_post:blog_posts(id, title, slug, status)
      `)
      .single()

    if (error) throw error
    return data
  },

  async updateSchedule(id, payload) {
    if (!isSupabaseAvailable()) {
      const index = mockArticleSchedules.findIndex((row) => row.id === id)
      if (index === -1) throw new Error('Schedule not found')
      mockArticleSchedules[index] = {
        ...mockArticleSchedules[index],
        ...payload,
        updated_at: new Date().toISOString()
      }
      return mockArticleSchedules[index]
    }

    const { data, error } = await supabase
      .from('article_schedules')
      .update(payload)
      .eq('id', id)
      .select(`
        *,
        course:courses(id, title, category, level, thumbnail_url),
        blog_post:blog_posts(id, title, slug, status)
      `)
      .single()

    if (error) throw error
    return data
  },

  async deleteSchedule(id) {
    if (!isSupabaseAvailable()) {
      const index = mockArticleSchedules.findIndex((row) => row.id === id)
      if (index >= 0) mockArticleSchedules.splice(index, 1)
      return { success: true }
    }

    const { error } = await supabase
      .from('article_schedules')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { success: true }
  },

  async processSchedule(schedule, { courses = [], authorId } = {}) {
    const course = schedule.course
      || courses.find((item) => `${item.id}` === `${schedule.course_id}`)
      || null

    await this.updateSchedule(schedule.id, { status: 'generating', error_message: null })

    try {
      const draft = generateArticleDraft({
        course,
        courses,
        titleHint: schedule.title_hint,
        promptNotes: schedule.prompt_notes,
        category: course?.category
      })

      const postPayload = {
        ...draft,
        author_id: authorId || schedule.created_by || null,
        status: schedule.auto_publish ? 'published' : 'draft',
        published_at: schedule.auto_publish ? new Date().toISOString() : null
      }

      const savedPost = await blogService.createPost(postPayload)
      const finalStatus = schedule.auto_publish ? 'published' : 'ready'

      return await this.updateSchedule(schedule.id, {
        status: finalStatus,
        blog_post_id: savedPost.id,
        processed_at: new Date().toISOString(),
        error_message: null
      })
    } catch (err) {
      await this.updateSchedule(schedule.id, {
        status: 'failed',
        error_message: err?.message || 'Article generation failed',
        processed_at: new Date().toISOString()
      })
      throw err
    }
  },

  async processDueSchedules({ courses = [], authorId } = {}) {
    const schedules = await this.getSchedules()
    const now = Date.now()
    const due = schedules.filter(
      (row) => row.status === 'pending' && new Date(row.scheduled_at).getTime() <= now
    )

    const results = []
    for (const schedule of due) {
      try {
        const updated = await this.processSchedule(schedule, { courses, authorId })
        results.push({ schedule: updated, success: true })
      } catch (err) {
        results.push({ schedule, success: false, error: err?.message })
      }
    }

    return results
  }
}
