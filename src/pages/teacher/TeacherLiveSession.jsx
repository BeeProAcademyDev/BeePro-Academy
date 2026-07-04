import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useTranslation } from 'react-i18next'
import {
  courseService,
  meetingService,
  notificationService
} from '../../services/api'
import {
  generateJitsiRoomName,
  getCourseLiveRoomName,
  getJitsiExternalUrl,
  isExternalGoogleMeet,
  isJitsiMeeting,
  resolveJitsiRoomName
} from '../../lib/jitsi'
import { googleCalendarService } from '../../lib/googleCalendar'
import { isValidGoogleMeetLink, normalizeGoogleMeetLink } from '../../lib/meetLinks'
import JitsiMeetingRoom from '../../components/jitsi/JitsiMeetingRoom'
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiCopy,
  FiExternalLink,
  FiLoader,
  FiSend,
  FiUsers,
  FiVideo
} from 'react-icons/fi'

const defaultForm = {
  title: '',
  description: '',
  scheduled_at: '',
  duration_minutes: 60,
  manual_meet_link: ''
}

const TeacherLiveSession = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { language } = useLanguage()
  const [searchParams] = useSearchParams()
  const isAr = language === 'ar'
  const instantMode = searchParams.get('instant') === '1'
  const autoStartedRef = useRef(false)

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [sessions, setSessions] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sendingLink, setSendingLink] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [copyFeedback, setCopyFeedback] = useState('')
  const [activeSession, setActiveSession] = useState(null)
  const [sessionPlatform, setSessionPlatform] = useState('jitsi')
  const [googleMeetLinkMode, setGoogleMeetLinkMode] = useState('manual')

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  )

  const liveSessions = useMemo(
    () => sessions.filter((session) => isJitsiMeeting(session) || isExternalGoogleMeet(session) || session.platform === 'google_meet'),
    [sessions]
  )

  const isGoogleMeetSession = (session) => (
    isExternalGoogleMeet(session) || session?.platform === 'google_meet'
  )

  const buildSessionShareInfo = (session, courseId = selectedCourseId) => {
    const learnUrl = session?.id
      ? `/courses/${courseId}/learn?session=${session.id}`
      : `/courses/${courseId}/learn?session=live`

    if (isGoogleMeetSession(session) && session?.meet_link) {
      return {
        platform: 'google_meet',
        shareUrl: session.meet_link,
        learnUrl,
        roomName: null
      }
    }

    const roomName = resolveJitsiRoomName(session, courseId)
    const jitsiUrl = roomName ? getJitsiExternalUrl(roomName) : ''

    return {
      platform: 'jitsi',
      shareUrl: jitsiUrl,
      learnUrl,
      roomName
    }
  }

  const copyText = async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(label)
      window.setTimeout(() => setCopyFeedback(''), 2500)
    } catch {
      setError(t('teacherLiveSession.couldNotCopyTheLink'))
    }
  }

  const sendSessionLinkToStudents = async (session, options = {}) => {
    const { silent = false } = options

    if (!selectedCourseId || !session) {
      setError(t('teacherLiveSession.selectACourseAndSessionFirst'))
      return null
    }

    const shareInfo = buildSessionShareInfo(session)
    if (!shareInfo.shareUrl) {
      setError(
        shareInfo.platform === 'google_meet'
          ? t('teacherLiveSession.googleMeetLinkNotAvailable')
          : t('teacherLiveSession.jitsiLinkNotAvailable')
      )
      return null
    }

    if (!silent) {
      setSendingLink(true)
      setError('')
      setSuccess('')
    }

    try {
      const sessionTitle = session.title || (t('teacherLiveSession.liveSession_38'))
      const platformLabel = shareInfo.platform === 'google_meet' ? 'Google Meet' : 'Jitsi'
      const notifyResult = await notificationService.notifyEligibleStudents({
        course_id: selectedCourseId,
        title: t('teacherLiveSession.liveSessionInvitationSessionti'),
        message: t('teacherLiveSession.youAreInvitedToALiveSessionInS'),
        type: 'meeting',
        action_url: shareInfo.learnUrl
      })

      if (!silent) {
        const audienceText = Number(selectedCourse?.price || 0) > 0
          ? (t('teacherLiveSession.withApprovedPayment'))
          : (t('teacherLiveSession.enrolledInTheCourse'))

        if ((notifyResult?.count ?? 0) === 0) {
          setError(
            t('teacherLiveSession.noStudentsReceivedTheNotificat')
          )
        } else {
          setSuccess(
            t('teacherLiveSession.platformlabelLinkSentToNotifyr')
          )
        }
      }

      return notifyResult
    } catch (err) {
      if (!silent) {
        setError(err.message || (t('teacherLiveSession.failedToSendLinkToStudents')))
      }
      throw err
    } finally {
      if (!silent) {
        setSendingLink(false)
      }
    }
  }

  const startLiveSession = async (startNow = true, titleOverride = '') => {
    if (!selectedCourseId || !user?.id) {
      setError(t('teacherLiveSession.selectACourseFirst'))
      return
    }

    const sessionTitle = (titleOverride || form.title).trim() || (t('teacherLiveSession.liveSession_37'))
    const scheduledAt = form.scheduled_at || new Date().toISOString().slice(0, 16)
    const isManualGoogleMeet = sessionPlatform === 'google_meet' && googleMeetLinkMode === 'manual'

    if (sessionPlatform === 'google_meet' && isManualGoogleMeet) {
      const meetLink = normalizeGoogleMeetLink(form.manual_meet_link)
      if (!isValidGoogleMeetLink(meetLink)) {
        setError(
          t('teacherLiveSession.pleaseEnterAValidGoogleMeetLin')
        )
        return
      }
    } else if (sessionPlatform === 'google_meet' && googleMeetLinkMode === 'calendar') {
      if (!sessionTitle || !scheduledAt) {
        setError(t('teacherLiveSession.pleaseEnterSessionTitleAndSche'))
        return
      }
    }

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      let meetingPayload

      if (sessionPlatform === 'jitsi') {
        const jitsiRoomName = getCourseLiveRoomName(selectedCourseId)
          || generateJitsiRoomName(selectedCourse?.title || 'course', sessionTitle)

        meetingPayload = {
          course_id: selectedCourseId,
          created_by: user.id,
          title: sessionTitle,
          description: form.description.trim() || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: Number(form.duration_minutes) || 60,
          platform: 'jitsi',
          jitsi_room_name: jitsiRoomName,
          meet_link: null,
          status: startNow ? 'live' : 'scheduled'
        }
      } else if (isManualGoogleMeet) {
        const meetLink = normalizeGoogleMeetLink(form.manual_meet_link)
        meetingPayload = {
          course_id: selectedCourseId,
          created_by: user.id,
          title: sessionTitle,
          description: form.description.trim() || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: Number(form.duration_minutes) || 60,
          platform: 'google_meet',
          meet_link: meetLink,
          jitsi_room_name: null,
          status: startNow ? 'live' : 'scheduled'
        }
      } else {
        const { meetLink, eventId } = await googleCalendarService.createGoogleMeetEvent({
          title: sessionTitle,
          description: form.description.trim() || '',
          scheduledAt: scheduledAt,
          durationMinutes: Number(form.duration_minutes) || 60
        })

        meetingPayload = {
          course_id: selectedCourseId,
          created_by: user.id,
          title: sessionTitle,
          description: form.description.trim() || null,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: Number(form.duration_minutes) || 60,
          platform: 'google_meet',
          meet_link: meetLink,
          calendar_event_id: eventId,
          jitsi_room_name: null,
          status: startNow ? 'live' : 'scheduled'
        }
      }

      const meeting = await meetingService.createMeeting(meetingPayload)

      const resolvedMeeting = sessionPlatform === 'jitsi'
        ? {
            ...meeting,
            jitsi_room_name: resolveJitsiRoomName(meeting, selectedCourseId)
          }
        : meeting

      const notifyResult = await sendSessionLinkToStudents(resolvedMeeting, { silent: true })
      const platformLabel = sessionPlatform === 'google_meet' ? 'Google Meet' : 'Jitsi'

      setSuccess(
        (notifyResult?.count ?? 0) === 0
          ? (t('teacherLiveSession.sessionOpenedButNoNotification'))
          : (t('teacherLiveSession.sessionOpenedAndPlatformlabelL'))
      )

      setForm(defaultForm)
      setActiveSession(resolvedMeeting)

      const refreshed = await meetingService.getMeetingsByCourse(selectedCourseId, { instructorView: true })
      setSessions(refreshed || [])
    } catch (err) {
      setError(err.message || (t('teacherLiveSession.failedToCreateSession')))
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreateAndNotify = async (startNow = false) => {
    await startLiveSession(startNow)
  }

  const handleSendCourseLiveLink = async () => {
    if (!selectedCourseId) return

    const virtualSession = {
      id: null,
      title: t('teacherLiveSession.courseLiveSession'),
      jitsi_room_name: getCourseLiveRoomName(selectedCourseId),
      platform: 'jitsi'
    }

    await sendSessionLinkToStudents(virtualSession)
  }

  useEffect(() => {
    const loadCourses = async () => {
      if (!user?.id) return

      setLoadingCourses(true)
      setError('')

      try {
        const data = await courseService.getInstructorCourses(user.id)
        setCourses(data || [])
        if (data?.length === 1) {
          setSelectedCourseId(data[0].id)
        }
      } catch (err) {
        setError(err.message || (t('teacherLiveSession.failedToLoadCourses')))
      } finally {
        setLoadingCourses(false)
      }
    }

    loadCourses()
  }, [user?.id, isAr])

  useEffect(() => {
    const loadSessions = async () => {
      if (!selectedCourseId) {
        setSessions([])
        return
      }

      setLoadingSessions(true)
      try {
        const data = await meetingService.getMeetingsByCourse(selectedCourseId, { instructorView: true })
        setSessions(data || [])
      } catch (err) {
        setError(err.message || (t('teacherLiveSession.failedToLoadSessions')))
      } finally {
        setLoadingSessions(false)
      }
    }

    loadSessions()
  }, [selectedCourseId, isAr])

  useEffect(() => {
    if (courses.length === 1 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id)
    }
  }, [courses, selectedCourseId])

  useEffect(() => {
    if (!instantMode || autoStartedRef.current || loadingCourses || !selectedCourseId || submitting) {
      return
    }

    autoStartedRef.current = true
    startLiveSession(true, t('teacherLiveSession.liveSession'))
  }, [instantMode, loadingCourses, selectedCourseId, submitting, isAr])

  const renderShareLinkCard = (session, compact = false) => {
    const shareInfo = buildSessionShareInfo(session)
    if (!shareInfo.shareUrl) return null

    const platformLabel = shareInfo.platform === 'google_meet' ? 'Google Meet' : 'Jitsi'

    return (
      <div className={`rounded-lg border border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-900/20 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          {t('teacherLiveSession.platformlabelLinkForStudents')}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            className="input flex-1 text-sm bg-white dark:bg-dark-card"
            value={shareInfo.shareUrl}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm inline-flex items-center gap-2"
              onClick={() => copyText(shareInfo.shareUrl, t('teacherLiveSession.platformlabelLinkCopied'))}
            >
              <FiCopy className="w-4 h-4" />
              {t('teacherLiveSession.copy_36')}
            </button>
            <a
              href={shareInfo.shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm inline-flex items-center gap-2"
            >
              <FiExternalLink className="w-4 h-4" />
              {t('teacherLiveSession.open')}
            </a>
            <button
              type="button"
              className="btn btn-primary btn-sm inline-flex items-center gap-2"
              disabled={sendingLink}
              onClick={() => sendSessionLinkToStudents(session)}
            >
              {sendingLink ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
              {t('teacherLiveSession.sendToStudents')}
            </button>
          </div>
        </div>
        {copyFeedback && (
          <p className="text-xs text-green-700 dark:text-green-300">{copyFeedback}</p>
        )}
      </div>
    )
  }

  const renderPlatformPicker = () => (
    <div className="space-y-3">
      <label className="label">{t('teacherLiveSession.sessionPlatform_35')}</label>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('teacherLiveSession.sessionPlatform')}>
        <button
          type="button"
          className={`rounded-xl border-2 px-4 py-3 font-semibold transition ${
            sessionPlatform === 'jitsi'
              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
              : 'border-secondary-200 dark:border-dark-border bg-secondary-50 dark:bg-dark-card'
          }`}
          onClick={() => setSessionPlatform('jitsi')}
        >
          🎥 Jitsi
        </button>
        <button
          type="button"
          className={`rounded-xl border-2 px-4 py-3 font-semibold transition ${
            sessionPlatform === 'google_meet'
              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
              : 'border-secondary-200 dark:border-dark-border bg-secondary-50 dark:bg-dark-card'
          }`}
          onClick={() => setSessionPlatform('google_meet')}
        >
          📅 Google Meet
        </button>
      </div>

      {sessionPlatform === 'google_meet' && (
        <>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('teacherLiveSession.googleMeetLinkSource')}>
            <button
              type="button"
              className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                googleMeetLinkMode === 'manual'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                  : 'border-secondary-200 dark:border-dark-border bg-secondary-50 dark:bg-dark-card'
              }`}
              onClick={() => setGoogleMeetLinkMode('manual')}
            >
              {t('teacherLiveSession.manualLink')}
            </button>
            <button
              type="button"
              className={`rounded-xl border-2 px-3 py-2 text-sm font-medium transition ${
                googleMeetLinkMode === 'calendar'
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200'
                  : 'border-secondary-200 dark:border-dark-border bg-secondary-50 dark:bg-dark-card'
              }`}
              onClick={() => setGoogleMeetLinkMode('calendar')}
            >
              {t('teacherLiveSession.googleCalendar')}
            </button>
          </div>

          {googleMeetLinkMode === 'manual' && (
            <div>
              <label className="label">{t('teacherLiveSession.googleMeetLink')}</label>
              <input
                className="input"
                value={form.manual_meet_link}
                onChange={(e) => setForm((prev) => ({ ...prev, manual_meet_link: e.target.value }))}
                placeholder="https://meet.google.com/abc-defg-hij"
              />
              <p className="text-xs text-secondary-500 mt-1">
                {t('teacherLiveSession.pasteAGoogleMeetLinkYouCreated')}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )

  return (
    <div className="min-h-screen pt-20 pb-16 bg-secondary-50 dark:bg-dark-bg">
      <div className="container-custom max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-secondary-500 hover:text-primary-500 mb-2">
              <FiArrowLeft className="w-4 h-4" />
              {t('teacherLiveSession.backToDashboard')}
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('dashboardExtra.liveSession')}
            </h1>
            <p className="text-secondary-500 mt-1">
              {t('teacherLiveSession.createASessionViaJitsiOrGoogle')}
            </p>
          </div>
        </div>

        {error && (
          <div className="card card-body border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="card card-body border border-green-200 bg-green-50 text-green-700 dark:bg-green-900/20 dark:border-green-800">
            {success}
          </div>
        )}

        {activeSession && (
          <div className="card card-body space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">{activeSession.title}</h2>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-secondary-100 dark:bg-dark-border">
                {isGoogleMeetSession(activeSession) ? 'Google Meet' : 'Jitsi'}
              </span>
            </div>
            {renderShareLinkCard(activeSession)}
            {isGoogleMeetSession(activeSession) ? (
              <div className="flex flex-wrap gap-3">
                <a
                  href={activeSession.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <FiExternalLink className="w-4 h-4" />
                  {t('teacherLiveSession.openGoogleMeet')}
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveSession(null)}
                >
                  {t('teacherLiveSession.close')}
                </button>
              </div>
            ) : activeSession.jitsi_room_name ? (
              <JitsiMeetingRoom
                roomName={activeSession.jitsi_room_name}
                displayName={user?.full_name || user?.email || 'Instructor'}
                isModerator
                onClose={() => setActiveSession(null)}
                language={language}
              />
            ) : null}
          </div>
        )}

        <div className="card card-body space-y-4">
          <h2 className="text-lg font-bold">{t('dashboardExtra.selectCourse')}</h2>

          {loadingCourses ? (
            <div className="flex items-center gap-2 text-secondary-500">
              <FiLoader className="w-5 h-5 animate-spin" />
              {t('teacherLiveSession.loading_34')}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary-500 mb-4">
                {t('teacherLiveSession.noCoursesYetCreateACourseFirst')}
              </p>
              <Link to="/teacher/create-course" className="btn btn-primary">
                {t('teacherLiveSession.createCourse')}
              </Link>
            </div>
          ) : (
            <select
              className="input"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">{t('teacherLiveSession.selectCourse')}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} {Number(course.price || 0) > 0 ? `($${course.price})` : `(${t('teacherLiveSession.free')})`}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedCourseId && (
          <>
            <div className="card card-body space-y-4 border-2 border-green-200 dark:border-green-800">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FiVideo className="w-5 h-5 text-green-500" />
                {t('teacherLiveSession.startSessionShareLink')}
              </h2>
              <p className="text-sm text-secondary-500">
                {t('teacherLiveSession.chooseJitsiOrGoogleMeetThenOpe')}
              </p>

              {renderPlatformPicker()}

              {sessionPlatform === 'jitsi' && selectedCourseId && renderShareLinkCard({
                id: null,
                title: t('teacherLiveSession.courseLiveLink'),
                jitsi_room_name: getCourseLiveRoomName(selectedCourseId),
                platform: 'jitsi'
              }, true)}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="btn btn-primary inline-flex items-center gap-2"
                  disabled={submitting}
                  onClick={() => startLiveSession(true)}
                >
                  {submitting ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiVideo className="w-4 h-4" />}
                  {t('teacherLiveSession.openSessionSendLink')}
                </button>
                {sessionPlatform === 'jitsi' && (
                  <button
                    type="button"
                    className="btn btn-secondary inline-flex items-center gap-2"
                    disabled={sendingLink}
                    onClick={handleSendCourseLiveLink}
                  >
                    {sendingLink ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
                    {t('teacherLiveSession.sendLinkOnly')}
                  </button>
                )}
              </div>

              <p className="text-sm text-secondary-500 flex items-center gap-2">
                <FiUsers className="w-4 h-4" />
                {Number(selectedCourse?.price || 0) > 0
                  ? (t('teacherLiveSession.sentOnlyToStudentsWithApproved'))
                  : (t('teacherLiveSession.sentToEnrolledStudents'))}
              </p>
            </div>

            <div className="card card-body space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FiVideo className="w-5 h-5 text-green-500" />
                {t('teacherLiveSession.scheduleSession')}
              </h2>

              {renderPlatformPicker()}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">{t('teacherLiveSession.sessionTitle')}</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={t('teacherLiveSession.exampleLesson1Review')}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">{t('teacherLiveSession.descriptionOptional')}</label>
                  <textarea
                    className="input min-h-[90px]"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={t('teacherLiveSession.notesForStudents')}
                  />
                </div>

                <div>
                  <label className="label">{t('teacherLiveSession.scheduledTime')}</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">{t('teacherLiveSession.durationMinutes')}</label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    className="input"
                    value={form.duration_minutes}
                    onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  className="btn btn-secondary inline-flex items-center gap-2"
                  disabled={submitting}
                  onClick={() => handleCreateAndNotify(false)}
                >
                  {submitting ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
                  {t('teacherLiveSession.scheduleSendLink')}
                </button>
              </div>
            </div>

            <div className="card card-body">
              <h2 className="text-lg font-bold mb-4">
                {t('teacherLiveSession.sessionsForThisCourse')}
              </h2>

              {loadingSessions ? (
                <div className="flex items-center gap-2 text-secondary-500">
                  <FiLoader className="w-5 h-5 animate-spin" />
                  {t('teacherLiveSession.loading')}
                </div>
              ) : liveSessions.length === 0 ? (
                <p className="text-secondary-500">
                  {t('teacherLiveSession.noSessionsYet')}
                </p>
              ) : (
                <div className="space-y-4">
                  {liveSessions.map((session) => {
                    const shareInfo = buildSessionShareInfo(session)
                    const platformLabel = shareInfo.platform === 'google_meet' ? 'Google Meet' : 'Jitsi'
                    return (
                      <div
                        key={session.id}
                        className="p-4 rounded-lg border border-secondary-200 dark:border-dark-border space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="font-semibold">{session.title}</div>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary-100 dark:bg-dark-border">
                                {platformLabel}
                              </span>
                            </div>
                            <div className="text-sm text-secondary-500 flex flex-wrap items-center gap-3 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <FiCalendar className="w-4 h-4" />
                                {session.scheduled_at
                                  ? new Date(session.scheduled_at).toLocaleString(t('teacherLiveSession.enus'))
                                  : '-'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <FiClock className="w-4 h-4" />
                                {session.duration_minutes || 60} {t('teacherLiveSession.min')}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm inline-flex items-center gap-2"
                            onClick={() => setActiveSession(
                              isGoogleMeetSession(session)
                                ? session
                                : {
                                    ...session,
                                    jitsi_room_name: resolveJitsiRoomName(session, selectedCourseId)
                                  }
                            )}
                          >
                            <FiVideo className="w-4 h-4" />
                            {t('teacherLiveSession.startJoin')}
                          </button>
                        </div>

                        {shareInfo.shareUrl && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              readOnly
                              className="input flex-1 text-xs sm:text-sm"
                              value={shareInfo.shareUrl}
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-outline btn-sm inline-flex items-center gap-1"
                                onClick={() => copyText(shareInfo.shareUrl, t('teacherLiveSession.copied'))}
                              >
                                <FiCopy className="w-4 h-4" />
                                {t('teacherLiveSession.copy')}
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm inline-flex items-center gap-1"
                                disabled={sendingLink}
                                onClick={() => sendSessionLinkToStudents(session)}
                              >
                                <FiSend className="w-4 h-4" />
                                {t('teacherLiveSession.send')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default TeacherLiveSession
