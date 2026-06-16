function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function normalizeGoogleMeetLink(raw) {
  if (!hasText(raw)) return ''
  const trimmed = raw.trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }
  if (/^meet\.google\.com\//i.test(trimmed)) {
    return `https://${trimmed}`
  }
  return trimmed
}

export function isValidGoogleMeetLink(raw) {
  const normalized = normalizeGoogleMeetLink(raw)
  if (!normalized) return false
  try {
    const url = new URL(normalized)
    return url.hostname === 'meet.google.com' && url.pathname.length > 1
  } catch {
    return false
  }
}
