import supabase from '../lib/supabase'
import { getMeetingJoinTarget, getJitsiExternalUrl } from '../lib/jitsi'
import { meetingService } from './meetingService'
import { isSupabaseAvailable } from './helpers'

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
        const joinTarget = getMeetingJoinTarget(meeting, courseId)
        const sessionLabel = meeting.title || 'Live session'
        const learnUrl = meeting.id
          ? `/courses/${courseId}/learn?session=${meeting.id}`
          : `/courses/${courseId}/learn?session=live`

        const platformLabel = joinTarget?.type === 'external' ? 'Google Meet' : 'Jitsi'
        const shareUrl = joinTarget?.type === 'external'
          ? joinTarget.url
          : joinTarget?.type === 'jitsi'
            ? getJitsiExternalUrl(joinTarget.roomName)
            : ''

        invites.push({
          id: `live-meeting-${meeting.id}`,
          user_id: queryUserId,
          course_id: courseId,
          title: `Live session invitation: ${sessionLabel}`,
          message: shareUrl
            ? `You are invited to a live session in "${courseTitle}".\n\nTap "Join session" to enter.\n\n${platformLabel} link:\n${shareUrl}`
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
