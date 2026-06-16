const RAW_JITSI_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || ''
const JITSI_DOMAIN = RAW_JITSI_DOMAIN.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
const PUBLIC_MEET_JITSI_DOMAIN = 'meet.jit.si'

export function generateJitsiRoomName(courseTitle = 'course', sessionTitle = 'session') {
  const base = `${courseTitle}_${sessionTitle}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40)

  const suffix = Date.now().toString(36)
  return `bepro_${base}_${suffix}`.slice(0, 80)
}

export function getJitsiDomain() {
  return JITSI_DOMAIN
}

export function isPublicMeetJitsiDomain(domain = JITSI_DOMAIN) {
  return domain.trim().toLowerCase() === PUBLIC_MEET_JITSI_DOMAIN
}

export function getJitsiConfigurationIssue() {
  if (!JITSI_DOMAIN) {
    return 'Jitsi is not configured. Set VITE_JITSI_DOMAIN to a self-hosted Jitsi or JaaS domain.'
  }

  if (isPublicMeetJitsiDomain()) {
    return 'meet.jit.si requires authenticated room creation and may show Google/GitHub/Facebook login. Use a self-hosted Jitsi domain or JaaS for embedded platform calls.'
  }

  return ''
}

export function getJitsiExternalUrl(roomName) {
  return `https://${JITSI_DOMAIN}/${roomName}`
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function isExternalGoogleMeet(meeting) {
  if (!meeting) return false
  if (meeting.platform === 'jitsi') return false
  if (!hasText(meeting.meet_link)) return false
  if (meeting.platform === 'google_meet') return true
  if (hasText(meeting.jitsi_room_name)) return false
  return true
}

export function isJitsiMeeting(meeting) {
  if (!meeting) return false
  if (meeting.platform === 'jitsi' || hasText(meeting.jitsi_room_name)) return true
  if (hasText(meeting.meet_link) && !isExternalGoogleMeet(meeting)) return false
  return true
}

export function getCourseLiveRoomName(courseId) {
  if (!courseId) return null
  return `bepro_course_${String(courseId).replace(/-/g, '').slice(0, 24)}_live`
}

export function resolveJitsiRoomName(meeting, courseId = null) {
  if (!meeting) return courseId ? getCourseLiveRoomName(courseId) : null
  if (hasText(meeting.jitsi_room_name)) return meeting.jitsi_room_name.trim()
  if (meeting.id) {
    return `bepro_${String(meeting.id).replace(/-/g, '').slice(0, 32)}`
  }
  return courseId ? getCourseLiveRoomName(courseId) : null
}

export function normalizeMeetingRecord(meeting) {
  if (!meeting) return meeting

  if (isExternalGoogleMeet(meeting)) {
    return {
      ...meeting,
      platform: 'google_meet',
      meet_link: meeting.meet_link.trim(),
      jitsi_room_name: null
    }
  }

  const roomName = resolveJitsiRoomName(meeting)
  if (!roomName) return meeting

  return {
    ...meeting,
    platform: 'jitsi',
    jitsi_room_name: hasText(meeting.jitsi_room_name) ? meeting.jitsi_room_name.trim() : roomName,
    meet_link: meeting.meet_link || null
  }
}

export function getMeetingJoinTarget(meeting, courseId = null) {
  const normalized = normalizeMeetingRecord(meeting)
  if (!normalized && !courseId) return null

  if (normalized && isExternalGoogleMeet(normalized)) {
    return {
      type: 'external',
      url: normalized.meet_link.trim()
    }
  }

  const roomName = resolveJitsiRoomName(normalized, courseId)
  if (roomName) {
    return {
      type: 'jitsi',
      roomName
    }
  }

  return null
}

export function canJoinMeeting(meeting, courseId = null) {
  return !!getMeetingJoinTarget(meeting, courseId)
}

export function pickJoinableMeeting(meetings = [], courseId = null) {
  if (!Array.isArray(meetings) || meetings.length === 0) return null

  const joinable = meetings.map(normalizeMeetingRecord).filter((m) => canJoinMeeting(m, courseId))
  if (joinable.length === 0) return null

  const liveFirst = [...joinable].sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1
    if (b.status === 'live' && a.status !== 'live') return 1
    if (isExternalGoogleMeet(a) && !isExternalGoogleMeet(b)) return -1
    if (isExternalGoogleMeet(b) && !isExternalGoogleMeet(a)) return 1
    return new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0)
  })

  return liveFirst[0]
}

export default {
  generateJitsiRoomName,
  getJitsiDomain,
  isPublicMeetJitsiDomain,
  getJitsiConfigurationIssue,
  getJitsiExternalUrl,
  getCourseLiveRoomName,
  isExternalGoogleMeet,
  isJitsiMeeting,
  resolveJitsiRoomName,
  normalizeMeetingRecord,
  getMeetingJoinTarget,
  canJoinMeeting,
  pickJoinableMeeting
}
