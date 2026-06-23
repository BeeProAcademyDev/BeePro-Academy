import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import CourseCard from '../components/ui/CourseCard'
import Button from '../components/ui/Button'
import { categories, stats, testimonials } from '../data/courses'
import { courseService } from '../services/api'
import { 
  FiBarChart2,
  FiServer, 
  FiTrendingUp,
  FiAward,
  FiHeadphones,
  FiClock,
  FiCheckCircle,
  FiArrowRight,
  FiArrowLeft,
  FiPlay,
  FiStar,
  FiUsers,
  FiBookOpen
} from 'react-icons/fi'

const Home = () => {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const [popularCourses, setPopularCourses] = useState([])
  
  const ArrowIcon = isRTL ? FiArrowLeft : FiArrowRight

  useEffect(() => {
    const loadPopularCourses = async () => {
      try {
        const data = await courseService.getFeaturedCourses(4)
        const formatted = (data || [])
          .filter((course) => course.is_published !== false)
          .map((course) => ({
            id: course.id,
            title: course.title,
            titleEn: course.title_en || course.title,
            description: course.description,
            descriptionEn: course.description_en || course.description,
            thumbnail: course.thumbnail_url || course.image_url || '/assets/hero-background.png',
            price: course.price || 0,
            category: course.category,
            level: course.level || 'beginner',
            rating: course.rating || 0,
            students: course.students || 0,
            lessons: course.lessons_count || course.lessonsCount || 0,
            duration: course.duration || 0,
            instructor: {
              name: course.instructor?.full_name || 'Instructor',
              nameEn: course.instructor?.full_name || 'Instructor',
              avatar: course.instructor?.avatar_url || '/assets/abdullah1.jpg',
            },
            isPopular: true,
          }))
        setPopularCourses(formatted)
      } catch (error) {
        console.error('Error loading featured courses:', error)
        setPopularCourses([])
      }
    }

    loadPopularCourses()
  }, [])

  const categoryIcons = {
    financial_markets: FiTrendingUp,
    data_analysis: FiBarChart2,
    it: FiServer,
  }

  const features = [
    {
      icon: FiCheckCircle,
      title: t('home.features.quality.title'),
      description: t('home.features.quality.description'),
      color: 'from-blue-500 to-indigo-600'
    },
    {
      icon: FiAward,
      title: t('home.features.certificate.title'),
      description: t('home.features.certificate.description'),
      color: 'from-yellow-500 to-orange-600'
    },
    {
      icon: FiHeadphones,
      title: t('home.features.support.title'),
      description: t('home.features.support.description'),
      color: 'from-green-500 to-teal-600'
    },
    {
      icon: FiClock,
      title: t('home.features.flexible.title'),
      description: t('home.features.flexible.description'),
      color: 'from-purple-500 to-pink-600'
    }
  ]

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-primary-700/10 dark:from-primary-900/20 dark:to-primary-700/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 start-10 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 end-10 w-96 h-96 bg-primary-700/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container-custom relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div className="text-center lg:text-start">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="gradient-text">{t('home.hero.title')}</span>
              </h1>
              <p className="text-lg md:text-xl text-secondary-600 dark:text-secondary-400 mb-8 leading-relaxed">
                {t('home.hero.subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button to="/courses" size="lg" icon={ArrowIcon} iconPosition="end">
                  {t('home.hero.cta')}
                </Button>
                <Button to="/courses" variant="outline" size="lg" icon={FiPlay}>
                  {t('home.hero.exploreCourses')}
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-12 border-t border-secondary-200 dark:border-dark-border">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary-500 mb-1">
                    {stats.students.toLocaleString()}+
                  </div>
                  <div className="text-sm text-secondary-500">{t('home.stats.students')}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary-500 mb-1">
                    {stats.courses}+
                  </div>
                  <div className="text-sm text-secondary-500">{t('home.stats.courses')}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary-500 mb-1">
                    {stats.instructors}+
                  </div>
                  <div className="text-sm text-secondary-500">{t('home.stats.instructors')}</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary-500 mb-1">
                    {stats.hours.toLocaleString()}+
                  </div>
                  <div className="text-sm text-secondary-500">{t('home.stats.hours')}</div>
                </div>
              </div>
            </div>

            {/* Hero Image */}
            <div className="relative hidden lg:block">
              <div className="relative z-10">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=500&fit=crop"
                  alt="Students learning"
                  className="rounded-2xl shadow-2xl"
                />
              </div>
              {/* Floating Cards */}
              <div className="absolute -top-4 -start-4 bg-white dark:bg-dark-card p-4 rounded-xl shadow-lg animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <FiUsers className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="font-bold">15,000+</div>
                    <div className="text-sm text-secondary-500">{t('home.stats.students')}</div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -end-4 bg-white dark:bg-dark-card p-4 rounded-xl shadow-lg animate-float" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
                    <FiStar className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-bold">4.9/5</div>
                    <div className="text-sm text-secondary-500">{t('course.reviews')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section bg-secondary-50 dark:bg-dark-card/50">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.features.title')}</h2>
            <p className="text-lg text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto">
              {t('home.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="card card-body text-center hover:-translate-y-2 transition-transform duration-300"
              >
                <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-secondary-600 dark:text-secondary-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="section">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('home.categories.title')}</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => {
              const Icon = categoryIcons[category.id]
              return (
                <Link
                  key={category.id}
                  to={`/courses?category=${category.id}`}
                  className="group relative overflow-hidden rounded-2xl aspect-[4/3]"
                >
                  <img
                    src={category.image}
                    alt={language === 'ar' ? category.name : category.nameEn}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-6 text-white">
                    <div className={`w-14 h-14 mb-4 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                      {Icon && <Icon className="w-7 h-7" />}
                    </div>
                    <h3 className="text-xl font-bold mb-1">
                      {language === 'ar' ? category.name : category.nameEn}
                    </h3>
                    <p className="text-sm text-white/80">
                      {category.coursesCount} {t('home.stats.courses')}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Popular Courses Section */}
      <section className="section bg-secondary-50 dark:bg-dark-card/50">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2">{t('home.popular.title')}</h2>
            </div>
            <Link 
              to="/courses" 
              className="hidden md:flex items-center gap-2 text-primary-500 hover:text-primary-600 font-medium"
            >
              {t('home.popular.viewAll')}
              <ArrowIcon className="w-5 h-5" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {popularCourses.length > 0 ? (
              popularCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))
            ) : (
              <div className="col-span-full card card-body text-center py-10">
                <p className="text-secondary-500">
                  {language === 'ar' ? 'لا توجد دورات منشورة حالياً' : 'No published courses yet'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Button to="/courses" variant="outline" icon={ArrowIcon} iconPosition="end">
              {t('home.popular.viewAll')}
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {language === 'ar' ? 'آراء طلابنا' : 'What Our Students Say'}
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="card card-body">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <FiStar 
                      key={i} 
                      className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-500 fill-current' : 'text-secondary-300'}`} 
                    />
                  ))}
                </div>
                <p className="text-secondary-600 dark:text-secondary-400 mb-6 leading-relaxed">
                  "{language === 'ar' ? testimonial.content : testimonial.contentEn}"
                </p>
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-secondary-100 dark:border-dark-border">
                  <img
                    src={testimonial.avatar}
                    alt={language === 'ar' ? testimonial.name : testimonial.nameEn}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-bold">{language === 'ar' ? testimonial.name : testimonial.nameEn}</div>
                    <div className="text-sm text-secondary-500">
                      {language === 'ar' ? testimonial.role : testimonial.roleEn}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-gradient-to-br from-primary-500 to-primary-700 text-white">
        <div className="container-custom text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {language === 'ar' ? 'ابدأ رحلة التعلم الآن' : 'Start Your Learning Journey Today'}
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'انضم إلى آلاف الطلاب الذين طوروا مهاراتهم معنا وحققوا أحلامهم المهنية'
              : 'Join thousands of students who have developed their skills with us and achieved their career dreams'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              to="/register" 
              variant="secondary" 
              size="lg" 
              className="bg-white text-primary-600 hover:bg-secondary-100"
            >
              {t('nav.register')}
            </Button>
            <Button 
              to="/courses" 
              variant="outline" 
              size="lg" 
              className="border-white text-white hover:bg-white hover:text-primary-600"
            >
              {t('home.hero.exploreCourses')}
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
