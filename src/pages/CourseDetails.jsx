import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAuth } from '../contexts/AuthContext'
import { getLandingAuthUrl } from '../lib/authRoutes'
import Button from '../components/ui/Button'
import { courses, courseLessons } from '../data/courses'
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
  FiArrowLeft
} from 'react-icons/fi'

const CourseDetails = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const { formatCoursePrice } = useCurrency()
  const { user, isAuthenticated } = useAuth()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedSections, setExpandedSections] = useState(['section-1'])
  
  const course = courses.find(c => c.id === id)
  const lessons = courseLessons[id] || []
  const priceDisplay = course ? formatCoursePrice(course.price) : null
  const originalPriceDisplay = course?.originalPrice
    ? formatCoursePrice(course.originalPrice).full
    : null
  
  const ArrowIcon = isRTL ? FiArrowLeft : FiArrowRight
  
  if (!course) {
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

  const isEnrolled = isAuthenticated && user?.enrolledCourses?.includes(course.id)
  const progress = user?.progress?.[course.id] || 0

  const title = language === 'ar' ? course.title : course.titleEn
  const description = language === 'ar' ? course.description : course.descriptionEn
  const instructorName = language === 'ar' ? course.instructor.name : course.instructor.nameEn
  const instructorTitle = language === 'ar' ? course.instructor.title : course.instructor.titleEn

  const tabs = [
    { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview' },
    { id: 'curriculum', label: t('course.curriculum') },
    { id: 'instructor', label: t('course.instructor') },
    { id: 'reviews', label: t('course.reviews') },
  ]

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const courseFeatures = [
    { icon: FiClock, label: language === 'ar' ? `${course.duration} ساعة محتوى` : `${course.duration} hours of content` },
    { icon: FiBookOpen, label: language === 'ar' ? `${course.lessons} درس` : `${course.lessons} lessons` },
    { icon: FiGlobe, label: language === 'ar' ? 'الوصول مدى الحياة' : 'Lifetime access' },
    { icon: FiAward, label: language === 'ar' ? 'شهادة إتمام' : 'Certificate of completion' },
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
                <span className="text-white">{title}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {course.isBestseller && (
                  <span className="badge bg-yellow-500 text-white px-3 py-1">Bestseller</span>
                )}
                <span className={`badge ${
                  course.level === 'beginner' ? 'bg-green-500' :
                  course.level === 'intermediate' ? 'bg-yellow-500' : 'bg-red-500'
                } text-white px-3 py-1`}>
                  {t(`course.level.${course.level}`)}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
              <p className="text-lg text-secondary-300 mb-6">{description}</p>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                  <FiStar className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-bold">{course.rating}</span>
                  <span className="text-secondary-400">({course.reviews} {t('course.reviews')})</span>
                </div>
                <div className="flex items-center gap-1 text-secondary-300">
                  <FiUsers className="w-5 h-5" />
                  <span>{course.students.toLocaleString()} {t('course.students')}</span>
                </div>
              </div>

              {/* Instructor */}
              <div className="flex items-center gap-3">
                <img
                  src={course.instructor.avatar}
                  alt={instructorName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm text-secondary-400">{t('course.instructor')}</p>
                  <p className="font-medium">{instructorName}</p>
                </div>
              </div>
            </div>

            {/* Course Card (Desktop) */}
            <div className="hidden lg:block">
              <div className="bg-white dark:bg-dark-card rounded-xl shadow-xl overflow-hidden sticky top-24">
                {/* Video Preview */}
                <div className="relative aspect-video">
                  <img
                    src={course.thumbnail}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <button className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                      <FiPlay className="w-6 h-6 text-primary-500 ms-1" />
                    </button>
                  </div>
                </div>

                {/* Price & CTA */}
                <div className="p-6 text-secondary-900 dark:text-white">
                  {course.isFree ? (
                    <div className="text-3xl font-bold text-green-500 mb-4">{t('course.free')}</div>
                  ) : (
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl font-bold">{priceDisplay?.full}</span>
                      {originalPriceDisplay && course.originalPrice > course.price && (
                        <span className="text-xl text-secondary-400 line-through">{originalPriceDisplay}</span>
                      )}
                    </div>
                  )}

                  {isEnrolled ? (
                    <>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span>{t('course.progress')}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-2 bg-secondary-200 dark:bg-dark-border rounded-full">
                          <div 
                            className="h-full bg-primary-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      <Button to={`/courses/${course.id}/learn`} fullWidth icon={ArrowIcon} iconPosition="end">
                        {t('course.continue')}
                      </Button>
                    </>
                  ) : (
                    <Button to={getLandingAuthUrl('login')} fullWidth size="lg">
                      {t('course.enroll')}
                    </Button>
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

                  {/* Share & Wishlist */}
                  <div className="flex items-center gap-4 mt-6 pt-6 border-t border-secondary-200 dark:border-dark-border">
                    <button className="flex-1 btn btn-secondary flex items-center justify-center gap-2">
                      <FiShare2 className="w-5 h-5" />
                      {language === 'ar' ? 'مشاركة' : 'Share'}
                    </button>
                    <button className="flex-1 btn btn-secondary flex items-center justify-center gap-2">
                      <FiHeart className="w-5 h-5" />
                      {language === 'ar' ? 'المفضلة' : 'Wishlist'}
                    </button>
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
            {course.isFree ? (
              <span className="text-2xl font-bold text-green-500">{t('course.free')}</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{priceDisplay?.full}</span>
                {originalPriceDisplay && course.originalPrice > course.price && (
                  <span className="text-sm text-secondary-400 line-through">{originalPriceDisplay}</span>
                )}
              </div>
            )}
          </div>
          {isEnrolled ? (
            <Button to={`/courses/${course.id}/learn`} icon={ArrowIcon} iconPosition="end">
              {t('course.continue')}
            </Button>
          ) : (
            <Button to={getLandingAuthUrl('login')}>
              {t('course.enroll')}
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
                    {language === 'ar' ? 'ماذا ستتعلم' : 'What You Will Learn'}
                  </h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {course.tags.map((tag, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <FiCheck className="w-5 h-5 text-green-500 shrink-0" />
                        <span>{tag}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold mb-4">{t('course.description')}</h2>
                  <p className="text-secondary-600 dark:text-secondary-400 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'curriculum' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">{t('course.curriculum')}</h2>
                  <span className="text-sm text-secondary-500">
                    {course.lessons} {t('course.lessons')} • {course.duration} {t('course.hours')}
                  </span>
                </div>

                {/* Curriculum Sections */}
                <div className="border border-secondary-200 dark:border-dark-border rounded-xl overflow-hidden">
                  {[1].map((section) => (
                    <div key={section}>
                      <button
                        onClick={() => toggleSection(`section-${section}`)}
                        className="w-full flex items-center justify-between p-4 bg-secondary-50 dark:bg-dark-border hover:bg-secondary-100 dark:hover:bg-dark-card transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedSections.includes(`section-${section}`) ? (
                            <FiChevronUp className="w-5 h-5" />
                          ) : (
                            <FiChevronDown className="w-5 h-5" />
                          )}
                          <span className="font-medium">
                            {language === 'ar' ? `القسم ${section}: المقدمة` : `Section ${section}: Introduction`}
                          </span>
                        </div>
                        <span className="text-sm text-secondary-500">
                          {lessons.length} {t('course.lessons')}
                        </span>
                      </button>

                      {expandedSections.includes(`section-${section}`) && (
                        <div className="divide-y divide-secondary-100 dark:divide-dark-border">
                          {lessons.map((lesson) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-4 hover:bg-secondary-50 dark:hover:bg-dark-border/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {lesson.isFree || isEnrolled ? (
                                  <FiPlay className="w-5 h-5 text-primary-500" />
                                ) : (
                                  <FiLock className="w-5 h-5 text-secondary-400" />
                                )}
                                <span className={!lesson.isFree && !isEnrolled ? 'text-secondary-400' : ''}>
                                  {language === 'ar' ? lesson.title : lesson.titleEn}
                                </span>
                                {lesson.isFree && (
                                  <span className="badge bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                                    {t('course.free')}
                                  </span>
                                )}
                              </div>
                              <span className="text-sm text-secondary-500">
                                {lesson.duration} {language === 'ar' ? 'د' : 'min'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'instructor' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{t('course.instructor')}</h2>
                <div className="flex items-start gap-6">
                  <img
                    src={course.instructor.avatar}
                    alt={instructorName}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="text-xl font-bold mb-1">{instructorName}</h3>
                    <p className="text-secondary-500 mb-4">{instructorTitle}</p>
                    <div className="flex items-center gap-6 text-sm text-secondary-600 dark:text-secondary-400">
                      <div className="flex items-center gap-2">
                        <FiStar className="w-4 h-4 text-yellow-500" />
                        <span>4.9 {language === 'ar' ? 'تقييم المدرب' : 'Instructor Rating'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiUsers className="w-4 h-4" />
                        <span>5,000+ {t('home.stats.students')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiBookOpen className="w-4 h-4" />
                        <span>12 {t('home.stats.courses')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <h2 className="text-2xl font-bold mb-6">{t('course.reviews')}</h2>
                <div className="text-center py-8">
                  <p className="text-secondary-500">
                    {language === 'ar' ? 'لا توجد تقييمات حتى الآن' : 'No reviews yet'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default CourseDetails