import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiBell, FiLoader, FiVideo, FiX } from 'react-icons/fi'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { notificationService } from '../../services/api'
import supabase from '../../lib/supabase'

const extractJitsiUrl = (message = '') => {
  const match = message.match(/https:\/\/[^\s]+/i)
  return match?.[0] || null
}

const getJoinPath = (notification) => {
  if (notification?.action_url) {
    return notification.action_url.startsWith('/')
      ? notification.action_url
      : `/${notification.action_url}`
  }
  if (notification?.course_id) {
    return `/courses/${notification.course_id}/learn?session=live`
  }
  return null
}

const isMeetingInvite = (notification) =>
  notification?.type === 'meeting' ||
  notification?._source === 'live_meeting' ||
  /جلسة|live session/i.test(`${notification?.title || ''} ${notification?.message || ''}`)

const StudentNotificationsBell = () => {
  const { user, isAuthenticated } = useAuth()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const isAr = language === 'ar'
  const panelRef = useRef(null)
  const knownIdsRef = useRef(new Set())
  const initialLoadDoneRef = useRef(false)
  const alertTimerRef = useRef(null)

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentAlert, setRecentAlert] = useState(null)

  const showAlert = useCallback((notification) => {
    if (!notification?.id) return

    setRecentAlert(notification)
    if (alertTimerRef.current) {
      window.clearTimeout(alertTimerRef.current)
    }
    alertTimerRef.current = window.setTimeout(() => {
      setRecentAlert((current) => (current?.id === notification.id ? null : current))
    }, 15000)
  }, [])

  const handleIncomingNotification = useCallback((notification, options = {}) => {
    const { showPopup = true } = options
    if (!notification?.id) return

    const isNew = !knownIdsRef.current.has(notification.id)
    knownIdsRef.current.add(notification.id)

    setNotifications((prev) => {
      const withoutDuplicate = prev.filter((item) => item.id !== notification.id)
      return [notification, ...withoutDuplicate].slice(0, 15)
    })

    if (!notification.is_read && isNew) {
      setUnreadCount((prev) => prev + 1)
    }

    if (isNew && showPopup && isMeetingInvite(notification)) {
      showAlert(notification)
    }
  }, [showAlert])

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      const [items, count] = await Promise.all([
        notificationService.getSessionInvites(user.id, { limit: 15 }),
        notificationService.getUnreadCount(user.id).catch(() => 0)
      ])

      const nextItems = items || []
      const liveCount = nextItems.filter((item) => !item.is_read).length
      setNotifications(nextItems)
      setUnreadCount(Math.max(count || 0, liveCount))

      if (!initialLoadDoneRef.current) {
        nextItems.forEach((item) => knownIdsRef.current.add(item.id))
        initialLoadDoneRef.current = true

        const latestInvite = nextItems.find((item) => !item.is_read && isMeetingInvite(item))
        if (latestInvite) {
          showAlert(latestInvite)
        }
      } else {
        nextItems.forEach((item) => {
          if (!knownIdsRef.current.has(item.id)) {
            handleIncomingNotification(item)
          }
        })
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, handleIncomingNotification, showAlert])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([])
      setUnreadCount(0)
      setRecentAlert(null)
      knownIdsRef.current = new Set()
      initialLoadDoneRef.current = false
      return undefined
    }

    loadNotifications()

    if (!supabase) return undefined

    const channel = supabase
      .channel(`student-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleIncomingNotification(payload.new)
        }
      )
      .subscribe()

    const pollId = window.setInterval(loadNotifications, 8000)

    return () => {
      supabase.removeChannel(channel)
      window.clearInterval(pollId)
      if (alertTimerRef.current) {
        window.clearTimeout(alertTimerRef.current)
      }
    }
  }, [isAuthenticated, user?.id, loadNotifications, handleIncomingNotification])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleJoin = async (notification) => {
    const joinPath = getJoinPath(notification)
    if (!joinPath) return

    const isSynthetic = String(notification.id || '').startsWith('live-meeting-')

    if (!isSynthetic) {
      try {
        await notificationService.markAsRead(notification.id)
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        )
        setUnreadCount((prev) => Math.max(0, prev - (notification.is_read ? 0 : 1)))
      } catch (err) {
        console.error('Failed to mark notification as read:', err)
      }
    } else {
      knownIdsRef.current.add(notification.id)
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    setRecentAlert(null)
    setOpen(false)
    navigate(joinPath)
  }

  if (!isAuthenticated || !user?.id) {
    // #region agent log
    fetch('http://127.0.0.1:7427/ingest/558f5932-6500-4722-9bbf-9e5e1306baf3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45e2a3'},body:JSON.stringify({sessionId:'45e2a3',location:'StudentNotificationsBell.jsx:visibility',message:'notifications bell hidden',data:{isAuthenticated,hasUserId:!!user?.id},hypothesisId:'G',timestamp:Date.now(),runId:'pre-fix'})}).catch(()=>{});
    // #endregion
    return null
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev)
          if (!open) loadNotifications()
        }}
        className="btn-ghost p-2 rounded-lg relative"
        title={isAr ? 'الإشعارات' : 'Notifications'}
        aria-label={isAr ? 'الإشعارات' : 'Notifications'}
      >
        <FiBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {recentAlert && (
        <div
          className="absolute top-full mt-2 w-[min(20rem,calc(100vw-2rem))] z-[70] animate-slide-down"
          style={{ right: 0 }}
        >
          <div className="rounded-xl border-2 border-primary-400 dark:border-primary-600 bg-white dark:bg-dark-card shadow-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-300">
                  {isAr ? '🔴 جلسة مباشرة الآن' : '🔴 Live session now'}
                </p>
                <p className="font-semibold text-sm mt-1 truncate">
                  {recentAlert.title?.includes('Live session')
                    ? (isAr ? recentAlert.title.replace('Live session invitation:', 'دعوة لجلسة مباشرة:') : recentAlert.title)
                    : recentAlert.title}
                </p>
                <p className="text-xs text-secondary-500 mt-1 line-clamp-2">
                  {isAr
                    ? 'المعلم يبث الآن. اضغط للدخول إلى الجلسة.'
                    : 'Your teacher is live. Tap below to join.'}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost p-1 rounded shrink-0"
                onClick={() => setRecentAlert(null)}
                aria-label={isAr ? 'إغلاق' : 'Close'}
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            {getJoinPath(recentAlert) && (
              <button
                type="button"
                className="btn btn-primary btn-sm w-full mt-3 inline-flex items-center justify-center gap-1"
                onClick={() => handleJoin(recentAlert)}
              >
                <FiVideo className="w-4 h-4" />
                {isAr ? 'دخول الجلسة الآن' : 'Join session now'}
              </button>
            )}
          </div>
        </div>
      )}

      {open && (
        <div
          className="absolute top-full mt-2 w-[min(22rem,calc(100vw-2rem))] bg-white dark:bg-dark-card rounded-xl shadow-xl border border-secondary-100 dark:border-dark-border overflow-hidden z-[60]"
          style={{ right: 0 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-100 dark:border-dark-border">
            <h3 className="font-semibold text-sm">
              {isAr ? 'إشعارات الجلسات المباشرة' : 'Live session notifications'}
            </h3>
            <button type="button" className="btn-ghost p-1 rounded" onClick={() => setOpen(false)}>
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-secondary-500">
                <FiLoader className="w-5 h-5 animate-spin" />
                {isAr ? 'جاري التحميل...' : 'Loading...'}
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-sm text-secondary-500 text-center">
                {isAr ? 'لا توجد جلسات مباشرة الآن' : 'No live sessions right now'}
              </p>
            ) : (
              notifications.map((notification) => {
                const joinPath = getJoinPath(notification)
                const jitsiUrl = extractJitsiUrl(notification.message)
                const isLiveNow = notification._source === 'live_meeting'

                return (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-secondary-100 dark:border-dark-border last:border-b-0 ${
                      notification.is_read ? '' : 'bg-primary-50/60 dark:bg-primary-900/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isLiveNow && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                          LIVE
                        </span>
                      )}
                      <p className="font-medium text-sm">{notification.title}</p>
                    </div>
                    <p className="text-xs text-secondary-500 mt-1 line-clamp-3 whitespace-pre-wrap">
                      {notification.message}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {joinPath && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm inline-flex items-center gap-1"
                          onClick={() => handleJoin(notification)}
                        >
                          <FiVideo className="w-4 h-4" />
                          {isAr ? 'دخول الجلسة' : 'Join session'}
                        </button>
                      )}
                      {jitsiUrl && (
                        <a
                          href={jitsiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm inline-flex items-center gap-1"
                          onClick={() => {
                            if (!String(notification.id).startsWith('live-meeting-')) {
                              notificationService.markAsRead(notification.id)
                            }
                          }}
                        >
                          {isAr ? 'رابط Jitsi' : 'Jitsi link'}
                        </a>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="px-4 py-3 border-t border-secondary-100 dark:border-dark-border bg-secondary-50/50 dark:bg-dark-border/30">
            <Link
              to="/dashboard"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              onClick={() => setOpen(false)}
            >
              {isAr ? 'عرض في لوحة التحكم' : 'View in dashboard'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentNotificationsBell
