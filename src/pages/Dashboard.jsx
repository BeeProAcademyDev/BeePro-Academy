import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import CourseCard from '../components/ui/CourseCard'
import { courses } from '../data/courses'
import { courseService, enrollmentService } from '../services/api'
import { paymentService, PAYMENT_TYPES } from '../services/paymentAPI'
import UserManagement from './admin/UserManagement'
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
  FiCreditCard
} from 'react-icons/fi'

const Dashboard = () => {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const { user } = useAuth()
  
  const [activeTab, setActiveTab] = useState('courses')
  const [myCourses, setMyCourses] = useState([])
  const [isLoadingCourses, setIsLoadingCourses] = useState(false)
  const [adminSubTab, setAdminSubTab] = useState('users')
  const [paymentMethods, setPaymentMethods] = useState([])
  const [paymentSubmissions, setPaymentSubmissions] = useState([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')
  const [paymentActionLoadingId, setPaymentActionLoadingId] = useState(null)
  const [studentEnrollments, setStudentEnrollments] = useState([])
  const [studentPayments, setStudentPayments] = useState([])
  const [isLoadingStudentHistory, setIsLoadingStudentHistory] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    payment_type: 'vodafone_cash',
    display_name: 'Vodafone Cash',
    payment_details: '',
    instructions: ''
  })
  
  const ArrowIcon = isRTL ? FiArrowLeft : FiArrowRight

  // Get enrolled courses
  const enrolledCourses = courses.filter(course => 
    user?.enrolledCourses?.includes(course.id)
  )

  const completedCourses = enrolledCourses.filter(course => 
    user?.progress?.[course.id] === 100
  )

  const inProgressCourses = enrolledCourses.filter(course => 
    user?.progress?.[course.id] > 0 && user?.progress?.[course.id] < 100
  )

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
      label: language === 'ar' ? 'ساعات التعلم' : 'Learning Hours',
      color: 'from-purple-500 to-pink-600'
    }
  ]

  // Check if user is a teacher/instructor
  const isTeacher = user?.role === 'teacher' || user?.role === 'instructor' || user?.role === 'admin'
  
  // Check if user is an admin
  const isAdmin = user?.role === 'admin'

  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || (language === 'ar' ? 'مستخدم' : 'User')
  const displayEmail = user?.email || ''
  const normalizedRole = user?.role === 'instructor' ? 'teacher' : (user?.role || 'student')
  const roleLabel = {
    student: language === 'ar' ? 'طالب' : 'Student',
    teacher: language === 'ar' ? 'مدرس' : 'Teacher',
    admin: language === 'ar' ? 'مدير' : 'Admin'
  }[normalizedRole] || normalizedRole

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

  // Fetch teacher's courses
  useEffect(() => {
    const fetchMyCourses = async () => {
      if (!isTeacher || !user?.id) return
      
      setIsLoadingCourses(true)
      try {
        const data = await courseService.getInstructorCourses(user.id)
        setMyCourses(data || [])
      } catch (error) {
        console.error('Error fetching my courses:', error)
      } finally {
        setIsLoadingCourses(false)
      }
    }
    
    fetchMyCourses()
  }, [isTeacher, user?.id])

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
    const fetchStudentHistory = async () => {
      if (!user?.id || isAdmin || isTeacher) return

      setIsLoadingStudentHistory(true)
      try {
        const [enrollments, payments] = await Promise.all([
          enrollmentService.getUserEnrollments(),
          paymentService.getStudentPaymentSubmissions(user.id)
        ])

        setStudentEnrollments(enrollments || [])
        setStudentPayments(payments || [])
      } catch (error) {
        console.error('Error fetching student history:', error)
      } finally {
        setIsLoadingStudentHistory(false)
      }
    }

    fetchStudentHistory()
  }, [user?.id, isAdmin, isTeacher])

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
      const defaultMessage = language === 'ar'
        ? 'فشل حفظ وسيلة الدفع. يمكنك إدخال نص عادي أو JSON صحيح.'
        : 'Failed to save payment method. Enter plain text or valid JSON object.'
      setPaymentError(error.message || defaultMessage)
    }
  }

  const handlePaymentReview = async (submissionId, action) => {
    if (!user?.id) return

    try {
      setPaymentError('')
      setPaymentSuccess('')
      setPaymentActionLoadingId(submissionId)

      if (action === 'approve') {
        await paymentService.approvePaymentSubmission({ submissionId, reviewerId: user.id })
      } else {
        await paymentService.rejectPaymentSubmission({ submissionId, reviewerId: user.id })
      }

      const submissions = await paymentService.getAllPaymentSubmissions()
      setPaymentSubmissions(submissions)
      setPaymentSuccess(
        language === 'ar'
          ? (action === 'approve' ? 'تم قبول الدفع بنجاح' : 'تم رفض الدفع بنجاح')
          : (action === 'approve' ? 'Payment approved successfully' : 'Payment rejected successfully')
      )
    } catch (error) {
      setPaymentError(error.message || 'Failed to update payment status')
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

  const sidebarLinks = [
    { id: 'courses', icon: FiBook, label: t('dashboard.myCourses') },
    ...(isTeacher ? [{ id: 'teacher', icon: FiPlusCircle, label: language === 'ar' ? 'إدارة الكورسات' : 'Manage Courses' }] : []),
    ...(isAdmin ? [{ id: 'admin', icon: FiShield, label: language === 'ar' ? 'لوحة الإدارة' : 'Admin Panel' }] : []),
    { id: 'progress', icon: FiTrendingUp, label: t('dashboard.progress') },
    { id: 'certificates', icon: FiAward, label: t('dashboard.certificates') },
    { id: 'settings', icon: FiSettings, label: t('dashboard.settings') },
  ]

  return (
    <div className="min-h-screen pt-20 pb-16 bg-secondary-50 dark:bg-dark-bg">
      <div className="container-custom">
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
                {language === 'ar' 
                  ? 'استمر في التعلم وحقق أهدافك'
                  : 'Keep learning and achieve your goals'
                }
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              {isTeacher && (
                <Link
                  to="/teacher/create-course"
                  className="btn bg-green-500 hover:bg-green-600 text-white"
                >
                  <FiPlusCircle className="w-5 h-5" />
                  {language === 'ar' ? 'إنشاء كورس' : 'Create Course'}
                </Link>
              )}
              <Link
                to="/courses"
                className="btn bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
              >
                {language === 'ar' ? 'تصفح الدورات' : 'Browse Courses'}
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
          <div className="lg:col-span-1">
            <div className="card overflow-hidden">
              {sidebarLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`w-full flex items-center gap-3 px-4 py-4 transition-colors ${
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

          {/* Main Content */}
          <div className="lg:col-span-3">
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
                    <div className="card card-body">
                      <h3 className="text-lg font-bold mb-4">
                        {language === 'ar' ? 'الدورات التي تم شراؤها' : 'Purchased Courses'}
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
                                  {language === 'ar' ? 'تاريخ الشراء:' : 'Purchased on:'} {new Date(enrollment.enrolled_at).toLocaleDateString()}
                                </p>
                              </div>
                              <Link to={`/courses/${enrollment.course?.id}/learn`} className="btn btn-primary btn-sm">
                                {language === 'ar' ? 'دخول الدورة' : 'Open Course'}
                              </Link>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-secondary-500 text-sm">
                          {language === 'ar' ? 'لا توجد دورات تم شراؤها بعد' : 'No purchased courses yet'}
                        </p>
                      )}
                    </div>

                    <div className="card card-body">
                      <h3 className="text-lg font-bold mb-4">
                        {language === 'ar' ? 'سجل المدفوعات' : 'Payment History'}
                      </h3>

                      {studentPayments.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 px-2">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                                <th className="text-left py-2 px-2">{language === 'ar' ? 'الدورة' : 'Course'}</th>
                                <th className="text-left py-2 px-2">{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                                <th className="text-left py-2 px-2">{language === 'ar' ? 'الطريقة' : 'Method'}</th>
                                <th className="text-left py-2 px-2">{language === 'ar' ? 'مرجع العملية' : 'Reference'}</th>
                                <th className="text-left py-2 px-2">{language === 'ar' ? 'تفاصيل الدفع' : 'Payment Details'}</th>
                                <th className="text-left py-2 px-2">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                                <th className="text-left py-2 px-2">{language === 'ar' ? 'ملاحظات المراجعة' : 'Review Notes'}</th>
                                <th className="text-left py-2 px-2">{language === 'ar' ? 'الإيصال' : 'Proof'}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentPayments.map((payment) => (
                                <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800">
                                  <td className="py-2 px-2 whitespace-nowrap">
                                    {new Date(payment.submitted_at || payment.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="py-2 px-2">{payment.courses?.title || payment.course_id}</td>
                                  <td className="py-2 px-2">${payment.amount}</td>
                                  <td className="py-2 px-2">{payment.payment_method?.display_name || payment.payment_method_id}</td>
                                  <td className="py-2 px-2">{payment.transaction_reference || '-'}</td>
                                  <td className="py-2 px-2 max-w-[260px]">
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
                                      {language === 'ar' ? 'عرض' : 'View'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-secondary-500 text-sm">
                          {language === 'ar' ? 'لا توجد عمليات دفع بعد' : 'No payment transactions yet'}
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
                      {language === 'ar' ? 'لا توجد دورات مسجلة' : 'No Enrolled Courses'}
                    </h3>
                    <p className="text-secondary-500 mb-6">
                      {language === 'ar' 
                        ? 'ابدأ رحلة التعلم الآن واشترك في الدورات المميزة'
                        : 'Start your learning journey now and enroll in featured courses'
                      }
                    </p>
                    <Link to="/courses" className="btn btn-primary mx-auto">
                      {language === 'ar' ? 'تصفح الدورات' : 'Browse Courses'}
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
                    {language === 'ar' ? 'إدارة الكورسات' : 'Manage Courses'}
                  </h2>
                  <Link to="/teacher/create-course" className="btn btn-primary">
                    <FiPlusCircle className="w-5 h-5" />
                    {language === 'ar' ? 'إنشاء كورس جديد' : 'Create New Course'}
                  </Link>
                </div>

                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* Quick Stats for Teachers */}
                  <div className="card card-body bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    <FiBook className="w-10 h-10 mb-3" />
                    <div className="text-3xl font-bold">{myCourses.length}</div>
                    <div className="text-white/80">{language === 'ar' ? 'كورساتي' : 'My Courses'}</div>
                  </div>
                  <div className="card card-body bg-gradient-to-br from-green-500 to-teal-600 text-white">
                    <FiUser className="w-10 h-10 mb-3" />
                    <div className="text-3xl font-bold">0</div>
                    <div className="text-white/80">{language === 'ar' ? 'الطلاب المسجلين' : 'Enrolled Students'}</div>
                  </div>
                </div>

                {/* My Courses Section */}
                <div className="card card-body mb-8">
                  <h3 className="text-lg font-bold mb-4">
                    {language === 'ar' ? 'كورساتي' : 'My Courses'}
                  </h3>
                  
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
                              <span>{course.lessonsCount || 0} {language === 'ar' ? 'دروس' : 'lessons'}</span>
                              <span className={`flex items-center gap-1 ${course.is_published ? 'text-green-500' : 'text-orange-500'}`}>
                                {course.is_published ? <FiEye className="w-4 h-4" /> : <FiEyeOff className="w-4 h-4" />}
                                {course.is_published
                                  ? (language === 'ar' ? 'منشور' : 'Published')
                                  : (language === 'ar' ? 'مسودة' : 'Draft')
                                }
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/courses/${course.id}`}
                              className="btn btn-sm btn-secondary"
                              title={language === 'ar' ? 'عرض' : 'View'}
                            >
                              <FiEye className="w-4 h-4" />
                            </Link>
                            <Link
                              to={`/teacher/edit-course/${course.id}`}
                              className="btn btn-sm btn-secondary"
                              title={language === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <FiEdit className="w-4 h-4" />
                            </Link>
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
                        {language === 'ar' ? 'لم تقم بإنشاء أي كورسات بعد' : "You haven't created any courses yet"}
                      </p>
                      <Link to="/teacher/create-course" className="btn btn-primary">
                        <FiPlusCircle className="w-5 h-5" />
                        {language === 'ar' ? 'إنشاء كورس' : 'Create Course'}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="card card-body">
                  <h3 className="text-lg font-bold mb-4">
                    {language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Link
                      to="/teacher/create-course"
                      className="p-4 border-2 border-dashed border-primary-300 rounded-xl text-center hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <FiPlusCircle className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                      <div className="font-medium">{language === 'ar' ? 'إنشاء كورس' : 'Create Course'}</div>
                    </Link>
                    <Link
                      to="/teacher/create-course"
                      className="p-4 border-2 border-dashed border-green-300 rounded-xl text-center hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                      <FiVideo className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <div className="font-medium">{language === 'ar' ? 'جلسة مباشرة' : 'Live Session'}</div>
                    </Link>
                    <Link
                      to="/courses"
                      className="p-4 border-2 border-dashed border-orange-300 rounded-xl text-center hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                    >
                      <FiBook className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                      <div className="font-medium">{language === 'ar' ? 'السوق' : 'Marketplace'}</div>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Tab */}
            {activeTab === 'admin' && isAdmin && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {language === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}
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
                    <FiUsers className="w-4 h-4 inline mr-2" />
                    {language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
                  </button>
                  <button
                    onClick={() => setAdminSubTab('payments')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      adminSubTab === 'payments'
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FiDollarSign className="w-4 h-4 inline mr-2" />
                    {language === 'ar' ? 'إدارة المدفوعات' : 'Payment Management'}
                  </button>
                </div>

                {/* Users Management */}
                {adminSubTab === 'users' && <UserManagement />}

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
                        <div className="text-white/80">{language === 'ar' ? 'إجمالي المدفوعات' : 'Total Payments'}</div>
                      </div>
                      <div className="card card-body bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        <FiClock className="w-10 h-10 mb-3" />
                        <div className="text-3xl font-bold">
                          {paymentSubmissions.filter((s) => s.status === 'pending').length}
                        </div>
                        <div className="text-white/80">{language === 'ar' ? 'المدفوعات المعلقة' : 'Pending Payments'}</div>
                      </div>
                      <div className="card card-body bg-gradient-to-br from-purple-500 to-pink-600 text-white">
                        <FiCreditCard className="w-10 h-10 mb-3" />
                        <div className="text-3xl font-bold">{paymentMethods.length}</div>
                        <div className="text-white/80">{language === 'ar' ? 'طرق الدفع النشطة' : 'Active Payment Methods'}</div>
                      </div>
                    </div>

                    {paymentError && (
                      <div className="mb-6 rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
                        {paymentError}
                      </div>
                    )}

                    {paymentSuccess && (
                      <div className="mb-6 rounded-lg border border-green-300 bg-green-50 text-green-700 px-4 py-3 text-sm">
                        {paymentSuccess}
                      </div>
                    )}

                    {/* Create Payment Method */}
                    <div className="card card-body mb-8">
                      <h3 className="text-lg font-bold mb-4">
                        {language === 'ar' ? 'إضافة وسيلة دفع' : 'Add Payment Method'}
                      </h3>

                      <form onSubmit={handlePaymentMethodCreate} className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="label">{language === 'ar' ? 'نوع الدفع' : 'Payment Type'}</label>
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
                          <label className="label">{language === 'ar' ? 'الاسم المعروض' : 'Display Name'}</label>
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
                            {language === 'ar' ? 'تفاصيل الدفع' : 'Payment Details'}
                          </label>
                          <textarea
                            className="input min-h-[100px]"
                            value={paymentForm.payment_details}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, payment_details: e.target.value }))}
                            placeholder={language === 'ar'
                              ? 'مثال: +2010xxxxxxx أو pay@paypal.com أو 0x.... ويمكنك أيضا إدخال JSON'
                              : 'Example: +2010xxxxxxx or pay@paypal.com or 0x.... You can also enter JSON'}
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="label">{language === 'ar' ? 'تعليمات التحويل' : 'Payment Instructions'}</label>
                          <textarea
                            className="input min-h-[100px]"
                            value={paymentForm.instructions}
                            onChange={(e) => setPaymentForm((prev) => ({ ...prev, instructions: e.target.value }))}
                            placeholder={language === 'ar' ? 'مثال: اكتب اسمك في ملاحظات التحويل' : 'Example: add your name in transfer note'}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <button type="submit" className="btn btn-primary">
                            {language === 'ar' ? 'حفظ وسيلة الدفع' : 'Save Payment Method'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active Payment Methods */}
                    <div className="card card-body mb-8">
                      <h3 className="text-lg font-bold mb-4">
                        {language === 'ar' ? 'وسائل الدفع المتاحة' : 'Active Payment Methods'}
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
                            {language === 'ar' ? 'لا توجد وسائل دفع بعد' : 'No payment methods yet'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Recent Payment Submissions */}
                    <div className="card card-body">
                      <h3 className="text-lg font-bold mb-4">
                        {language === 'ar' ? 'طلبات الدفع الأخيرة' : 'Recent Payment Submissions'}
                      </h3>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <th className="text-left py-3 px-4 font-medium">
                                {language === 'ar' ? 'الطالب' : 'Student'}
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                {language === 'ar' ? 'المبلغ' : 'Amount'}
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                {language === 'ar' ? 'الحالة' : 'Status'}
                              </th>
                              <th className="text-left py-3 px-4 font-medium">
                                {language === 'ar' ? 'الإجراءات' : 'Actions'}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {isLoadingPayments && (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-gray-500">
                                  {language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
                                </td>
                              </tr>
                            )}

                            {!isLoadingPayments && paymentSubmissions.map((submission) => (
                              <tr key={submission.id} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-3 px-4">
                                  {submission.students?.full_name || submission.students?.email || 'Student'}
                                </td>
                                <td className="py-3 px-4">${submission.amount}</td>
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
                                        onClick={() => handlePaymentReview(submission.id, 'approve')}
                                        disabled={paymentActionLoadingId === submission.id}
                                        className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                                      >
                                        {paymentActionLoadingId === submission.id
                                          ? (language === 'ar' ? 'جارٍ التنفيذ...' : 'Processing...')
                                          : (language === 'ar' ? 'قبول' : 'Approve')}
                                      </button>
                                      <button
                                        onClick={() => handlePaymentReview(submission.id, 'reject')}
                                        disabled={paymentActionLoadingId === submission.id}
                                        className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                                      >
                                        {paymentActionLoadingId === submission.id
                                          ? (language === 'ar' ? 'جارٍ التنفيذ...' : 'Processing...')
                                          : (language === 'ar' ? 'رفض' : 'Reject')}
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPaymentProof(submission.payment_screenshot_url)}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 inline-block"
                                    >
                                      {language === 'ar' ? 'عرض الإيصال' : 'View Proof'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}

                            {!isLoadingPayments && paymentSubmissions.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-6 text-center text-gray-500">
                                  {language === 'ar' ? 'لا توجد طلبات دفع بعد' : 'No payment submissions yet'}
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
                      const title = language === 'ar' ? course.title : course.titleEn
                      
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
                      {language === 'ar' ? 'لا توجد بيانات تقدم' : 'No progress data available'}
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
                      const title = language === 'ar' ? course.title : course.titleEn
                      
                      return (
                        <div key={course.id} className="card overflow-hidden">
                          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-6 text-white text-center">
                            <FiAward className="w-16 h-16 mx-auto mb-4" />
                            <h3 className="text-xl font-bold">{language === 'ar' ? 'شهادة إتمام' : 'Certificate of Completion'}</h3>
                          </div>
                          <div className="p-6">
                            <h4 className="font-bold mb-2">{title}</h4>
                            <p className="text-sm text-secondary-500 mb-4">
                              {language === 'ar' ? 'تم الإتمام بنجاح' : 'Successfully Completed'}
                            </p>
                            <button className="btn btn-primary w-full">
                              {language === 'ar' ? 'تحميل الشهادة' : 'Download Certificate'}
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
                      {language === 'ar' ? 'لا توجد شهادات' : 'No Certificates Yet'}
                    </h3>
                    <p className="text-secondary-500">
                      {language === 'ar' 
                        ? 'أكمل دوراتك للحصول على شهادات معتمدة'
                        : 'Complete your courses to earn certificates'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{t('dashboard.settings')}</h2>
                
                <div className="card card-body">
                  <form className="space-y-6">
                    <div>
                      <label className="label">{t('auth.register.name')}</label>
                      <input
                        type="text"
                        className="input"
                        defaultValue={user?.name}
                      />
                    </div>
                    <div>
                      <label className="label">{t('auth.register.email')}</label>
                      <input
                        type="email"
                        className="input"
                        defaultValue={user?.email}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary">
                      {t('common.save')}
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