import supabase from '../lib/supabase'
import {
  isExternalGoogleMeet,
  normalizeMeetingRecord,
  resolveJitsiRoomName
} from '../lib/jitsi'
import {
  isSupabaseAvailable,
  hasText,
  isMissingTableError,
  warnMissingMeetingsTable
} from './helpers'

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

    if (meetingData.platform === 'google_meet' || isExternalGoogleMeet(data)) {
      return normalizeMeetingRecord(data)
    }

    return ensureMeetingJoinFields(data, meetingData.jitsi_room_name)
  },

  ensureMeetingJoinFields,

  // Get meetings for a course
  async getMeetingsByCourse(courseId, { instructorView = false } = {}) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const normalizeAll = (rows) => (rows || []).map(normalizeMeetingRecord)

    if (instructorView) {
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
        throw error
      }

      return normalizeAll(data)
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_course_meetings_for_student',
      { p_course_id: courseId }
    )

    if (!rpcError && Array.isArray(rpcData)) {
      return normalizeAll(rpcData)
    }

    if (rpcError?.message?.includes('Access denied')) {
      return []
    }

    if (rpcError && !rpcError.message?.includes('Could not find the function')) {
      console.warn('get_course_meetings_for_student RPC failed:', rpcError.message)
    }

    return []
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
