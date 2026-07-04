import { useState, useEffect, useRef, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { formatStoredAmount } from '../lib/currency'
import CourseCard from '../components/ui/CourseCard'
import CourseChat from '../components/chat/CourseChat'
import HomeworkPanel from '../components/dashboard/HomeworkPanel'
import { courseService, enrollmentService, notificationService, chatService } from '../services/api'
import { paymentService, PAYMENT_TYPES } from '../services/paymentAPI'
import UserManagement from './admin/UserManagement'
import AdminCRM from './admin/AdminCRM'
import { getRoleLabel, isAdmin as isAdminRole, isPendingInstructor, shouldShowStudentChatBell, resolveUserRole } from '../lib/roles'
import {
  FiBook,
  FiAward,
  FiClock,
  FiTrendingUp,
  FiUser,
  FiSettings,
  FiBookOpen,
  FiPlay,
  FiArrowRight,
  FiArrowLeft,
  FiPlusCircle,
  FiVideo,
  FiEdit,
  FiTrash2,
  FiEye,
  FiEyeOff,
  FiLoader,
  FiUsers,
  FiShield,
  FiDollarSign,
  FiCreditCard,
  FiBell,
  FiMessageCircle
} from 'react-icons/fi'

const Dashboard = () => {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const isArabic = language === 'ar'
  const { user, updatePassword, updateProfile, uploadAvatar } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const normalizedUserRole = resolveUserRole(user)
  const isPendingTeacher = isPendingInstructor(normalizedUserRole)

  const formatPaymentAmount = (payment) =>
    formatStoredAmount(payment.amount, payment.currency || 'USD', language)
  
  const [activeTab, setActiveTab] = useState('courses')
  const [myCourses, setMyCourses] = useState([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [courseActionError, setCourseActionError] = useState('')
  const [courseActionSuccess, setCourseActionSuccess] = useState('')
  const [courseActionLoadingId, setCourseActionLoadingId] = useState(null)
  const [adminSubTab, setAdminSubTab] = useState('users')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    const sub = params.get('sub')
    const validTabs = ['courses', 'teacher', 'admin', 'homework', 'progress', 'certificates', 'settings']
    const validAdminSubs = ['users', 'payments', 'crm']

    if (tab && validTabs.includes(tab)) {
      setActiveTab(tab)
    }
    if (sub && validAdminSubs.includes(sub)) {
      setAdminSubTab(sub)
    }
  }, [location.search])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [paymentSubmissions, setPaymentSubmissions] = useState([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')
  const [paymentActionLoadingId, setPaymentActionLoadingId] = useState(null)
  const [teacherPaymentSubmissions, setTeacherPaymentSubmissions] = useState([])
  const [isLoadingTeacherPayments, setIsLoadingTeacherPayments] = useState(false)
  const [teacherSubTab, setTeacherSubTab] = useState('courses')
  const [teacherChatCourseId, setTeacherChatCourseId] = useState('')
  const [studentEnrollments, setStudentEnrollments] = useState([])
  const [studentPayments, setStudentPayments] = useState([])
  const [studentNotifications, setStudentNotifications] = useState([])
  const [isLoadingStudentHistory, setIsLoadingStudentHistory] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    payment_type: 'vodafone_cash',
    display_name: 'Vodafone Cash',
    payment_details: '',
    instructions: ''
  })
  const paymentFeedbackRef = useRef(null)
  const avatarInputRef = useRef(null)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    bio: ''
  })
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: ''
  })
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' })
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  
  const ArrowIcon = isRTL ? FiArrowLeft : FiArrowRight

  const enrolledCourses = useMemo(() => {
    return (studentEnrollments || [])
      .filter((enrollment) => enrollment.course?.id)
      .map((enrollment) => ({
        id: enrollment.course.id,
        title: enrollment.course.title,
        titleEn: enrollment.course.title_en || enrollment.course.title,
        description: enrollment.course.description || '',
        descriptionEn: enrollment.course.description_en || enrollment.course.description || '',
        thumbnail: enrollment.course.thumbnail_url || '/assets/hero-background.png',
        price: enrollment.course.price || 0,
        category: enrollment.course.category || '',
        level: enrollment.course.level || 'beginner',
        rating: enrollment.course.rating || 0,
        students: enrollment.course.students || 0,
        lessons: enrollment.course.lessons?.[0]?.count || 0,
        duration: enrollment.course.duration || 0,
        instructor: {
          name: enrollment.course.instructor?.full_name || 'Instructor',
          nameEn: enrollment.course.instructor?.full_name || 'Instructor',
          avatar: enrollment.course.instructor?.avatar_url || '/assets/abdullah1.jpg',
        },
      }))
  }, [studentEnrollments])

  const completedCourses = enrolledCourses.filter((course) =>
    user?.progress?.[course.id] === 100
  )

  const inProgressCourses = enrolledCourses.filter((course) => {
    const progress = user?.progress?.[course.id] || 0
    return progress > 0 && progress < 100
  })

  const stats = [
    {
      icon: FiBookOpen,
      value: enrolledCourses.length,
      label: t('dashboard.enrolled'),
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: FiPlay,
      value: inProgressCourses.length,
      label: t('dashboard.inProgress'),
      color: 'from-yellow-500 to-orange-600'
    },
    {
      icon: FiAward,
      value: completedCourses.length,
      label: t('dashboard.completed'),
      color: 'from-green-500 to-teal-600'
    },
    {
      icon: FiClock,
      value: enrolledCourses.reduce((acc, course) => acc + (user?.progress?.[course.id] || 0) * course.duration / 100, 0).toFixed(0),
      label: t('dashboardExtra.learningHours'),
      color: 'from-purple-500 to-pink-600'
    }
  ]

  // Check if user is a teacher/instructor
  const isTeacher = normalizedUserRole === 'teacher' || normalizedUserRole === 'instructor' || isAdminRole(normalizedUserRole)
  
  // Check if user is an admin
  const isAdmin = isAdminRole(normalizedUserRole)

  useEffect(() => {
    setProfileForm({
      full_name: user?.full_name || user?.name || '',
      bio: user?.bio || ''
    })
  }, [user?.full_name, user?.name, user?.bio])

  const [studentChatInbox, setStudentChatInbox] = useState([])

  useEffect(() => {
    const loadInbox = async () => {
      if (!user?.id || isTeacher || isAdmin) return
      try {
        const inbox = await chatService.getStudentChatInbox()
        setStudentChatInbox(inbox || [])
      } catch (err) {
        console.error('Failed to load student chat inbox:', err)
      }
    }
    loadInbox()
  }, [user?.id, isTeacher, isAdmin])

  const studentChatCoursesList = useMemo(() => {
    const courseMap = new Map()

    ;(studentChatInbox || []).forEach((row) => {
      if (row.course_id) {
        courseMap.set(row.course_id, {
          id: row.course_id,
          title: row.title,
          thumbnail_url: row.thumbnail_url,
          message_count: row.message_count || 0,
          unread_count: row.unread_count || 0
        })
      }
    })

    ;(studentEnrollments || []).forEach((enrollment) => {
      if (enrollment.course?.id) {
        const existing = courseMap.get(enrollment.course.id)
        courseMap.set(enrollment.course.id, {
          id: enrollment.course.id,
          title: enrollment.course?.title,
          thumbnail_url: enrollment.course?.thumbnail_url,
          message_count: existing?.message_count || 0,
          unread_count: existing?.unread_count || 0
        })
      }
    })

    ;(studentPayments || []).forEach((payment) => {
      const courseId = payment.course_id || payment.courses?.id
      if (courseId && payment.status === 'approved') {
        const existing = courseMap.get(courseId)
        courseMap.set(courseId, {
          id: courseId,
          title: payment.courses?.title || payment.course_id,
          thumbnail_url: payment.courses?.thumbnail_url,
          message_count: existing?.message_count || 0,
          unread_count: existing?.unread_count || 0
        })
      }
    })

    return Array.from(courseMap.values()).sort((a, b) => {
      if ((b.message_count || 0) !== (a.message_count || 0)) {
        return (b.message_count || 0) - (a.message_count || 0)
      }
      return 0
    })
  }, [studentChatInbox, studentEnrollments, studentPayments])

  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || t('roles.user')
  const displayEmail = user?.email || ''
  const normalizedRole = normalizedUserRole === 'instructor' ? 'teacher' : (normalizedUserRole || 'student')
  const roleLabel = isPendingTeacher
    ? getRoleLabel('pending_instructor', language)
    : ({
      student: t('roles.student'),
      teacher: t('roles.teacher'),
      admin: t('roles.admin'),
      super_admin: t('roles.super_admin')
    }[normalizedRole] || getRoleLabel(normalizedUserRole, language))

  const parsePaymentDetailsInput = (paymentType, input) => {
    const raw = (input || '').trim()
    if (!raw) return {}

    // If admin provides JSON object, keep full structured data.
    if (raw.startsWith('{')) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed
      }
      throw new Error('Payment details JSON must be an object')
    }

    // Fallback: accept plain text for quick admin input.
    const plainValueMap = {
      vodafone_cash: { phone_number: raw },
      orange_cash: { phone_number: raw },
      etisalat_cash: { phone_number: raw },
      we_pay: { phone_number: raw },
      paypal: { email: raw },
      crypto: { wallet_address: raw },
      bank_transfer: { account_number: raw },
      iban: { iban: raw },
      ksa_local: { account_info: raw },
      uae_local: { account_info: raw },
      international_wire: { account_number: raw },
      other: { custom_info: raw }
    }

    return plainValueMap[paymentType] || { value: raw }
  }

  // Fetch teacher/admin courses
  useEffect(() => {
    const fetchMyCourses = async () => {
      if (!isTeacher || !user?.id) return
      
      setIsLoadingCourses(true)
      setCourseActionError('')
      try {
        if (isAdmin) {
          const { data } = await courseService.getCourses({ limit: 1000 })
          setMyCourses(data || [])
        } else {
          const data = await courseService.getInstructorCourses(user.id)
          setMyCourses(data || [])
        }
      } catch (error) {
        console.error('Error fetching my courses:', error)
        setCourseActionError(t('dashboardExtra.loadCoursesFailed'))
      } finally {
        setIsLoadingCourses(false)
      }
    }
    
    fetchMyCourses()
  }, [isTeacher, isAdmin, user?.id, language])

  useEffect(() => {
    if (myCourses.length > 0 && !teacherChatCourseId) {
      setTeacherChatCourseId(myCourses[0].id)
    }
  }, [myCourses, teacherChatCourseId])

  useEffect(() => {
    const fetchPaymentsData = async () => {
      if (!isAdmin || !user?.id || adminSubTab !== 'payments') return

      setIsLoadingPayments(true)
      setPaymentError('')

      try {
        const [methods, submissions] = await Promise.all([
          paymentService.getMyPaymentMethods(user.id),
          paymentService.getAllPaymentSubmissions()
        ])

        setPaymentMethods(methods)
        setPaymentSubmissions(submissions)
      } catch (error) {
        setPaymentError(error.message || 'Failed to load payment data')
      } finally {
        setIsLoadingPayments(false)
      }
    }

    fetchPaymentsData()
  }, [isAdmin, user?.id, adminSubTab])

  useEffect(() => {
    const fetchTeacherPayments = async () => {
      if (!isTeacher || !user?.id || activeTab !== 'teacher' || teacherSubTab !== 'payments') return

      setIsLoadingTeacherPayments(true)
      setPaymentError('')

      try {
        const submissions = await paymentService.getInstructorPaymentSubmissions(user.id)
        setTeacherPaymentSubmissions(submissions)
      } catch (error) {
        setPaymentError(error.message || 'Failed to load course payments')
      } finally {
        setIsLoadingTeacherPayments(false)
      }
    }

    fetchTeacherPayments()
  }, [isTeacher, user?.id, activeTab, teacherSubTab])

  useEffect(() => {
    const fetchStudentHistory = async () => {
      if (!user?.id || isAdmin || isTeacher) return

      setIsLoadingStudentHistory(true)
      try {
        const [enrollments, payments, notifications] = await Promise.all([
          enrollmentService.getUserEnrollments(),
          paymentService.getStudentPaymentSubmissions(user.id),
          notificationService.getSessionInvites(user.id, { limit: 10 })
        ])

        setStudentEnrollments(enrollments || [])
        setStudentPayments(payments || [])
        setStudentNotifications(notifications || [])
      } catch (error) {
        console.error('Error fetching student history:', error)
      } finally {
        setIsLoadingStudentHistory(false)
      }
    }

    fetchStudentHistory()
  }, [user?.id, isAdmin, isTeacher])

  const handleStudentNotificationJoin = async (notification) => {
    const joinPath = notification.action_url
      ? (notification.action_url.startsWith('/') ? notification.action_url : `/${notification.action_url}`)
      : (notification.course_id ? `/courses/${notification.course_id}/learn?session=live` : null)

    if (!joinPath) return

    try {
      await notificationService.markAsRead(notification.id)
      setStudentNotifications((prev) =>
        prev.map((item) => (item.id === notification.id ? { ...item, is_read: true } : item))
      )
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }

    navigate(joinPath)
  }

  const handlePaymentMethodCreate = async (e) => {
    e.preventDefault()
    if (!user?.id) return

    try {
      setPaymentError('')

      const parsedDetails = parsePaymentDetailsInput(
        paymentForm.payment_type,
        paymentForm.payment_details
      )

      await paymentService.createPaymentMethod({
        instructor_id: user.id,
        payment_type: paymentForm.payment_type,
        display_name: paymentForm.display_name,
        payment_details: parsedDetails,
        instructions: paymentForm.instructions,
        is_active: true
      })

      const methods = await paymentService.getMyPaymentMethods(user.id)
      setPaymentMethods(methods)
      setPaymentForm({
        payment_type: 'vodafone_cash',
        display_name: 'Vodafone Cash',
        payment_details: '',
        instructions: ''
      })
    } catch (error) {
      const defaultMessage = t('dashboard.failedToSavePaymentMethodEnter')
      setPaymentError(error.message || defaultMessage)
    }
  }

  const handlePaymentReview = async (submissionId, action) => {
    if (!user?.id) {
      setPaymentError(
        t('dashboard.youMustBeSignedInToReviewPayme')
      )
      return
    }

    try {
      setPaymentError('')
      setPaymentSuccess('')
      setPaymentActionLoadingId(submissionId)

      if (action === 'approve') {
        await paymentService.approvePaymentSubmission({ submissionId })
      } else {
        await paymentService.rejectPaymentSubmission({ submissionId })
      }

      if (isAdmin && activeTab === 'admin' && adminSubTab === 'payments') {
        const submissions = await paymentService.getAllPaymentSubmissions()
        setPaymentSubmissions(submissions)
      } else if (isTeacher && activeTab === 'teacher') {
        const submissions = await paymentService.getInstructorPaymentSubmissions(user.id)
        setTeacherPaymentSubmissions(submissions)
      }

      setPaymentSuccess(
        action === 'approve' ? t('dashboardExtra.paymentApprovedSuccess') : t('dashboardExtra.paymentRejectedSuccess')
      )
      paymentFeedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } catch (error) {
      setPaymentError(
        error.message || t('dashboardExtra.paymentUpdateFailed')
      )
      paymentFeedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    } finally {
      setPaymentActionLoadingId(null)
    }
  }

  const handleOpenPaymentProof = async (proofUrl) => {
    if (!proofUrl) return

    try {
      const resolvedUrl = await paymentService.getPaymentProofViewUrl(proofUrl)
      window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setPaymentError(error.message || 'Failed to open receipt')
    }
  }

  const handleDeleteCourse = async (course) => {
    if (!course?.id || !isAdmin) {
      setCourseActionError(t('dashboardExtra.adminOnlyDelete'))
      return
    }

    const confirmed = window.confirm(
      t('dashboard.deleteCourseCoursetitlePermane')
    )

    if (!confirmed) return

    try {
      setCourseActionError('')
      setCourseActionSuccess('')
      setCourseActionLoadingId(course.id)
      await courseService.deleteCourse(course.id)
      setMyCourses((prev) => prev.filter((item) => item.id !== course.id))
      setCourseActionSuccess(t('dashboardExtra.courseDeleted'))
    } catch (error) {
      setCourseActionError(error.message || t('dashboardExtra.courseDeleteFailed'))
    } finally {
      setCourseActionLoadingId(null)
    }
  }

  const handleProfileSave = async (event) => {
    event.preventDefault()

    try {
      setIsSavingProfile(true)
      setProfileStatus({ type: '', message: '' })

      const result = await updateProfile({
        full_name: profileForm.full_name.trim(),
        bio: profileForm.bio.trim() || null
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      setProfileStatus({
        type: 'success',
        message: t('dashboardExtra.profileSaved')
      })
    } catch (error) {
      setProfileStatus({
        type: 'error',
        message: error.message || t('dashboardExtra.profileSaveFailed')
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsUploadingAvatar(true)
      setProfileStatus({ type: '', message: '' })

      const result = await uploadAvatar(file)
      if (!result.success) {
        throw new Error(result.error)
      }

      setProfileStatus({
        type: 'success',
        message: t('dashboardExtra.photoUpdated')
      })
    } catch (error) {
      setProfileStatus({
        type: 'error',
        message: error.message || t('dashboardExtra.photoUploadFailed')
      })
    } finally {
      setIsUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const handlePasswordSave = async (event) => {
    event.preventDefault()
    setPasswordStatus({ type: '', message: '' })

    if (passwordForm.password.length < 8) {
      setPasswordStatus({ type: 'error', message: t('profileSettings.passwordTooShort') })
      return
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordStatus({ type: 'error', message: t('register.passwordsDoNotMatch') })
      return
    }

    try {
      setIsSavingPassword(true)
      const result = await updatePassword(passwordForm.password)
      if (!result.success) {
        throw new Error(result.error)
      }
      setPasswordForm({ password: '', confirmPassword: '' })
      setPasswordStatus({ type: 'success', message: t('profileSettings.passwordUpdated') })
    } catch (error) {
      setPasswordStatus({ type: 'error', message: error.message || t('profileSettings.passwordUpdateFailed') })
    } finally {
      setIsSavingPassword(false)
    }
  }

  const sidebarLinks = [
    { id: 'courses', icon: FiBook, label: t('dashboard.myCourses') },
    ...(isTeacher ? [{ id: 'teacher', icon: FiPlusCircle, label: t('dashboardExtra.manageCourses') }] : []),
    ...(isAdmin ? [{ id: 'admin', icon: FiShield, label: t('dashboardExtra.adminPanel') }] : []),
    ...(!isAdmin ? [{ id: 'homework', icon: FiBookOpen, label: t('homework.navLabel') }] : []),
    { id: 'progress', icon: FiTrendingUp, label: t('dashboard.progress') },
    { id: 'certificates', icon: FiAward, label: t('dashboard.certificates') },
    { id: 'settings', icon: FiSettings, label: t('dashboard.settings') },
  ]

  return (
    <div className="min-h-screen pt-6 pb-16 bg-secondary-50 dark:bg-dark-bg">
      <div className="container-custom">
        {(isPendingTeacher || location.state?.registrationNotice) && (
          <div className="mb-6 card card-body border border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
            <p>
              {location.state?.registrationNotice || (
                t('dashboard.yourInstructorAccountIsPending')
              )}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 md:p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            {/* Avatar */}
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={displayName}
                className="w-20 h-20 rounded-full object-cover border-4 border-white/20"
              />
            ) : (
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <FiUser className="w-10 h-10" />
              </div>
            )}
            
            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {t('dashboard.welcome')}، {displayName.split(' ')[0]}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {displayEmail && (
                  <span className="text-sm text-white/90">{displayEmail}</span>
                )}
                <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-white/20 border border-white/30">
                  {roleLabel}
                </span>
              </div>
              <p className="text-white/80">
                {t('dashboard.keepLearningAndAchieveYourGoal')}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3 w-full md:w-auto">
              {isTeacher && (
                <Link
                  to="/teacher/create-course"
                  className="btn bg-green-500 hover:bg-green-600 text-white w-full sm:w-auto"
                >
                  <FiPlusCircle className="w-5 h-5" />
                  {t('dashboardExtra.createCourse')}
                </Link>
              )}
              <Link
                to="/courses"
                className="btn bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm w-full sm:w-auto"
              >
                {t('dashboardExtra.browseCourses')}
                <ArrowIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="card card-body flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shrink-0`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-sm text-secondary-500">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 min-w-0">
            <div className="card overflow-hidden">
              <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible">
              {sidebarLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-4 transition-colors whitespace-nowrap lg:whitespace-normal ${
                    activeTab === link.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-s-4 border-primary-500'
                      : 'hover:bg-secondary-50 dark:hover:bg-dark-border'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  <span className="font-medium">{link.label}</span>
                </button>
              ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 min-w-0">
            {/* My Courses Tab */}
            {activeTab === 'courses' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">{t('dashboard.myCourses')}</h2>
                </div>

                {isLoadingStudentHistory && !isTeacher ? (
                  <div className="card card-body text-center py-12">
                    <FiLoader className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
                  </div>
                ) : !isTeacher ? (
                  <div className="space-y-8">
                    {shouldShowStudentChatBell(user) && (
                      <div className="card card-body">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <FiMessageCircle className="w-5 h-5 text-primary-500" />
                          {t('dashboardExtra.instructorChat')}
                        </h3>
                        {studentChatCoursesList.length > 0 ? (
                          <div className="space-y-3">
                            {studentChatCoursesList.map((course) => (
                              <div
                                key={course.id}
                                className="flex items-center gap-4 p-3 bg-secondary-50 dark:bg-dark-border rounded-lg"
                              >
                                <img
                                  src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100'}
                                  alt={course.title || 'Course'}
                                  className="w-16 h-12 rounded object-cover"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold truncate">{course.title || 'Course'}</p>
                                  <p className="text-sm text-secondary-500">
                                    {(course.message_count || 0) > 0
                                      ? (t('dashboard.coursemessagecountMessages'))
                                      : t('dashboardExtra.messageInstructor')}
                                  </p>
                                </div>
                                <Link
                                  to={`/courses/${course.id}/learn?tab=chat`}
                                  className="btn btn-primary btn-sm inline-flex items-center gap-1 shrink-0"
                                >
                                  <FiMessageCircle className="w-4 h-4" />
                                  {t('dashboardExtra.openChat')}
                                </Link>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-secondary-500 mb-3">
                              {t('dashboard.openAnyCoursePageAndTapChatWit')}
                            </p>
                            <Link to="/courses" className="btn btn-primary btn-sm">
                              {t('dashboardExtra.browseCoursesLink')}
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {studentNotifications.length > 0 && (
                      <div className="card card-body">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <FiBell className="w-5 h-5 text-primary-500" />
                          {t('dashboardExtra.liveNotifications')}
                        </h3>
                        <div className="space-y-3">
                          {studentNotifications.map((notification) => {
                            const jitsiMatch = notification.message?.match(/https:\/\/[^\s]+/i)
                            const jitsiUrl = jitsiMatch?.[0] || null

                            return (
                              <div
                                key={notification.id}
                                className={`p-4 rounded-lg border ${notification.is_read ? 'border-secondary-200 dark:border-dark-border' : 'border-primary-300 bg-primary-50/50 dark:bg-primary-900/10'}`}
                              >
                                <p className="font-semibold">{notification.title}</p>
                                <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1 whitespace-pre-wrap">
                                  {notification.message}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {(notification.action_url || notification.course_id) && (
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm inline-flex items-center gap-1"
                                      onClick={() => handleStudentNotificationJoin(notification)}
                                    >
                                      <FiVideo className="w-4 h-4" />
                                      {t('dashboardExtra.joinSession')}
                                    </button>
                                  )}
                                  {jitsiUrl && (
                                    <a
                                      href={jitsiUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-outline btn-sm inline-flex items-center gap-1"
                                    >
                                      <FiVideo className="w-4 h-4" />
                                      {t('dashboardExtra.jitsiLink')}
                                    </a>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="card card-body">
                      <h3 className="text-lg font-bold mb-4">
                        {t('dashboardExtra.purchasedCourses')}
                      </h3>

                      {studentEnrollments.length > 0 ? (
                        <div className="space-y-4">
                          {studentEnrollments.map((enrollment) => (
                            <div key={enrollment.id} className="flex items-center gap-4 p-3 bg-secondary-50 dark:bg-dark-border rounded-lg">
                              <img
                                src={enrollment.course?.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100'}
                                alt={enrollment.course?.title || 'Course'}
                                className="w-16 h-12 rounded object-cover"
                              />
                              <div className="flex-1">
                                <p className="font-semibold">{enrollment.course?.title || 'Course'}</p>
                                <p className="text-sm text-secondary-500">
                                  {t('dashboardExtra.purchasedOn')} {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Link
                                  to={`/courses/${enrollment.course?.id}/learn?tab=chat`}
                                  className="btn btn-sm inline-flex items-center gap-1 btn-secondary"
                                  title={t('dashboardExtra.chatWithInstructor')}
                                >
                                  <FiMessageCircle className="w-4 h-4" />
                                  {t('dashboardExtra.chat')}
                                </Link>
                                <Link
                                  to={`/courses/${enrollment.course?.id}/learn?session=live`}
                                  className="btn btn-sm inline-flex items-center gap-1 bg-green-500 text-white hover:bg-green-600 border-0"
                                  title={t('dashboardExtra.joinLive')}
                                >
                                  <FiVideo className="w-4 h-4" />
                                  {t('dashboardExtra.live')}
                                </Link>
                                <Link to={`/courses/${enrollment.course?.id}/learn`} className="btn btn-primary btn-sm">
                                  {t('dashboardExtra.openCourse')}
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-secondary-500 text-sm">
                          {t('dashboardExtra.noPurchasedCourses')}
                        </p>
                      )}
                    </div>

                    <div className="card card-body">
                      <h3 className="text-lg font-bold mb-4">
                        {t('dashboardExtra.paymentHistory')}
                      </h3>

                      {studentPayments.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-start py-2 px-2">{t('dashboardExtra.date')}</th>
                                <th className="text-start py-2 px-2">{t('dashboardExtra.course')}</th>
                                <th className="text-start py-2 px-2">{t('dashboardExtra.amount')}</th>
                                <th className="text-start py-2 px-2">{t('dashboardExtra.method')}</th>
                                <th className="text-start py-2 px-2">{t('dashboardExtra.reference')}</th>
                                <th className="text-start py-2 px-2">{t('dashboardExtra.paymentDetails')}</th>
                                <th className="text-start py-2 px-2">{t('dashboardExtra.status')}</th>
                                <th className="text-start py-2 px-2">{t('dashboardExtra.reviewNotes')}</th>
                                <th className="text-start py-2 px-2">{t('dashboardExtra.proof')}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentPayments.map((payment) => (
                                <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800">
                                  <td className="py-2 px-2 whitespace-nowrap">
                                    {new Date(payment.submitted_at || payment.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="py-2 px-2">{payment.courses?.title || payment.course_id}</td>
                                  <td className="py-2 px-2">{formatPaymentAmount(payment)}</td>
                                  <td className="py-2 px-2">{payment.payment_method?.display_name || payment.payment_method_id}</td>
                                  <td className="py-2 px-2">{payment.transaction_reference || '-'}</td>
                                  <td className="py-2 px-2 max-w-[260px] break-words">
                                    <div className="text-xs text-secondary-600 dark:text-secondary-300 whitespace-pre-wrap">
                                      {payment.payment_method?.payment_details
                                        ? JSON.stringify(payment.payment_method.payment_details)
                                        : '-'}
                                      {payment.additional_notes ? `\n${payment.additional_notes}` : ''}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      payment.status === 'approved'
                                        ? 'bg-green-100 text-green-800'
                                        : payment.status === 'rejected'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {payment.status}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-sm text-secondary-600 dark:text-secondary-300">
                                    {payment.review_notes || '-'}
                                  </td>
                                  <td className="py-2 px-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPaymentProof(payment.payment_screenshot_url)}
                                      className="text-blue-600 hover:underline"
                                    >
                                      {t('dashboardExtra.view')}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-secondary-500 text-sm">
                          {t('dashboardExtra.noPayments')}
                        </p>
                      )}
                    </div>
                  </div>
                ) : enrolledCourses.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {enrolledCourses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                ) : (
                  <div className="card card-body text-center py-12">
                    <div className="w-20 h-20 bg-secondary-100 dark:bg-dark-border rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiBook className="w-10 h-10 text-secondary-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {t('dashboardExtra.noEnrolledCourses')}
                    </h3>
                    <p className="text-secondary-500 mb-6">
                      {t('dashboard.startYourLearningJourneyNowAnd')}
                    </p>
                    <Link to="/courses" className="btn btn-primary mx-auto">
                      {t('dashboardExtra.browseCourses')}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Teacher Tab */}
            {activeTab === 'teacher' && isTeacher && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {t('dashboardExtra.manageCourses')}
                  </h2>
                  <Link to="/teacher/create-course" className="btn btn-primary">
                    <FiPlusCircle className="w-5 h-5" />
                    {t('dashboardExtra.createNewCourse')}
                  </Link>
                </div>

                <div className="flex gap-2 mb-6">
                  <button
                    type="button"
                    onClick={() => setTeacherSubTab('courses')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      teacherSubTab === 'courses'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t('dashboardExtra.coursesTab')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherSubTab('payments')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      teacherSubTab === 'payments'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiDollarSign className="w-4 h-4 inline me-2" />
                    {t('dashboardExtra.coursePayments')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeacherSubTab('chat')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      teacherSubTab === 'chat'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiMessageCircle className="w-4 h-4 inline me-2" />
                    {t('dashboardExtra.studentChat')}
                  </button>
                </div>

                {teacherSubTab === 'payments' && (
                  <div className="space-y-6">
                    {paymentError && (
                      <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
                        {paymentError}
                      </div>
                    )}
                    {paymentSuccess && (
                      <div className="rounded-lg border border-green-300 bg-green-50 text-green-700 px-4 py-3 text-sm">
                        {paymentSuccess}
                      </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="card card-body text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {teacherPaymentSubmissions.filter((s) => s.status === 'pending').length}
                        </div>
                        <div className="text-sm text-gray-500">{t('dashboardExtra.pending')}</div>
                      </div>
                      <div className="card card-body text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {teacherPaymentSubmissions.filter((s) => s.status === 'approved').length}
                        </div>
                        <div className="text-sm text-gray-500">{t('dashboardExtra.approved')}</div>
                      </div>
                      <div className="card card-body text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          ${teacherPaymentSubmissions
                            .filter((s) => s.status === 'approved')
                            .reduce((sum, s) => sum + Number(s.amount || 0), 0)
                            .toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500">{t('dashboardExtra.approvedTotal')}</div>
                      </div>
                    </div>

                    <div className="card card-body">
                      <h3 className="text-lg font-bold mb-4">
                        {t('dashboardExtra.paymentRequests')}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-start py-3 px-4 font-medium">{t('dashboard.course')}</th>
                              <th className="text-start py-3 px-4 font-medium">{t('dashboardExtra.student')}</th>
                              <th className="text-start py-3 px-4 font-medium">{t('dashboardExtra.amount')}</th>
                              <th className="text-start py-3 px-4 font-medium">{t('dashboardExtra.status')}</th>
                              <th className="text-start py-3 px-4 font-medium">{t('dashboardExtra.actions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoadingTeacherPayments && (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-gray-500">
                                  {t('common.loading')}
                                </td>
                              </tr>
                            )}
                            {!isLoadingTeacherPayments && teacherPaymentSubmissions.map((submission) => (
                              <tr key={submission.id} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-3 px-4">{submission.courses?.title || submission.course_id}</td>
                                <td className="py-3 px-4">
                                  {submission.students?.full_name || submission.students?.email || 'Student'}
                                </td>
                                <td className="py-3 px-4">{formatPaymentAmount(submission)}</td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    submission.status === 'approved'
                                      ? 'bg-green-100 text-green-800'
                                      : submission.status === 'rejected'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {submission.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {submission.status === 'pending' ? (
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handlePaymentReview(submission.id, 'approve')}
                                        disabled={paymentActionLoadingId === submission.id}
                                        className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 disabled:opacity-60"
                                      >
                                        {paymentActionLoadingId === submission.id
                                          ? t('dashboardExtra.processing')
                                          : t('dashboardExtra.approve')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handlePaymentReview(submission.id, 'reject')}
                                        disabled={paymentActionLoadingId === submission.id}
                                        className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 disabled:opacity-60"
                                      >
                                        {t('dashboardExtra.reject')}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPaymentProof(submission.payment_screenshot_url)}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                                    >
                                      {t('dashboardExtra.viewProof')}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {!isLoadingTeacherPayments && teacherPaymentSubmissions.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-gray-500">
                                  {t('dashboardExtra.noPaymentRequests')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {teacherSubTab === 'chat' && (
                  <div className="card card-body">
                    <h3 className="text-lg font-bold mb-4">
                      {t('dashboardExtra.chatAllStudents')}
                    </h3>
                    {myCourses.length === 0 ? (
                      <p className="text-secondary-500 text-sm">
                        {t('dashboardExtra.createCourseFirst')}
                      </p>
                    ) : (
                      <>
                        <label className="label">{t('dashboardExtra.selectCourse')}</label>
                        <select
                          className="input mb-4 max-w-md"
                          value={teacherChatCourseId || myCourses[0]?.id || ''}
                          onChange={(e) => setTeacherChatCourseId(e.target.value)}
                        >
                          {myCourses.map((course) => (
                            <option key={course.id} value={course.id}>{course.title}</option>
                          ))}
                        </select>
                        <CourseChat
                          courseId={teacherChatCourseId || myCourses[0]?.id}
                          instructorId={user?.id}
                          user={user}
                          language={language}
                          hasAccess
                        />
                      </>
                    )}
                  </div>
                )}

                {teacherSubTab === 'courses' && (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="card card-body bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <FiBook className="w-10 h-10 mb-3" />
                    <div className="text-3xl font-bold">{myCourses.length}</div>
                    <div className="text-white/80">
                      {isAdmin
                        ? t('dashboardExtra.allCourses')
                        : t('dashboardExtra.myCourses')
                      }
                    </div>
                  </div>
                  <div className="card card-body bg-gradient-to-br from-green-500 to-teal-600 text-white">
                    <FiUser className="w-10 h-10 mb-3" />
                    <div className="text-3xl font-bold">0</div>
                    <div className="text-white/80">{t('dashboardExtra.enrolledStudents')}</div>
                  </div>
                </div>

                {/* My Courses Section */}
                <div className="card card-body mb-8">
                  <h3 className="text-lg font-bold mb-4">
                    {isAdmin
                      ? t('dashboardExtra.allPlatformCourses')
                      : t('dashboardExtra.myCourses')
                    }
                  </h3>

                  {courseActionError && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
                      {courseActionError}
                    </div>
                  )}

                  {courseActionSuccess && (
                    <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200">
                      {courseActionSuccess}
                    </div>
                  )}
                  
                  {isLoadingCourses ? (
                    <div className="flex items-center justify-center py-8">
                      <FiLoader className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                  ) : myCourses.length > 0 ? (
                    <div className="space-y-4">
                      {myCourses.map((course) => (
                        <div key={course.id} className="flex items-center gap-4 p-4 bg-secondary-50 dark:bg-dark-border rounded-xl">
                          <img
                            src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=100'}
                            alt={course.title}
                            className="w-20 h-14 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h4 className="font-bold mb-1">{course.title}</h4>
                            <div className="flex items-center gap-4 text-sm text-secondary-500">
                              <span>{course.lessonsCount || 0} {t('dashboardExtra.lessons')}</span>
                              <span className={`flex items-center gap-1 ${course.is_published ? 'text-green-500' : 'text-orange-500'}`}>
                                {course.is_published ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                                {course.is_published
                                  ? t('dashboardExtra.published')
                                  : t('dashboardExtra.draft')
                                }
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/courses/${course.id}`}
                              className="btn btn-sm btn-secondary"
                              title={t('dashboardExtra.view')}
                            >
                              <FiEye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/teacher/edit-course/${course.id}`}
                              className="btn btn-sm btn-secondary"
                              title={t('dashboardExtra.edit')}
                            >
                              <FiEdit className="w-4 h-4" />
                            </Link>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteCourse(course)}
                                disabled={courseActionLoadingId === course.id}
                                className="btn btn-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
                                title={t('dashboardExtra.deleteCourse')}
                              >
                                {courseActionLoadingId === course.id ? (
                                  <FiLoader className="w-4 h-4 animate-spin" />
                                ) : (
                                  <FiTrash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-secondary-100 dark:bg-dark-bg rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiBook className="w-8 h-8 text-secondary-400" />
                      </div>
                      <p className="text-secondary-500 mb-4">
                        {t('dashboard.youHaventCreatedAnyCoursesYet')}
                      </p>
                      <Link to="/teacher/create-course" className="btn btn-primary">
                        <FiPlusCircle className="w-5 h-5" />
                        {t('dashboardExtra.createCourse')}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="card card-body">
                  <h3 className="text-lg font-bold mb-4">
                    {t('dashboardExtra.quickActions')}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Link
                      to="/teacher/create-course"
                      className="p-4 border-2 border-dashed border-primary-300 rounded-xl text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <FiPlusCircle className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                      <div className="font-medium">{t('dashboardExtra.createCourse')}</div>
                    </Link>
                    <Link
                      to="/teacher/live-session?instant=1"
                      className="p-4 border-2 border-dashed border-green-300 rounded-xl text-center hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      <FiVideo className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <div className="font-medium">{t('dashboardExtra.liveSession')}</div>
                    </Link>
                    <Link
                      to="/courses"
                      className="p-4 border-2 border-dashed border-orange-300 rounded-xl text-center hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                    >
                      <FiBook className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                      <div className="font-medium">{t('dashboardExtra.marketplace')}</div>
                    </Link>
                  </div>
                </div>
              </>
                )}
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && isAdmin && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {t('dashboardExtra.adminPanel')}
                  </h2>
                </div>

                {/* Admin Sub Navigation */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => setAdminSubTab('users')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      adminSubTab === 'users'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiUsers className="w-4 h-4 inline me-2" />
                    {t('dashboardExtra.userManagement')}
                  </button>
                  <button
                    onClick={() => setAdminSubTab('payments')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      adminSubTab === 'payments'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiDollarSign className="w-4 h-4 inline me-2" />
                    {t('dashboardExtra.paymentManagement')}
                  </button>
                  <button
                    onClick={() => setAdminSubTab('crm')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      adminSubTab === 'crm'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiMessageCircle className="w-4 h-4 inline me-2" />
                    CRM
                  </button>
                </div>

                {/* Users Management */}
                {adminSubTab === 'users' && <UserManagement />}

                {/* CRM */}
                {adminSubTab === 'crm' && <AdminCRM />}

                {/* Payments Management */}
                {adminSubTab === 'payments' && (
                  <div>
                    {/* Payment Stats */}
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                      <div className="card card-body bg-gradient-to-br from-green-500 to-teal-600 text-white">
                        <FiDollarSign className="w-10 h-10 mb-3" />
                        <div className="text-3xl font-bold">
                          ${paymentSubmissions
                            .filter((s) => s.status === 'approved')
                            .reduce((sum, s) => sum + Number(s.amount || 0), 0)
                            .toFixed(2)}
                        </div>
                        <div className="text-white/80">{t('dashboardExtra.totalPayments')}</div>
                      </div>
                      <div className="card card-body bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <FiClock className="w-10 h-10 mb-3" />
                        <div className="text-3xl font-bold">
                          {paymentSubmissions.filter((s) => s.status === 'pending').length}
                        </div>
                        <div className="text-white/80">{t('dashboardExtra.pendingPayments')}</div>
                      </div>
                      <div className="card card-body bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                        <FiCreditCard className="w-10 h-10 mb-3" />
                        <div className="text-3xl font-bold">{paymentMethods.length}</div>
                        <div className="text-white/80">{t('dashboardExtra.activePaymentMethods')}</div>
                      </div>
                    </div>

                    <div ref={paymentFeedbackRef} className="mb-6">
                      {paymentError && (
                        <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
                          {paymentError}
                        </div>
                      )}

                      {paymentSuccess && (
                        <div className="mt-3 rounded-lg border border-green-300 bg-green-50 text-green-700 px-4 py-3 text-sm">
                          {paymentSuccess}
                        </div>
                      )}
                    </div>

                    {/* Create Payment Method */}
                    <div className="card card-body mb-8">
                      <h3 className="text-lg font-bold mb-4">
                        {t('dashboardExtra.addPaymentMethod')}
                      </h3>

                      <form onSubmit={handlePaymentMethodCreate} className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">{t('dashboardExtra.paymentType')}</label>
                          <select
                            value={paymentForm.payment_type}
                            onChange={(e) => {
                              const selected = PAYMENT_TYPES.find((t) => t.value === e.target.value)
                              setPaymentForm((prev) => ({
                                ...prev,
                                payment_type: e.target.value,
                                display_name: selected?.label || prev.display_name
                              }))
                            }}
                            className="input"
                          >
                            {PAYMENT_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>{type.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="label">{t('dashboardExtra.displayName')}</label>
                          <input
                            className="input"
                            value={paymentForm.display_name}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, display_name: e.target.value }))}
                            placeholder="Vodafone Cash"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="label">
                            {t('dashboardExtra.paymentDetails')}
                          </label>
                          <textarea
                            className="input min-h-[100px]"
                            value={paymentForm.payment_details}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_details: e.target.value }))}
                            placeholder={t('dashboard.example2010xxxxxxxOrPaypaypalc')}
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="label">{t('dashboardExtra.paymentInstructions')}</label>
                          <textarea
                            className="input min-h-[100px]"
                            value={paymentForm.instructions}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, instructions: e.target.value }))}
                            placeholder={t('dashboardExtra.instructionsPlaceholder')}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <button type="submit" className="btn btn-primary">
                            {t('dashboardExtra.savePaymentMethod')}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active Payment Methods */}
                    <div className="card card-body mb-8">
                      <h3 className="text-lg font-bold mb-4">
                        {t('dashboard.activePaymentMethods')}
                      </h3>
                      <div className="space-y-3">
                        {paymentMethods.map((method) => (
                          <div key={method.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="font-semibold">{method.display_name}</div>
                            <div className="text-sm text-gray-500 mb-2">{method.payment_type}</div>
                            <pre className="text-xs whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 p-2 rounded">
                              {JSON.stringify(method.payment_details, null, 2)}
                            </pre>
                          </div>
                        ))}
                        {paymentMethods.length === 0 && (
                          <p className="text-sm text-gray-500">
                            {t('dashboardExtra.noPaymentMethods')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Recent Payment Submissions */}
                    <div className="card card-body">
                      <h3 className="text-lg font-bold mb-4">
                        {t('dashboardExtra.recentSubmissions')}
                      </h3>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-start py-3 px-4 font-medium">
                                {t('dashboardExtra.student')}
                              </th>
                              <th className="text-start py-3 px-4 font-medium">
                                {t('dashboardExtra.amount')}
                              </th>
                              <th className="text-start py-3 px-4 font-medium">
                                {t('dashboardExtra.paymentMethod')}
                              </th>
                              <th className="text-start py-3 px-4 font-medium">
                                {t('dashboardExtra.status')}
                              </th>
                              <th className="text-start py-3 px-4 font-medium">
                                {t('dashboardExtra.actions')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoadingPayments && (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-gray-500">
                                  {t('common.loading')}
                                </td>
                              </tr>
                            )}

                            {!isLoadingPayments && paymentSubmissions.map((submission) => (
                              <tr key={submission.id} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-3 px-4">
                                  {submission.students?.full_name || submission.students?.email || 'Student'}
                                </td>
                                <td className="py-3 px-4">{formatPaymentAmount(submission)}</td>
                                <td className="py-3 px-4">
                                  {submission.payment_method?.display_name || submission.payment_method?.payment_type}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    submission.status === 'approved'
                                      ? 'bg-green-100 text-green-800'
                                      : submission.status === 'rejected'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {submission.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  {submission.status === 'pending' ? (
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handlePaymentReview(submission.id, 'approve')}
                                        disabled={paymentActionLoadingId === submission.id}
                                        className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200 disabled:opacity-60"
                                      >
                                        {paymentActionLoadingId === submission.id
                                          ? t('dashboardExtra.executing')
                                          : t('dashboardExtra.approve')}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handlePaymentReview(submission.id, 'reject')}
                                        disabled={paymentActionLoadingId === submission.id}
                                        className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 disabled:opacity-60"
                                      >
                                        {paymentActionLoadingId === submission.id
                                          ? t('dashboardExtra.executing')
                                          : t('dashboardExtra.reject')}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPaymentProof(submission.payment_screenshot_url)}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 inline-block"
                                    >
                                      {t('dashboardExtra.viewProof')}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}

                            {!isLoadingPayments && paymentSubmissions.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-gray-500">
                                  {t('dashboardExtra.noSubmissions')}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Progress Tab */}
            {activeTab === 'progress' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{t('dashboard.progress')}</h2>
                
                {enrolledCourses.length > 0 ? (
                  <div className="space-y-4">
                    {enrolledCourses.map((course) => {
                      const progress = user?.progress?.[course.id] || 0
                      const title = isArabic ? course.title : course.titleEn
                      
                      return (
                        <div key={course.id} className="card card-body">
                          <div className="flex items-center gap-4 mb-3">
                            <img
                              src={course.thumbnail}
                              alt={title}
                              className="w-16 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="font-bold mb-1 line-clamp-1">{title}</h3>
                              <div className="flex items-center gap-4 text-sm text-secondary-500">
                                <span>{course.lessons} {t('course.lessons')}</span>
                                <span>{course.duration} {t('course.hours')}</span>
                              </div>
                            </div>
                            <Link
                              to={`/courses/${course.id}/learn`}
                              className="btn btn-primary btn-sm"
                            >
                              {t('course.continue')}
                            </Link>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span>{t('course.progress')}</span>
                              <span className="font-medium">{progress}%</span>
                            </div>
                            <div className="h-2 bg-secondary-200 dark:bg-dark-border rounded-full">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  progress === 100 
                                    ? 'bg-green-500' 
                                    : 'bg-primary-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="card card-body text-center py-12">
                    <p className="text-secondary-500">
                      {t('dashboardExtra.noProgressData')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{t('dashboard.certificates')}</h2>
                
                {completedCourses.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {completedCourses.map((course) => {
                      const title = isArabic ? course.title : course.titleEn
                      
                      return (
                        <div key={course.id} className="card overflow-hidden">
                          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-6 text-white text-center">
                            <FiAward className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-xl font-bold">{t('dashboardExtra.certificateOfCompletion')}</h3>
                          </div>
                          <div className="p-6">
                            <h4 className="font-bold mb-2">{title}</h4>
                            <p className="text-sm text-secondary-500 mb-4">
                              {t('dashboardExtra.successfullyCompleted')}
                            </p>
                            <button className="btn btn-primary w-full">
                              {t('dashboardExtra.downloadCertificate')}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="card card-body text-center py-12">
                    <div className="w-20 h-20 bg-secondary-100 dark:bg-dark-border rounded-full flex items-center justify-center mx-auto mb-4">
                      <FiAward className="w-10 h-10 text-secondary-400" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      {t('dashboardExtra.noCertificates')}
                    </h3>
                    <p className="text-secondary-500">
                      {t('dashboardExtra.completeForCertificates')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'homework' && !isAdmin && (
              <HomeworkPanel />
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{t('dashboard.settings')}</h2>
                
                <div className="card card-body">
                  <form className="space-y-6" onSubmit={handleProfileSave}>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={displayName}
                          className="w-24 h-24 rounded-full object-cover border border-secondary-200 dark:border-dark-border"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-secondary-100 dark:bg-dark-bg rounded-full flex items-center justify-center">
                          <FiUser className="w-10 h-10 text-secondary-500" />
                        </div>
                      )}
                      <div>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar}
                        >
                          {isUploadingAvatar && <FiLoader className="w-4 h-4 animate-spin" />}
                          {t('dashboardExtra.uploadPhoto')}
                        </button>
                        <p className="text-sm text-secondary-500 mt-2">
                          {t('dashboardExtra.photoHint')}
                        </p>
                      </div>
                    </div>

                    {profileStatus.message && (
                      <div className={`rounded-lg px-4 py-3 text-sm ${
                        profileStatus.type === 'success'
                          ? 'border border-green-300 bg-green-50 text-green-700'
                          : 'border border-red-300 bg-red-50 text-red-700'
                      }`}>
                        {profileStatus.message}
                      </div>
                    )}

                    <div>
                      <label className="label">{t('auth.register.name')}</label>
                      <input
                        type="text"
                        className="input"
                        value={profileForm.full_name}
                        onChange={(event) => setProfileForm((prev) => ({ ...prev, full_name: event.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">{t('auth.register.email')}</label>
                      <input
                        type="email"
                        className="input"
                        value={user?.email || ''}
                        disabled
                      />
                      <p className="text-sm text-secondary-500 mt-2">
                        {t('profileSettings.emailReadOnly')}
                      </p>
                    </div>
                    {isTeacher && (
                      <div>
                        <label className="label">
                          {t('dashboardExtra.instructorBio')}
                        </label>
                        <textarea
                          className="input min-h-[140px]"
                          value={profileForm.bio}
                          onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                          placeholder={t('dashboardExtra.bioPlaceholder')}
                          maxLength={1000}
                        />
                        <p className="text-xs text-secondary-500 mt-2">
                          {profileForm.bio.length}/1000
                        </p>
                      </div>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
                      {isSavingProfile && <FiLoader className="w-4 h-4 animate-spin" />}
                      {t('common.save')}
                    </button>
                  </form>
                </div>

                <div className="card card-body mt-6">
                  <form className="space-y-6" onSubmit={handlePasswordSave}>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{t('profileSettings.securityTitle')}</h3>
                      <p className="text-secondary-600 dark:text-secondary-400">
                        {t('profileSettings.securitySubtitle')}
                      </p>
                    </div>

                    {passwordStatus.message && (
                      <div className={`rounded-lg px-4 py-3 text-sm ${
                        passwordStatus.type === 'success'
                          ? 'border border-green-300 bg-green-50 text-green-700'
                          : 'border border-red-300 bg-red-50 text-red-700'
                      }`}>
                        {passwordStatus.message}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label" htmlFor="profile-password">
                          {t('profileSettings.newPassword')}
                        </label>
                        <input
                          id="profile-password"
                          type="password"
                          className="input"
                          value={passwordForm.password}
                          onChange={(event) => setPasswordForm((prev) => ({ ...prev, password: event.target.value }))}
                          placeholder={t('authUnified.passwordPlaceholder')}
                          autoComplete="new-password"
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor="profile-confirm-password">
                          {t('profileSettings.confirmNewPassword')}
                        </label>
                        <input
                          id="profile-confirm-password"
                          type="password"
                          className="input"
                          value={passwordForm.confirmPassword}
                          onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                          placeholder={t('authUnified.passwordPlaceholder')}
                          autoComplete="new-password"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSavingPassword || !passwordForm.password || !passwordForm.confirmPassword}
                    >
                      {isSavingPassword && <FiLoader className="w-4 h-4 animate-spin" />}
                      {t('profileSettings.updatePassword')}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
