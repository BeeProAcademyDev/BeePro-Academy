import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { courseService, enrollmentService, meetingService } from '../services/api'
import { paymentService } from '../services/paymentAPI'
import { getCourseLiveRoomName, getJitsiExternalUrl, getMeetingJoinTarget, normalizeMeetingRecord, pickJoinableMeeting } from '../lib/jitsi'
import { isStudentUser } from '../lib/roles'
import { requireInstructor } from '../lib/authGuards'
import CourseChat from '../components/chat/CourseChat'
import JitsiMeetingRoom from '../components/jitsi/JitsiMeetingRoom'
import {
  FiCalendar,
  FiClock,
  FiExternalLink,
  FiVideo,
  FiLock,
  FiAlertCircle,
  FiMessageCircle
} from 'react-icons/fi'

const CourseLearn = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { language } = useLanguage()
  const { user } = useAuth()

  const [course, setCourse] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accessDeniedReason, setAccessDeniedReason] = useState('')
  const [hasFullAccess, setHasFullAccess] = useState(false)
  const [activeTab, setActiveTab] = useState('sessions')
  const [activeJitsiRoom, setActiveJitsiRoom] = useState(null)
  const [refreshingMeetings, setRefreshingMeetings] = useState(false)
  const [joinError, setJoinError] = useState('')
  const jitsiPanelRef = useRef(null)

  useEffect(() => {
    if (searchParams.get('tab') === 'chat') {
      setActiveTab('chat')
    }
  }, [searchParams])

  const loadMeetings = async (courseId) => {
    const courseMeetings = await meetingService.getMeetingsByCourse(courseId)
    setMeetings(courseMeetings || [])
    return courseMeetings || []
  }

  const isTeacherOrAdmin = useMemo(() => requireInstructor(user), [user])

  const isCourseInstructor = course?.instructor_id === user?.id

  const canUseChat = useMemo(() => {
    if (!user?.id) return false
    if (isTeacherOrAdmin || isCourseInstructor) return true
    return isStudentUser(user)
  }, [user, isTeacherOrAdmin, isCourseInstructor])

  const primaryMeeting = useMemo(
    () => pickJoinableMeeting(meetings, id),
    [meetings, id]
  )

  const resolveJoinTarget = (meeting) => {
    const joinTarget = getMeetingJoinTarget(meeting, id)
    if (joinTarget) return joinTarget

    const roomName = getCourseLiveRoomName(id)
    if (roomName) {
      return { type: 'jitsi', roomName }
    }

    return null
  }

  const openJitsiSession = (meeting) => {
    setJoinError('')
    const normalized = normalizeMeetingRecord(meeting || {})
    const joinTarget = resolveJoinTarget(normalized)

    if (!joinTarget) {
      setJoinError(language === 'ar' ? 'تعذر تجهيز رابط الجلسة.' : 'Could not prepare the session link.')
      return
    }

    if (joinTarget.type === 'external') {
      window.open(joinTarget.url, '_blank', 'noopener,noreferrer')
      return
    }

    setActiveTab('sessions')
    setActiveJitsiRoom({
      ...normalized,
      title: normalized.title || (language === 'ar' ? 'جلسة مباشرة' : 'Live session'),
      jitsi_room_name: joinTarget.roomName
    })

    window.setTimeout(() => {
      jitsiPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const joinLiveNow = () => {
    if (primaryMeeting) {
      openJitsiSession(primaryMeeting)
      return
    }

    openJitsiSession({
      id: null,
      title: language === 'ar' ? 'جلسة مباشرة' : 'Live session',
      jitsi_room_name: getCourseLiveRoomName(id),
      platform: 'jitsi'
    })
  }

  useEffect(() => {
    const load = async () => {
      if (!id || !user?.id) return

      setLoading(true)
      setError('')
      setAccessDeniedReason('')
      setHasFullAccess(false)

      try {
        const courseData = await courseService.getCourseById(id)
        if (!courseData) {
          setError(language === 'ar' ? 'تعذر العثور على الدورة' : 'Course not found')
          return
        }

        setCourse(courseData)

        if (isTeacherOrAdmin || courseData.instructor_id === user.id) {
          await loadMeetings(id)
          setHasFullAccess(true)
          return
        }

        const enrolled = await enrollmentService.isEnrolled(id)
        const isPaidCourse = Number(courseData.price || 0) > 0
        const hasApprovedPayment = isPaidCourse
          ? await paymentService.hasApprovedPaymentForCourse(user.id, id)
          : false
        const hasCourseAccess = enrolled || hasApprovedPayment

        if (!hasCourseAccess) {
          setAccessDeniedReason(
            language === 'ar'
              ? isPaidCourse
                ? 'الجلسات المباشرة متاحة بعد قبول الدفع. الدردشة مع المدرس متاحة الآن.'
                : 'الجلسات المباشرة للمسجّلين في الدورة. الدردشة مع المدرس متاحة الآن.'
              : isPaidCourse
                ? 'Live sessions require approved payment. Chat with your instructor is available now.'
                : 'Live sessions are for enrolled students. Chat with your instructor is available now.'
          )
          return
        }

        await loadMeetings(id)
        setHasFullAccess(true)
      } catch (err) {
        console.error('Failed to load learning page:', err)
        setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء تحميل الصفحة' : 'Failed to load learning page'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, user?.id, language, isTeacherOrAdmin])

  useEffect(() => {
    if (!hasFullAccess || !id || activeTab !== 'sessions') return undefined

    const pollMeetings = async () => {
      try {
        await loadMeetings(id)
      } catch (err) {
        console.error('Failed to refresh meetings:', err)
      }
    }

    const intervalId = window.setInterval(pollMeetings, 15000)
    return () => window.clearInterval(intervalId)
  }, [hasFullAccess, id, activeTab])

  const handleRefreshMeetings = async (autoJoin = false) => {
    if (!id) return
    setRefreshingMeetings(true)
    try {
      const refreshed = await loadMeetings(id)
      if (autoJoin) {
        const latest = pickJoinableMeeting(refreshed, id)
        if (latest) {
          openJitsiSession(latest)
        } else {
          joinLiveNow()
        }
      }
    } catch (err) {
      console.error('Failed to refresh meetings:', err)
    } finally {
      setRefreshingMeetings(false)
    }
  }

  useEffect(() => {
    if (!hasFullAccess || activeJitsiRoom) return

    const sessionParam = searchParams.get('session')
    if (!sessionParam) return

    setActiveTab('sessions')

    if (sessionParam === 'live') {
      const meeting = pickJoinableMeeting(meetings, id)
      if (meeting) {
        openJitsiSession(meeting)
      } else {
        joinLiveNow()
      }
      return
    }

    const meeting = meetings.find((item) => String(item.id) === sessionParam)
    if (meeting) {
      openJitsiSession(meeting)
    }
  }, [hasFullAccess, meetings, searchParams, id, activeJitsiRoom])

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const renderMeetingCard = (meeting) => {
    const normalized = normalizeMeetingRecord(meeting)
    const joinTarget = resolveJoinTarget(normalized)
    const useJitsi = joinTarget?.type === 'jitsi'
    const canJoinJitsi = useJitsi && !!joinTarget?.roomName
    const canJoinMeet = joinTarget?.type === 'external' && !!joinTarget.url

    return (
    <div key={meeting.id || normalized.title} className="p-4 rounded-lg border border-secondary-200 dark:border-dark-border bg-white dark:bg-dark-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{meeting.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${useJitsi ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {useJitsi ? 'Jitsi' : 'Google Meet'}
            </span>
            {meeting.status === 'live' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                {language === 'ar' ? 'مباشر' : 'Live'}
              </span>
            )}
          </div>
        </div>

        {canJoinJitsi && (
          <button
            type="button"
            className="shrink-0 w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 hover:scale-105 transition-all shadow-md"
            onClick={() => openJitsiSession(meeting)}
            title={language === 'ar' ? 'انضم للجلسة المباشرة' : 'Join live session'}
            aria-label={language === 'ar' ? 'انضم للجلسة المباشرة' : 'Join live session'}
          >
            <FiVideo className="w-6 h-6" />
          </button>
        )}

        {canJoinMeet && (
          <a
            href={joinTarget.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-12 h-12 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 hover:scale-105 transition-all shadow-md"
            title={language === 'ar' ? 'انضم إلى الجلسة' : 'Join meeting'}
            aria-label={language === 'ar' ? 'انضم إلى الجلسة' : 'Join meeting'}
          >
            <FiVideo className="w-6 h-6" />
          </a>
        )}
      </div>
      {meeting.description && (
        <p className="text-sm text-secondary-500 mb-3">{meeting.description}</p>
      )}
      <div className="flex flex-wrap items-center gap-4 text-sm text-secondary-600 dark:text-secondary-400 mb-3">
        <span className="inline-flex items-center gap-1">
          <FiCalendar className="w-4 h-4" />
          {meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US') : '-'}
        </span>
        <span className="inline-flex items-center gap-1">
          <FiClock className="w-4 h-4" />
          {meeting.duration_minutes || 0} {language === 'ar' ? 'دقيقة' : 'min'}
        </span>
      </div>

      <button
        type="button"
        className="btn btn-primary inline-flex items-center gap-2"
        onClick={() => openJitsiSession(meeting)}
      >
        <FiVideo className="w-4 h-4" />
        {language === 'ar' ? 'الانضمام للجلسة المباشرة' : 'Join live session'}
      </button>
    </div>
  )
  }
  return (
    <div className={`min-h-screen pt-20 bg-secondary-50 dark:bg-dark-bg ${hasFullAccess && !activeJitsiRoom && activeTab === 'sessions' ? 'pb-28' : 'pb-10'}`}>
      <div className="container-custom space-y-6">
        <div className="card card-body">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {course?.title || (language === 'ar' ? 'صفحة التعلم' : 'Learning Page')}
          </h1>
          <p className="text-secondary-500">
            {language === 'ar'
              ? 'جلسات مباشرة عبر Jitsi أو Google Meet، ودردشة فورية مع المدرس.'
              : 'Live sessions via Jitsi or Google Meet, and real-time chat with your instructor.'}
          </p>
        </div>

        {error && (
          <div className="card card-body border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800">
            <div className="flex items-center gap-2">
              <FiAlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {accessDeniedReason && !error && !canUseChat && (
          <div className="card card-body border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <FiLock className="w-5 h-5" />
              <span>{accessDeniedReason}</span>
            </div>
            <div className="mt-4">
              <Link to={`/courses/${id}`} className="btn btn-primary">
                {language === 'ar' ? 'العودة إلى صفحة الدورة' : 'Back to course page'}
              </Link>
            </div>
          </div>
        )}

        {(canUseChat || hasFullAccess) && !error && (
          <>
            {accessDeniedReason && !hasFullAccess && (
              <div className="card card-body border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800">
                <div className="flex items-center gap-2">
                  <FiLock className="w-5 h-5" />
                  <span>{accessDeniedReason}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 border-b border-secondary-200 dark:border-dark-border">
              <button
                type="button"
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'sessions' ? 'border-primary-500 text-primary-500' : 'border-transparent text-secondary-500'}`}
                onClick={() => setActiveTab('sessions')}
              >
                <span className="inline-flex items-center gap-2">
                  <FiVideo className="w-4 h-4" />
                  {language === 'ar' ? 'الجلسات المباشرة' : 'Live Sessions'}
                </span>
              </button>
              <button
                type="button"
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'chat' ? 'border-primary-500 text-primary-500' : 'border-transparent text-secondary-500'}`}
                onClick={() => setActiveTab('chat')}
              >
                <span className="inline-flex items-center gap-2">
                  <FiMessageCircle className="w-4 h-4" />
                  {language === 'ar' ? 'الدردشة' : 'Chat'}
                </span>
              </button>
            </div>

            {activeTab === 'sessions' && (
              <div className="space-y-6">
                {!hasFullAccess ? (
                  <div className="card card-body text-center py-10">
                    <FiLock className="w-10 h-10 mx-auto text-amber-500 mb-3" />
                    <p className="text-secondary-600 dark:text-secondary-400 mb-4">{accessDeniedReason}</p>
                    <Link to={`/courses/${id}`} className="btn btn-primary">
                      {language === 'ar' ? 'الذهاب لصفحة الدورة والدفع' : 'Go to course page'}
                    </Link>
                  </div>
                ) : (
              <>
                {joinError && (
                  <div className="card card-body border border-red-200 bg-red-50 text-red-700 dark:bg-red-900/20 dark:border-red-800">
                    {joinError}
                  </div>
                )}

                {hasFullAccess && !activeJitsiRoom && (
                  <div className="card card-body border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                          {primaryMeeting
                            ? (language === 'ar' ? 'جلسة مباشرة متاحة الآن' : 'Live session available')
                            : (language === 'ar' ? 'الجلسات المباشرة مع المدرس' : 'Live sessions with your instructor')}
                        </p>
                        {primaryMeeting ? (
                          <>
                            <h2 className="text-xl font-bold">{primaryMeeting.title}</h2>
                            <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                              {primaryMeeting.scheduled_at
                                ? new Date(primaryMeeting.scheduled_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')
                                : ''}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-secondary-600 dark:text-secondary-400">
                            {language === 'ar'
                              ? 'اضغط الزر للدخول إلى غرفة الجلسة مع المدرس.'
                              : 'Click the button to enter the live room with your instructor.'}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          className="btn btn-primary inline-flex items-center justify-center gap-2 text-lg px-8 py-4"
                          onClick={joinLiveNow}
                        >
                          <FiVideo className="w-6 h-6" />
                          {language === 'ar' ? 'الانضمام للجلسة الآن' : 'Join Session Now'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline inline-flex items-center justify-center gap-2 px-6 py-4"
                          onClick={() => handleRefreshMeetings(false)}
                          disabled={refreshingMeetings}
                        >
                          {refreshingMeetings
                            ? (language === 'ar' ? 'تحديث...' : 'Refreshing...')
                            : (language === 'ar' ? 'تحديث' : 'Refresh')}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeJitsiRoom && (
                  <div ref={jitsiPanelRef} className="card card-body">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <h2 className="text-lg font-bold">{activeJitsiRoom.title}</h2>
                      <a
                        href={getJitsiExternalUrl(activeJitsiRoom.jitsi_room_name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm inline-flex items-center gap-2"
                      >
                        <FiExternalLink className="w-4 h-4" />
                        {language === 'ar' ? 'فتح في نافذة جديدة' : 'Open in new tab'}
                      </a>
                    </div>
                    <JitsiMeetingRoom
                      roomName={activeJitsiRoom.jitsi_room_name}
                      displayName={user?.full_name || user?.email || 'User'}
                      isModerator={isCourseInstructor || isTeacherOrAdmin}
                      onClose={() => setActiveJitsiRoom(null)}
                      language={language}
                    />
                  </div>
                )}

                <div className="card card-body">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <FiVideo className="w-5 h-5 text-green-500" />
                    {language === 'ar' ? 'الجلسات المباشرة' : 'Live Sessions'}
                  </h2>
                  {meetings.length === 0 ? (
                    <p className="text-secondary-500">
                      {language === 'ar'
                        ? 'لا توجد جلسات حالياً. اضغط «البحث عن جلسة مباشرة» في الأعلى أو انتظر إشعار المدرس.'
                        : 'No sessions yet. Click "Find Live Session" above or wait for your instructor notification.'}
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {meetings.map((meeting) => renderMeetingCard(meeting))}
                    </div>
                  )}
                </div>
              </>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="card card-body p-0 overflow-hidden">
                <CourseChat
                  courseId={id}
                  instructorId={course?.instructor_id}
                  user={user}
                  language={language}
                  hasAccess={canUseChat}
                />
              </div>
            )}
          </>
        )}

        {hasFullAccess && !activeJitsiRoom && activeTab === 'sessions' && (
          <div className="fixed bottom-0 inset-x-0 z-50 p-4 bg-white/95 dark:bg-dark-card/95 border-t border-secondary-200 dark:border-dark-border shadow-lg backdrop-blur-sm">
            <button
              type="button"
              className="btn btn-primary w-full inline-flex items-center justify-center gap-2 text-lg py-4"
              onClick={joinLiveNow}
            >
              <FiVideo className="w-6 h-6" />
              {language === 'ar' ? 'الانضمام للجلسة المباشرة' : 'Join Live Session'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseLearn
