import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiMessageCircle, FiX } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { isStudentUser, shouldShowStudentChatBell, resolveUserRole } from '../../lib/roles'
import { enrollmentService, notificationService, chatService } from '../../services/api'
import { paymentService } from '../../services/paymentAPI'

const isChatNotification = (notification) =>
  notification?.action_url?.includes('tab=chat')
  || /رسالة|message|chat/i.test(`${notification?.title || ''} ${notification?.message || ''}`)

const StudentChatBell = () => {
  const { user, isAuthenticated } = useAuth()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const isAr = language === 'ar'
  const panelRef = useRef(null)

  const [open, setOpen] = useState(false)
  const [courses, setCourses] = useState([])
  const [chatAlerts, setChatAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  const unreadCount = Math.max(
    chatAlerts.filter((item) => !item.is_read).length,
    courses.reduce((sum, course) => sum + (course.unread_count || 0), 0)
  )

  const loadChatData = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const [inbox, enrollments, payments, notifications] = await Promise.all([
        chatService.getStudentChatInbox().catch(() => []),
        enrollmentService.getUserEnrollments().catch(() => []),
        paymentService.getStudentPaymentSubmissions(user.id).catch(() => []),
        notificationService.getUserNotifications(user.id, { limit: 20 }).catch(() => [])
      ])

      const courseMap = new Map()

      ;(inbox || []).forEach((row) => {
        if (row.course_id) {
          courseMap.set(row.course_id, {
            id: row.course_id,
            title: row.title || (isAr ? 'كورس' : 'Course'),
            thumbnail_url: row.thumbnail_url,
            message_count: row.message_count || 0,
            unread_count: row.unread_count || 0,
            last_message_at: row.last_message_at
          })
        }
      })

      ;(enrollments || []).forEach((row) => {
        if (row.course?.id) {
          const existing = courseMap.get(row.course.id)
          courseMap.set(row.course.id, {
            id: row.course.id,
            title: row.course.title,
            thumbnail_url: row.course.thumbnail_url,
            message_count: existing?.message_count || 0,
            unread_count: existing?.unread_count || 0,
            last_message_at: existing?.last_message_at
          })
        }
      })

      ;(payments || []).forEach((row) => {
        const courseId = row.course_id || row.courses?.id
        if (courseId) {
          const existing = courseMap.get(courseId)
          courseMap.set(courseId, {
            id: courseId,
            title: row.courses?.title || existing?.title || (isAr ? 'كورس' : 'Course'),
            thumbnail_url: row.courses?.thumbnail_url || existing?.thumbnail_url,
            message_count: existing?.message_count || 0,
            unread_count: existing?.unread_count || 0,
            last_message_at: existing?.last_message_at
          })
        }
      })

      const sortedCourses = Array.from(courseMap.values()).sort((a, b) => {
        if ((b.message_count || 0) !== (a.message_count || 0)) {
          return (b.message_count || 0) - (a.message_count || 0)
        }
        return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
      })

      setCourses(sortedCourses)
      setChatAlerts((notifications || []).filter(isChatNotification))
    } catch (err) {
      console.error('Failed to load chat bell data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7427/ingest/558f5932-6500-4722-9bbf-9e5e1306baf3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45e2a3'},body:JSON.stringify({sessionId:'45e2a3',location:'StudentChatBell.jsx:visibility',message:'chat bell visibility check',data:{isAuthenticated,rawRole:user?.role,resolvedRole:resolveUserRole(user),isStudentUser:isStudentUser(user),shouldShow:shouldShowStudentChatBell(user),hasUserId:!!user?.id},hypothesisId:'F',timestamp:Date.now(),runId:'pre-fix'})}).catch(()=>{});
    // #endregion
    if (!isAuthenticated || !shouldShowStudentChatBell(user)) return
    loadChatData()
    const pollId = window.setInterval(loadChatData, 10000)
    return () => window.clearInterval(pollId)
  }, [isAuthenticated, user?.id, user?.role])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const openChat = async (courseId, notification = null) => {
    if (notification?.id && !notification.is_read) {
      await notificationService.markAsRead(notification.id).catch(() => {})
    }
    setOpen(false)
    navigate(`/courses/${courseId}/learn?tab=chat`)
  }

  if (!isAuthenticated || !shouldShowStudentChatBell(user)) return null

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev)
          if (!open) loadChatData()
        }}
        className="btn-ghost p-2 rounded-lg relative"
        title={isAr ? 'دردشة المدرس' : 'Instructor chat'}
        aria-label={isAr ? 'دردشة المدرس' : 'Instructor chat'}
      >
        <FiMessageCircle className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white dark:bg-dark-card rounded-xl shadow-xl border border-secondary-100 dark:border-dark-border overflow-hidden z-[60]"
          style={{ right: 0 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100 dark:border-dark-border">
            <h3 className="font-semibold text-sm">
              {isAr ? 'دردشة المدرس' : 'Instructor chat'}
            </h3>
            <button type="button" className="btn-ghost p-1 rounded" onClick={() => setOpen(false)}>
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-secondary-500 text-center">
                {isAr ? 'جاري التحميل...' : 'Loading...'}
              </p>
            ) : (
              <>
                {chatAlerts.length > 0 && (
                  <div className="px-4 py-3 border-b border-secondary-100 dark:border-dark-border">
                    <p className="text-xs font-semibold text-primary-600 mb-2">
                      {isAr ? 'رسائل جديدة' : 'New messages'}
                    </p>
                    {chatAlerts.slice(0, 5).map((alert) => {
                      const courseId = alert.course_id
                        || alert.action_url?.match(/\/courses\/([^/]+)/)?.[1]
                      return (
                        <button
                          key={alert.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 rounded-lg mb-2 last:mb-0 ${
                            alert.is_read ? 'bg-secondary-50 dark:bg-dark-border' : 'bg-primary-50 dark:bg-primary-900/20'
                          }`}
                          onClick={() => courseId && openChat(courseId, alert)}
                        >
                          <p className="text-sm font-medium">{alert.title}</p>
                          <p className="text-xs text-secondary-500 line-clamp-2 mt-0.5">{alert.message}</p>
                        </button>
                      )
                    })}
                  </div>
                )}

                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-secondary-500 mb-2">
                    {isAr ? 'افتح دردشة كورس' : 'Open course chat'}
                  </p>
                  {courses.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-secondary-500 mb-3">
                        {isAr
                          ? 'تصفّح الكورسات وافتح «الدردشة مع المدرس» من صفحة أي كورس.'
                          : 'Browse courses and use "Chat with instructor" on any course page.'}
                      </p>
                      <Link to="/courses" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
                        {isAr ? 'تصفح الكورسات' : 'Browse courses'}
                      </Link>
                    </div>
                  ) : (
                    courses.map((course) => (
                      <button
                        key={course.id}
                        type="button"
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary-50 dark:hover:bg-dark-border mb-1"
                        onClick={() => openChat(course.id)}
                      >
                        <FiMessageCircle className="w-4 h-4 text-primary-500 shrink-0" />
                        <span className="text-sm font-medium truncate flex-1 text-left">{course.title}</span>
                        {(course.unread_count > 0 || course.message_count > 0) && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {course.unread_count > 0 ? course.unread_count : course.message_count}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentChatBell
