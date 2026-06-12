import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { 
  FiClock, 
  FiUsers, 
  FiStar, 
  FiPlay,
  FiBookOpen,
  FiArrowRight,
  FiArrowLeft
} from 'react-icons/fi'

const CourseCard = ({ course, variant = 'default' }) => {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const { user, isAuthenticated } = useAuth()

  const isEnrolled = isAuthenticated && user?.enrolledCourses?.includes(course.id)
  const progress = user?.progress?.[course.id] || 0

  const title = language === 'ar' ? course.title : course.titleEn
  const description = language === 'ar' ? course.description : course.descriptionEn
  const instructorName = language === 'ar' ? course.instructor.name : course.instructor.nameEn

  const getLevelBadge = (level) => {
    const levels = {
      beginner: { label: t('course.level.beginner'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      intermediate: { label: t('course.level.intermediate'), color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
      advanced: { label: t('course.level.advanced'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    }
    return levels[level] || levels.beginner
  }

  const levelBadge = getLevelBadge(course.level)
  const ArrowIcon = isRTL ? FiArrowLeft : FiArrowRight

  if (variant === 'horizontal') {
    return (
      <Link to={`/courses/${course.id}`} className="card flex flex-col md:flex-row group">
        {/* Thumbnail */}
        <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 overflow-hidden">
          <img
            src={course.thumbnail}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {course.isFree && (
            <span className="absolute top-3 start-3 badge bg-green-500 text-white">
              {t('course.free')}
            </span>
          )}
          {course.isBestseller && (
            <span className="absolute top-3 end-3 badge bg-yellow-500 text-white">
              Bestseller
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <span className={`badge ${levelBadge.color}`}>{levelBadge.label}</span>
          </div>
          
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary-500 transition-colors line-clamp-2">
            {title}
          </h3>
          
          <p className="text-secondary-600 dark:text-secondary-400 text-sm mb-4 line-clamp-2">
            {description}
          </p>

          <div className="flex items-center gap-4 text-sm text-secondary-500 mb-4">
            <span className="flex items-center gap-1">
              <FiBookOpen className="w-4 h-4" />
              {course.lessons} {t('course.lessons')}
            </span>
            <span className="flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              {course.duration} {t('course.hours')}
            </span>
            <span className="flex items-center gap-1">
              <FiUsers className="w-4 h-4" />
              {course.students.toLocaleString()}
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={course.instructor.avatar}
                alt={instructorName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-sm font-medium">{instructorName}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-yellow-500">
                <FiStar className="w-4 h-4 fill-current" />
                <span className="font-medium">{course.rating}</span>
              </div>
              {course.isFree ? (
                <span className="text-lg font-bold text-green-500">{t('course.free')}</span>
              ) : (
                <div className="text-end">
                  <span className="text-lg font-bold text-primary-500">
                    {course.price} {t('course.price')}
                  </span>
                  {course.originalPrice > course.price && (
                    <span className="text-sm text-secondary-400 line-through ms-2">
                      {course.originalPrice}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/courses/${course.id}`}
      className="block bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg overflow-hidden shadow-md hover:shadow-lg hover:shadow-black/30 hover:border-[#3E3E3E] transition-all duration-300 group"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={course.thumbnail}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-300">
            <FiPlay className="w-6 h-6 text-[#009FFD] ms-1" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 start-3 flex flex-col gap-2">
          {course.isFree && (
            <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              {t('course.free')}
            </span>
          )}
          {course.isBestseller && (
            <span className="bg-amber-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              Bestseller
            </span>
          )}
        </div>

        {/* Rating Badge */}
        <div className="absolute top-3 end-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
          <FiStar className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-xs font-bold text-white">{course.rating}</span>
        </div>

        {/* Progress bar for enrolled courses */}
        {isEnrolled && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-700">
            <div
              className="h-full bg-gradient-to-r from-[#009FFD] to-[#00D9FF] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 md:p-5">
        {/* Level Badge */}
        <div className="mb-3">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${levelBadge.color}`}>
            {levelBadge.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-base md:text-lg text-white mb-3 leading-tight group-hover:text-[#00D9FF] transition-colors duration-300 line-clamp-2">
          {title}
        </h3>

        {/* Instructor */}
        <div className="flex items-center gap-2.5 mb-4">
          <img
            src={course.instructor.avatar}
            alt={instructorName}
            className="w-8 h-8 rounded-full object-cover border-2 border-[#2E2E2E]"
          />
          <span className="text-sm text-gray-400 font-medium">
            {instructorName}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 md:gap-4 text-xs text-gray-400 mb-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <FiBookOpen className="w-3.5 h-3.5 text-gray-500" />
            <span>{course.lessons} {t('course.lessons')}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <FiClock className="w-3.5 h-3.5 text-gray-500" />
            <span>{course.duration} {t('course.hours')}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <FiUsers className="w-3.5 h-3.5 text-gray-500" />
            <span>{course.students.toLocaleString()}</span>
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#2E2E2E]">
          {/* Price */}
          {course.isFree ? (
            <span className="text-lg font-bold text-emerald-400">{t('course.free')}</span>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#00D9FF]">
                {course.price} {t('course.price')}
              </span>
              {course.originalPrice > course.price && (
                <span className="text-sm text-gray-500 line-through">
                  {course.originalPrice}
                </span>
              )}
            </div>
          )}

          {/* Action */}
          {isEnrolled ? (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#00D9FF]">
              {t('course.continue')}
              <ArrowIcon className="w-4 h-4" />
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 group-hover:text-[#00D9FF] transition-colors duration-300">
              {t('course.enroll')}
              <ArrowIcon className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default CourseCard