const GOOGLE_GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client'
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'

let gsiScriptPromise = null
let tokenClient = null
let accessToken = null

const getClientId = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID
  if (!clientId) {
    throw new Error('Google Calendar client ID is missing. Set VITE_GOOGLE_CALENDAR_CLIENT_ID in .env.')
  }
  return clientId
}

const loadGsiScript = () => {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }

  if (gsiScriptPromise) {
    return gsiScriptPromise
  }

  gsiScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${GOOGLE_GSI_SCRIPT_URL}"]`)

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services script.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_GSI_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'))
    document.head.appendChild(script)
  })

  return gsiScriptPromise
}

const initTokenClient = async () => {
  await loadGsiScript()
  const clientId = getClientId()

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services is not available in the browser.')
  }

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPE,
      callback: () => {}
    })
  }

  return tokenClient
}

const requestAccessToken = async () => {
  const client = await initTokenClient()

  return new Promise((resolve, reject) => {
    client.callback = (response) => {
      if (response?.error) {
        reject(new Error(response.error_description || response.error || 'Google authorization failed.'))
        return
      }

      if (!response?.access_token) {
        reject(new Error('Google authorization did not return an access token.'))
        return
      }

      accessToken = response.access_token
      resolve(accessToken)
    }

    client.requestAccessToken({ prompt: accessToken ? '' : 'consent' })
  })
}

const createCalendarEvent = async ({ title, description, scheduledAt, durationMinutes = 60 }) => {
  const startDate = new Date(scheduledAt)
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Invalid meeting date/time.')
  }

  const duration = Number(durationMinutes) || 60
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000)
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  const eventBody = {
    summary: title,
    description: description || '',
    start: {
      dateTime: startDate.toISOString(),
      timeZone: timezone
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: timezone
    },
    conferenceData: {
      createRequest: {
        requestId: `bepro-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  }

  const token = await requestAccessToken()

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventBody)
  })

  if (!response.ok) {
    let details = ''
    try {
      const errorData = await response.json()
      details = errorData?.error?.message || ''
    } catch {
      details = ''
    }
    throw new Error(details || 'Failed to create Google Calendar event.')
  }

  const event = await response.json()
  const meetLink =
    event?.hangoutLink ||
    event?.conferenceData?.entryPoints?.find((entry) => entry.entryPointType === 'video')?.uri ||
    ''

  if (!meetLink) {
    throw new Error('Google Calendar event created, but no Google Meet link was returned.')
  }

  return {
    eventId: event.id,
    meetLink,
    calendarEvent: event
  }
}

export const googleCalendarService = {
  createGoogleMeetEvent: createCalendarEvent
}

export default googleCalendarService
