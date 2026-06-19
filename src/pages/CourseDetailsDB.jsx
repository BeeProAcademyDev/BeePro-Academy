import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { enrollmentService, meetingService } from '../services/api'
import { paymentService } from '../services/paymentAPI'
import { getMeetingJoinTarget, pickJoinableMeeting } from '../lib/jitsi'
import { isStudentUser } from '../lib/roles'
import { getLandingAuthUrl } from '../lib/authRoutes'
import Button from '../components/ui/Button'
import { 
  FiPlay, 
  FiClock, 
  FiUsers, 
  FiStar, 
  FiBookOpen,
  FiAward,
  FiGlobe,
  FiCheck,
  FiLock,
  FiChevronDown,
  FiChevronUp,
  FiShare2,
  FiHeart,
  FiArrowRight,
  FiArrowLeft,
  FiUser,
  FiVideo,
  FiMessageCircle
} from 'react-icons/fi'

const CourseDetailsDB = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState([])
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [hasApprovedPayment, setHasApprovedPayment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState(['section-1'])
  const [liveMeetings, setLiveMeetings] = useState([])
  const isPaidCourse = Number(course?.price || 0) > 0
  const isStudent = isStudentUser(user)

  const hasCourseAccess = isEnrolled || hasApprovedPayment

  const joinableMeeting = useMemo(
    () => pickJoinableMeeting(liveMeetings),
    [liveMeetings]
  )
  
  const ArrowIcon = isRTL ? FiArrowLeft : FiArrowRight

  const renderJoinSessionLink = (className = 'btn btn-primary w-full inline-flex items-center justify-center gap-2') => {
    const joinTarget = joinableMeeting ? getMeetingJoinTarget(joinableMeeting) : null

    if (joinTarget?.type === 'external') {
      return (
        <a
          href={joinTarget.url}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          <FiVideo className="w-5 h-5" />
          {language === 'ar' ? 'الانضمام للجلسة المباشرة' : 'Join Live Session'}
        </a>
      )
    }

    if (joinTarget?.type === 'jitsi') {
      return (
        <Link
          to={`/courses/${course.id}/learn?session=${joinableMeeting.id}`}
          className={className}
        >
          <FiVideo className="w-5 h-5" />
          {language === 'ar' ? 'الانضمام للجلسة المباشرة' : 'Join Live Session'}
        </Link>
      )
    }

    return (
      <Link
        to={`/courses/${course.id}/learn?session=live`}
        className={className}
      >
        <FiVideo className="w-5 h-5" />
        {language === 'ar' ? 'الانضمام للجلسة المباشرة' : 'Join Live Session'}
      </Link>
    )
  }

  // Fetch course details
  useEffect(() => {
    fetchCourseData()
  }, [id])

  // Check enrollment status
  useEffect(() => {
    if (isAuthenticated && user && course) {
      checkEnrollmentStatus()
    }
  }, [isAuthenticated, user, course])

  useEffect(() => {
    const loadLiveMeetings = async () => {
      if (!course?.id || !hasCourseAccess) {
        setLiveMeetings([])
        return
      }

      try {
        const meetings = await meetingService.getMeetingsByCourse(course.id)
        setLiveMeetings(meetings || [])
      } catch (err) {
        console.error('Live meetings fetch error:', err)
        setLiveMeetings([])
      }
    }

    loadLiveMeetings()
  }, [course?.id, hasCourseAccess])

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch course with instructor details
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          users:instructor_id (
            full_name,
            email,
            avatar_url,
            bio
          )
        `)
        .eq('id', id)
        .eq('is_published', true)
        .single()

      if (courseError) {
        console.error('Course fetch error:', courseError)
        setError('Course not found')
        return
      }

      setCourse(courseData)

      // Fetch course lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', id)
        .eq('is_published', true)
        .order('order_index', { ascending: true })

      if (lessonsError) {
        console.error('Lessons fetch error:', lessonsError)
      } else {
        setLessons(lessonsData || [])
      }

    } catch (err) {
      console.error('Fetch error:', err)
      setError('Failed to load course')
    } finally {
      setLoading(false)
    }
  }

  const checkEnrollmentStatus = async () => {
    if (!user || !course) return

    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      const enrolled = !!data
      setIsEnrolled(enrolled)

      const paidCourse = Number(course.price || 0) > 0
      if (!enrolled && paidCourse) {
        const approved = await paymentService.hasApprovedPaymentForCourse(user.id, course.id)
        setHasApprovedPayment(approved)
      } else {
        setHasApprovedPayment(false)
      }
    } catch (err) {
      console.error('Enrollment check error:', err)
      setIsEnrolled(false)
      setHasApprovedPayment(false)
    }
  }

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      const redirectPath = isPaidCourse
        ? `/courses/${course?.id}/checkout`
        : `/courses/${course?.id}`
      navigate(getLandingAuthUrl('login', { redirect: redirectPath }))
      return
    }

    if (!user || !course) return

    if (!isStudent && isPaidCourse) {
      setError(language === 'ar' ? 'الدفع متاح للطلاب فقط' : 'Payment is allowed for students only')
      return
    }

    if (!isPaidCourse) {
      setEnrolling(true)
      setError(null)
      try {
        await enrollmentService.enrollInCourse(course.id)
        setIsEnrolled(true)
        navigate(`/courses/${course.id}/learn`)
      } catch (err) {
        setError(
          err.message
          || (language === 'ar' ? 'تعذر التسجيل في الدورة' : 'Failed to enroll in course')
        )
      } finally {
        setEnrolling(false)
      }
      return
    }

    navigate(`/courses/${course.id}/checkout`)
  }

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">
            {language === 'ar' ? 'الدورة غير موجودة' : 'Course Not Found'}
          </h2>
          <Button to="/courses" variant="primary">
            {language === 'ar' ? 'تصفح الدورات' : 'Browse Courses'}
          </Button>
        </div>
      </div>
    )
  }

  const instructor = course.users || {}
  const courseFeatures = [
    { icon: FiClock, label: language === 'ar' ? `محتوى شامل` : `Comprehensive content` },
    { icon: FiBookOpen, label: language === 'ar' ? `${lessons.length} درس` : `${lessons.length} lessons` },
    { icon: FiGlobe, label: language === 'ar' ? 'الوصول مدى الحياة' : 'Lifetime access' },
    { icon: FiAward, label: language === 'ar' ? 'شهادة إتمام' : 'Certificate of completion' },
  ]

  const tabs = [
    { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview' },
    { id: 'curriculum', label: t('course.curriculum') },
    { id: 'instructor', label: t('course.instructor') },
  ]

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-secondary-900 to-secondary-800 text-white py-12 md:py-16">
        <div className="container-custom">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Course Info */}
            <div className="lg:col-span-2">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-secondary-400 mb-4">
                <Link to="/" className="hover:text-white">{t('nav.home')}</Link>
                <span>/</span>
                <Link to="/courses" className="hover:text-white">{t('nav.courses')}</Link>
                <span>/</span>
                <span className="text-white">{course.title}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`badge ${
                  course.level === 'beginner' ? 'bg-green-500' :
                  course.level === 'intermediate' ? 'bg-yellow-500' : 'bg-red-500'
                } text-white px-3 py-1`}>
                  {t(`course.level.${course.level}`)}
                </span>
                <span className="badge bg-primary-500 text-white px-3 py-1">
                  {course.category}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
              <p className="text-lg text-secondary-300 mb-6">{course.description}</p>

              {/* Instructor */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center">
                  {instructor.avatar_url ? (
                    <img
                      src={instructor.avatar_url}
                      alt={instructor.full_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <FiUser className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-secondary-400">{t('course.instructor')}</p>
                  <p className="font-medium">{instructor.full_name || 'Instructor'}</p>
                  {instructor.bio && (
                    <p className="text-sm text-secondary-300 mt-1 line-clamp-2">{instructor.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Course Card (Desktop) */}
            <div className="hidden lg:block">
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl overflow-hidden sticky top-24">
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gradient-to-br from-primary-500 to-secondary-500">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FiBookOpen className="w-16 h-16 text-white opacity-50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
                    {hasCourseAccess ? (
                      (() => {
                        const joinTarget = joinableMeeting ? getMeetingJoinTarget(joinableMeeting) : null
                        if (joinTarget?.type === 'external') {
                          return (
                            <a
                              href={joinTarget.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex flex-col items-center gap-2"
                              title={language === 'ar' ? 'انضم للجلسة المباشرة' : 'Join live session'}
                            >
                              <span className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <FiVideo className="w-7 h-7" />
                              </span>
                              <span className="text-sm font-semibold text-white drop-shadow">
                                {language === 'ar' ? 'انضم للجلسة' : 'Join Session'}
                              </span>
                            </a>
                          )
                        }

                        return (
                          <Link
                            to={
                              joinableMeeting
                                ? `/courses/${course.id}/learn?session=${joinableMeeting.id}`
                                : `/courses/${course.id}/learn?session=live`
                            }
                            className="group flex flex-col items-center gap-2"
                            title={language === 'ar' ? 'انضم للجلسة المباشرة' : 'Join live session'}
                          >
                            <span className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                              <FiVideo className="w-7 h-7" />
                            </span>
                            <span className="text-sm font-semibold text-white drop-shadow">
                              {language === 'ar' ? 'انضم للجلسة' : 'Join Session'}
                            </span>
                          </Link>
                        )
                      })()
                    ) : (
                      <span className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                        <FiPlay className="w-6 h-6 text-primary-500 ms-1" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & CTA */}
                <div className="p-6 text-secondary-900 dark:text-white">
                  <div className="text-3xl font-bold text-green-500 mb-4">
                    {isPaidCourse ? `$${course.price}` : (language === 'ar' ? 'مجاني' : 'Free')}
                  </div>

                  {hasCourseAccess ? (
                    <div className="space-y-3">
                      {renderJoinSessionLink()}
                      <Button to={`/courses/${course.id}/learn`} fullWidth icon={ArrowIcon} iconPosition="end" variant="outline">
                        {language === 'ar' ? 'متابعة التعلم' : 'Continue Learning'}
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleEnroll}
                      fullWidth 
                      size="lg"
                      disabled={enrolling || (isPaidCourse && !isStudent)}
                    >
                      {enrolling
                        ? (language === 'ar' ? 'جاري التسجيل...' : 'Enrolling...')
                        : (isPaidCourse && !isStudent)
                          ? (language === 'ar' ? 'الدفع للطلاب فقط' : 'Students Only')
                          : isPaidCourse
                            ? (language === 'ar' ? 'ادفع للحصول على الدورة' : 'Pay to Get Course')
                            : (language === 'ar' ? 'سجّل مجاناً' : 'Enroll for Free')
                      }
                    </Button>
                  )}

                  {isAuthenticated && isStudent && (
                    <Link
                      to={`/courses/${course.id}/learn?tab=chat`}
                      className="btn btn-secondary w-full mt-3 inline-flex items-center justify-center gap-2"
                    >
                      <FiMessageCircle className="w-4 h-4" />
                      {language === 'ar' ? 'الدردشة مع المدرس' : 'Chat with instructor'}
                    </Link>
                  )}

                  {/* Features */}
                  <div className="mt-6 pt-6 border-t border-secondary-200 dark:border-dark-border space-y-3">
                    {courseFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <feature.icon className="w-5 h-5 text-primary-500" />
                        <span className="text-sm">{feature.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile Course Card */}
      <div className="lg:hidden sticky top-16 z-40 bg-white dark:bg-dark-card shadow-md p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-green-500">
              {isPaidCourse ? `$${course.price}` : (language === 'ar' ? 'مجاني' : 'Free')}
            </span>
          </div>
          {hasCourseAccess ? (
            <div className="flex items-center gap-2">
              {renderJoinSessionLink('btn btn-primary btn-sm inline-flex items-center gap-2')}
              <Button to={`/courses/${course.id}/learn`} icon={ArrowIcon} iconPosition="end" variant="outline" size="sm">
                {language === 'ar' ? 'متابعة' : 'Continue'}
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleEnroll}
              disabled={enrolling || (isPaidCourse && !isStudent)}
            >
              {enrolling
                ? (language === 'ar' ? 'تسجيل...' : 'Enrolling...')
                : (isPaidCourse && !isStudent)
                  ? (language === 'ar' ? 'للطلاب فقط' : 'Students Only')
                  : isPaidCourse
                    ? (language === 'ar' ? 'ادفع' : 'Pay')
                    : (language === 'ar' ? 'مجاني' : 'Free')
              }
            </Button>
          )}
        </div>
      </div>

      {/* Content Section */}
      <section className="py-8">
        <div className="container-custom">
          <div className="lg:w-2/3">
            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-8 border-b border-secondary-200 dark:border-dark-border">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-500'
                      : 'border-transparent text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-4">
                    {language === 'ar' ? 'وصف الدورة' : 'Course Description'}
                  </h2>
                  <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed">
                    {course.description}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'curriculum' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">{t('course.curriculum')}</h2>
                  <span className="text-sm text-secondary-500">
                    {lessons.length} {language === 'ar' ? 'درس' : 'lessons'}
                  </span>
                </div>

                {/* Curriculum Sections */}
                <div className="border border-secondary-200 dark:border-dark-border rounded-xl overflow-hidden">
                  <div>
                    <button
                      onClick={() => toggleSection('section-1')}
                      className="w-full flex items-center justify-between p-4 bg-secondary-50 dark:bg-dark-border hover:bg-secondary-100 dark:hover:bg-dark-card transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedSections.includes('section-1') ? (
                          <FiChevronUp className="w-5 h-5" />
                        ) : (
                          <FiChevronDown className="w-5 h-5" />
                        )}
                        <span className="font-medium">
                          {language === 'ar' ? 'محتوى الدورة' : 'Course Content'}
                        </span>
                      </div>
                      <span className="text-sm text-secondary-500">
                        {lessons.length} {language === 'ar' ? 'درس' : 'lessons'}
                      </span>
                    </button>

                    {expandedSections.includes('section-1') && (
                      <div className="divide-y divide-secondary-100 dark:divide-dark-border">
                        {lessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-4 hover:bg-secondary-50 dark:hover:bg-dark-border/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isEnrolled || hasCourseAccess ? (
                                <FiPlay className="w-5 h-5 text-primary-500" />
                              ) : (
                                <FiLock className="w-5 h-5 text-secondary-400" />
                              )}
                              <span className={!(isEnrolled || hasCourseAccess) ? 'text-secondary-400' : ''}>
                                {lesson.title}
                              </span>
                            </div>
                          </div>
                        ))}
                        {lessons.length === 0 && (
                          <div className="p-4 text-center text-secondary-500">
                            {language === 'ar' ? 'لا توجد دروس حتى الآن' : 'No lessons yet'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'instructor' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{t('course.instructor')}</h2>
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 rounded-full bg-primary-500 flex items-center justify-center">
                    {instructor.avatar_url ? (
                      <img
                        src={instructor.avatar_url}
                        alt={instructor.full_name}
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <FiUser className="w-12 h-12 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{instructor.full_name || 'Instructor'}</h3>
                    <p className="text-secondary-500 mb-4">{instructor.email}</p>
                    {instructor.bio && (
                      <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed">
                        {instructor.bio}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default CourseDetailsDB
