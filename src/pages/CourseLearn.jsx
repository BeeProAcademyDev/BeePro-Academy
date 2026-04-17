import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { courseService, enrollmentService, meetingService } from '../services/api'
import { paymentService } from '../services/paymentAPI'
import {
  FiCalendar,
  FiClock,
  FiExternalLink,
  FiVideo,
  FiLock,
  FiAlertCircle
} from 'react-icons/fi'

const CourseLearn = () => {
  const { id } = useParams()
  const { language } = useLanguage()
  const { user } = useAuth()

  const [course, setCourse] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [accessDeniedReason, setAccessDeniedReason] = useState('')

  const isTeacherOrAdmin = useMemo(() => (
    user?.role === 'teacher' || user?.role === 'instructor' || user?.role === 'admin'
  ), [user?.role])

  useEffect(() => {
    const load = async () => {
      if (!id || !user?.id) return

      setLoading(true)
      setError('')
      setAccessDeniedReason('')

      try {
        const courseData = await courseService.getCourseById(id)
        if (!courseData) {
          setError(language === 'ar' ? 'تعذر العثور على الدورة' : 'Course not found')
          return
        }

        setCourse(courseData)

        // Teacher/Admin or course instructor always has access.
        if (isTeacherOrAdmin || courseData.instructor_id === user.id) {
          const allMeetings = await meetingService.getMeetingsByCourse(id)
          setMeetings(allMeetings || [])
          return
        }

        const enrolled = await enrollmentService.isEnrolled(id)
        if (!enrolled) {
          setAccessDeniedReason(
            language === 'ar'
              ? 'رابط الجلسة متاح فقط للطلاب المسجلين في الدورة.'
              : 'Meeting links are only available to students enrolled in this course.'
          )
          return
        }

        const isPaidCourse = Number(courseData.price || 0) > 0

        if (isPaidCourse) {
          const hasApprovedPayment = await paymentService.hasApprovedPaymentForCourse(user.id, id)
          if (!hasApprovedPayment) {
            setAccessDeniedReason(
              language === 'ar'
                ? 'رابط Google Meet يظهر فقط بعد اعتماد دفع الدورة.'
                : 'Google Meet links are visible only after your course payment is approved.'
            )
            return
          }
        }

        const allowedMeetings = await meetingService.getMeetingsByCourse(id)
        setMeetings(allowedMeetings || [])
      } catch (err) {
        console.error('Failed to load learning page:', err)
        setError(err.message || (language === 'ar' ? 'حدث خطأ أثناء تحميل الصفحة' : 'Failed to load learning page'))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, user?.id, language, isTeacherOrAdmin])

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-10 bg-secondary-50 dark:bg-dark-bg">
      <div className="container-custom space-y-6">
        <div className="card card-body">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {course?.title || (language === 'ar' ? 'صفحة التعلم' : 'Learning Page')}
          </h1>
          <p className="text-secondary-500">
            {language === 'ar'
              ? 'روابط الجلسات المباشرة تظهر للطلاب الذين تم اعتماد دفعهم في الدورات المدفوعة.'
              : 'Live session links are visible only to students with approved payment for paid courses.'}
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

        {accessDeniedReason && !error && (
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

        {!accessDeniedReason && !error && (
          <div className="card card-body">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FiVideo className="w-5 h-5 text-primary-500" />
              {language === 'ar' ? 'جلسات Google Meet' : 'Google Meet Sessions'}
            </h2>

            {meetings.length === 0 ? (
              <p className="text-secondary-500">
                {language === 'ar' ? 'لا توجد جلسات مجدولة حالياً.' : 'No meetings are scheduled yet.'}
              </p>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting) => (
                  <div key={meeting.id} className="p-4 rounded-lg border border-secondary-200 dark:border-dark-border bg-white dark:bg-dark-card">
                    <h3 className="font-semibold mb-2">{meeting.title}</h3>
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

                    {meeting.meet_link ? (
                      <a
                        href={meeting.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary inline-flex items-center gap-2"
                      >
                        <FiExternalLink className="w-4 h-4" />
                        {language === 'ar' ? 'الانضمام إلى الجلسة' : 'Join meeting'}
                      </a>
                    ) : (
                      <p className="text-sm text-secondary-500">
                        {language === 'ar' ? 'رابط الجلسة غير متاح بعد.' : 'Meeting link is not available yet.'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CourseLearn
