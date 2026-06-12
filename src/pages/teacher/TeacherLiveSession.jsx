import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import {
  courseService,
  meetingService,
  notificationService
} from '../../services/api'
import {
  generateJitsiRoomName,
  getCourseLiveRoomName,
  getJitsiExternalUrl,
  isJitsiMeeting,
  resolveJitsiRoomName
} from '../../lib/jitsi'
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
  duration_minutes: 60
}

const TeacherLiveSession = () => {
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

  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) || null,
    [courses, selectedCourseId]
  )

  const jitsiSessions = useMemo(
    () => sessions.filter((session) => isJitsiMeeting(session)),
    [sessions]
  )

  const buildSessionLinks = (session, courseId = selectedCourseId) => {
    const roomName = resolveJitsiRoomName(session, courseId)
    const jitsiUrl = roomName ? getJitsiExternalUrl(roomName) : ''
    const learnUrl = session?.id
      ? `/courses/${courseId}/learn?session=${session.id}`
      : `/courses/${courseId}/learn?session=live`

    return { roomName, jitsiUrl, learnUrl }
  }

  const copyText = async (text, label) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(label)
      window.setTimeout(() => setCopyFeedback(''), 2500)
    } catch {
      setError(isAr ? 'تعذر نسخ الرابط' : 'Could not copy the link')
    }
  }

  const sendSessionLinkToStudents = async (session, options = {}) => {
    const { silent = false } = options

    if (!selectedCourseId || !session) {
      setError(isAr ? 'اختر كورساً وجلسة أولاً' : 'Select a course and session first')
      return null
    }

    const { roomName, jitsiUrl, learnUrl } = buildSessionLinks(session)
    if (!jitsiUrl) {
      setError(isAr ? 'رابط Jitsi غير متاح' : 'Jitsi link is not available')
      return null
    }

    if (!silent) {
      setSendingLink(true)
      setError('')
      setSuccess('')
    }

    try {
      const sessionTitle = session.title || (isAr ? 'جلسة مباشرة' : 'Live session')
      const notifyResult = await notificationService.notifyEligibleStudents({
        course_id: selectedCourseId,
        title: isAr ? `دعوة لجلسة مباشرة: ${sessionTitle}` : `Live session invitation: ${sessionTitle}`,
        message: isAr
          ? `تمت دعوتك لجلسة مباشرة في "${selectedCourse?.title}".\n\nاضغط «دخول الجلسة» من الإشعار 🔔 للانضمام فوراً.\n\nرابط Jitsi:\n${jitsiUrl}`
          : `You are invited to a live session in "${selectedCourse?.title}".\n\nTap "Join session" in the notification bell to enter.\n\nJitsi link:\n${jitsiUrl}`,
        type: 'meeting',
        action_url: learnUrl
      })

      if (!silent) {
        const audienceText = Number(selectedCourse?.price || 0) > 0
          ? (isAr ? 'الذين دفعوا وتم قبول دفعهم' : 'with approved payment')
          : (isAr ? 'المسجلين في الكورس' : 'enrolled in the course')

        if ((notifyResult?.count ?? 0) === 0) {
          setError(
            isAr
              ? 'لم يُرسل الإشعار لأي طالب. تأكد أن الطلاب مسجّلون أو أن دفعاتهم مقبولة، ثم شغّل migration 029 في Supabase.'
              : 'No students received the notification. Ensure students are enrolled or have approved payments, and run migration 029 in Supabase.'
          )
        } else {
          setSuccess(
            isAr
              ? `تم إرسال رابط Jitsi إلى ${notifyResult.count} طالب/ة (${audienceText}).`
              : `Jitsi link sent to ${notifyResult.count} student(s) ${audienceText}.`
          )
        }
      }

      return notifyResult
    } catch (err) {
      if (!silent) {
        setError(err.message || (isAr ? 'فشل إرسال الرابط للطلاب' : 'Failed to send link to students'))
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
      setError(isAr ? 'اختر كورساً أولاً' : 'Select a course first')
      return
    }

    const sessionTitle = (titleOverride || form.title).trim() || (isAr ? 'جلسة مباشرة' : 'Live session')
    const scheduledAt = form.scheduled_at || new Date().toISOString().slice(0, 16)

    setSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const jitsiRoomName = getCourseLiveRoomName(selectedCourseId)
        || generateJitsiRoomName(selectedCourse?.title || 'course', sessionTitle)

      const meeting = await meetingService.createMeeting({
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
      })

      const resolvedMeeting = {
        ...meeting,
        jitsi_room_name: resolveJitsiRoomName(meeting, selectedCourseId)
      }

      const notifyResult = await sendSessionLinkToStudents(resolvedMeeting, { silent: true })

      setSuccess(
        (notifyResult?.count ?? 0) === 0
          ? (isAr
              ? 'تم فتح الجلسة، لكن لم يُرسل إشعار لأي طالب. سيظهر للطلاب تنبيه الجلسة المباشرة تلقائياً عند فتح الصفحة.'
              : 'Session opened, but no notification was sent. Students will still see a live session alert when they open the site.')
          : (isAr
              ? `تم فتح الجلسة وإرسال رابط Jitsi إلى ${notifyResult.count} طالب/ة.`
              : `Session opened and Jitsi link sent to ${notifyResult.count} student(s).`)
      )

      setForm(defaultForm)
      setActiveSession(resolvedMeeting)

      const refreshed = await meetingService.getMeetingsByCourse(selectedCourseId)
      setSessions(refreshed || [])
    } catch (err) {
      setError(err.message || (isAr ? 'فشل إنشاء الجلسة' : 'Failed to create session'))
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
      title: isAr ? 'جلسة مباشرة للكورس' : 'Course live session',
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
        setError(err.message || (isAr ? 'تعذر تحميل الكورسات' : 'Failed to load courses'))
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
        const data = await meetingService.getMeetingsByCourse(selectedCourseId)
        setSessions(data || [])
      } catch (err) {
        setError(err.message || (isAr ? 'تعذر تحميل الجلسات' : 'Failed to load sessions'))
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
    startLiveSession(true, isAr ? 'جلسة مباشرة' : 'Live session')
  }, [instantMode, loadingCourses, selectedCourseId, submitting, isAr])

  const renderShareLinkCard = (session, compact = false) => {
    const links = buildSessionLinks(session)
    if (!links.jitsiUrl) return null

    return (
      <div className={`rounded-lg border border-green-200 dark:border-green-800 bg-green-50/80 dark:bg-green-900/20 ${compact ? 'p-3' : 'p-4'} space-y-3`}>
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          {isAr ? 'رابط Jitsi للطلاب' : 'Jitsi link for students'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            className="input flex-1 text-sm bg-white dark:bg-dark-card"
            value={links.jitsiUrl}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm inline-flex items-center gap-2"
              onClick={() => copyText(links.jitsiUrl, isAr ? 'تم نسخ رابط Jitsi' : 'Jitsi link copied')}
            >
              <FiCopy className="w-4 h-4" />
              {isAr ? 'نسخ' : 'Copy'}
            </button>
            <a
              href={links.jitsiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm inline-flex items-center gap-2"
            >
              <FiExternalLink className="w-4 h-4" />
              {isAr ? 'فتح' : 'Open'}
            </a>
            <button
              type="button"
              className="btn btn-primary btn-sm inline-flex items-center gap-2"
              disabled={sendingLink}
              onClick={() => sendSessionLinkToStudents(session)}
            >
              {sendingLink ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
              {isAr ? 'إرسال للطلاب' : 'Send to students'}
            </button>
          </div>
        </div>
        {copyFeedback && (
          <p className="text-xs text-green-700 dark:text-green-300">{copyFeedback}</p>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-16 bg-secondary-50 dark:bg-dark-bg">
      <div className="container-custom max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-secondary-500 hover:text-primary-500 mb-2">
              <FiArrowLeft className="w-4 h-4" />
              {isAr ? 'العودة للوحة التحكم' : 'Back to dashboard'}
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold">
              {isAr ? 'جلسة Jitsi مباشرة' : 'Live Jitsi Session'}
            </h1>
            <p className="text-secondary-500 mt-1">
              {isAr
                ? 'أنشئ جلسة، انسخ رابط Jitsi، وأرسله للطلاب الذين دفعوا وتم قبول دفعهم.'
                : 'Create a session, copy the Jitsi link, and send it to students with approved payment.'}
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

        {activeSession?.jitsi_room_name && (
          <div className="card card-body space-y-4">
            <h2 className="text-lg font-bold">{activeSession.title}</h2>
            {renderShareLinkCard(activeSession)}
            <JitsiMeetingRoom
              roomName={activeSession.jitsi_room_name}
              displayName={user?.full_name || user?.email || 'Instructor'}
              isModerator
              onClose={() => setActiveSession(null)}
              language={language}
            />
          </div>
        )}

        <div className="card card-body space-y-4">
          <h2 className="text-lg font-bold">{isAr ? 'اختر الكورس' : 'Select course'}</h2>

          {loadingCourses ? (
            <div className="flex items-center gap-2 text-secondary-500">
              <FiLoader className="w-5 h-5 animate-spin" />
              {isAr ? 'جاري التحميل...' : 'Loading...'}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-secondary-500 mb-4">
                {isAr ? 'لا توجد كورسات بعد. أنشئ كورساً أولاً.' : 'No courses yet. Create a course first.'}
              </p>
              <Link to="/teacher/create-course" className="btn btn-primary">
                {isAr ? 'إنشاء كورس' : 'Create course'}
              </Link>
            </div>
          ) : (
            <select
              className="input"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">{isAr ? '-- اختر كورس --' : '-- Select course --'}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title} {Number(course.price || 0) > 0 ? `($${course.price})` : `(${isAr ? 'مجاني' : 'Free'})`}
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
                {isAr ? 'بدء Jitsi ومشاركة الرابط' : 'Start Jitsi & share link'}
              </h2>
              <p className="text-sm text-secondary-500">
                {isAr
                  ? 'يفتح الجلسة، ينشئ رابط Jitsi، ويرسله تلقائياً للطلاب الذين دفعوا الكورس.'
                  : 'Opens the session, creates a Jitsi link, and automatically sends it to paid students.'}
              </p>

              {selectedCourseId && renderShareLinkCard({
                id: null,
                title: isAr ? 'رابط الكورس المباشر' : 'Course live link',
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
                  {isAr ? 'فتح جلسة وإرسال الرابط' : 'Open session & send link'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary inline-flex items-center gap-2"
                  disabled={sendingLink}
                  onClick={handleSendCourseLiveLink}
                >
                  {sendingLink ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiSend className="w-4 h-4" />}
                  {isAr ? 'إرسال الرابط فقط' : 'Send link only'}
                </button>
              </div>

              <p className="text-sm text-secondary-500 flex items-center gap-2">
                <FiUsers className="w-4 h-4" />
                {Number(selectedCourse?.price || 0) > 0
                  ? (isAr ? 'يُرسل فقط للطلاب الذين دفعوا وتم قبول دفعهم.' : 'Sent only to students with approved payment.')
                  : (isAr ? 'يُرسل للطلاب المسجلين في الكورس.' : 'Sent to enrolled students.')}
              </p>
            </div>

            <div className="card card-body space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <FiVideo className="w-5 h-5 text-green-500" />
                {isAr ? 'جدولة جلسة Jitsi' : 'Schedule Jitsi session'}
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">{isAr ? 'عنوان الجلسة' : 'Session title'}</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={isAr ? 'مثال: مراجعة الدرس الأول' : 'Example: Lesson 1 review'}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">{isAr ? 'الوصف (اختياري)' : 'Description (optional)'}</label>
                  <textarea
                    className="input min-h-[90px]"
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={isAr ? 'ملاحظات للطلاب...' : 'Notes for students...'}
                  />
                </div>

                <div>
                  <label className="label">{isAr ? 'موعد الجلسة' : 'Scheduled time'}</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="label">{isAr ? 'المدة (دقيقة)' : 'Duration (minutes)'}</label>
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
                  {isAr ? 'جدولة وإرسال الرابط' : 'Schedule & send link'}
                </button>
              </div>
            </div>

            <div className="card card-body">
              <h2 className="text-lg font-bold mb-4">
                {isAr ? 'جلسات Jitsi لهذا الكورس' : 'Jitsi sessions for this course'}
              </h2>

              {loadingSessions ? (
                <div className="flex items-center gap-2 text-secondary-500">
                  <FiLoader className="w-5 h-5 animate-spin" />
                  {isAr ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : jitsiSessions.length === 0 ? (
                <p className="text-secondary-500">
                  {isAr ? 'لا توجد جلسات Jitsi بعد.' : 'No Jitsi sessions yet.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {jitsiSessions.map((session) => {
                    const links = buildSessionLinks(session)
                    return (
                      <div
                        key={session.id}
                        className="p-4 rounded-lg border border-secondary-200 dark:border-dark-border space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="font-semibold">{session.title}</div>
                            <div className="text-sm text-secondary-500 flex flex-wrap items-center gap-3 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <FiCalendar className="w-4 h-4" />
                                {session.scheduled_at
                                  ? new Date(session.scheduled_at).toLocaleString(isAr ? 'ar-EG' : 'en-US')
                                  : '-'}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <FiClock className="w-4 h-4" />
                                {session.duration_minutes || 60} {isAr ? 'د' : 'min'}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm inline-flex items-center gap-2"
                            onClick={() => setActiveSession({
                              ...session,
                              jitsi_room_name: resolveJitsiRoomName(session, selectedCourseId)
                            })}
                          >
                            <FiVideo className="w-4 h-4" />
                            {isAr ? 'بدء/انضمام' : 'Start / Join'}
                          </button>
                        </div>

                        {links.jitsiUrl && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              readOnly
                              className="input flex-1 text-xs sm:text-sm"
                              value={links.jitsiUrl}
                            />
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="btn btn-outline btn-sm inline-flex items-center gap-1"
                                onClick={() => copyText(links.jitsiUrl, isAr ? 'تم النسخ' : 'Copied')}
                              >
                                <FiCopy className="w-4 h-4" />
                                {isAr ? 'نسخ' : 'Copy'}
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary btn-sm inline-flex items-center gap-1"
                                disabled={sendingLink}
                                onClick={() => sendSessionLinkToStudents(session)}
                              >
                                <FiSend className="w-4 h-4" />
                                {isAr ? 'إرسال للطلاب' : 'Send'}
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
