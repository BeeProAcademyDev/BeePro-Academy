import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import CourseCard from '../components/ui/CourseCard'
import { courses as mockCourses, categories } from '../data/courses'
import { courseService } from '../services/api'
import {
  FiSearch,
  FiFilter,
  FiGrid,
  FiList,
  FiX,
  FiChevronDown,
  FiLoader,
  FiBookOpen
} from 'react-icons/fi'

const normalizeCategoryId = (category) => {
  if (!category) return 'programming'

  const map = {
    financial_markets: 'finance'
  }

  return map[category] || category
}

const Courses = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [searchParams, setSearchParams] = useSearchParams()
  
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('grid')
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Fetch courses from database
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true)
      try {
        const { data } = await courseService.getCourses()
        const dbCourses = data || []
        const formattedDbCourses = dbCourses.map(course => ({
          id: course.id,
          title: course.title,
          titleEn: course.title_en || course.title,
          description: course.description,
          descriptionEn: course.description_en || course.description,
          thumbnail: course.thumbnail_url || course.image_url || course.image || '/assets/hero-background.png',
          price: course.price || 0,
          category: normalizeCategoryId(course.category),
          level: course.level || 'beginner',
          rating: course.rating || 0,
          students: course.students || 0,
          lessons: course.lessons_count || 0,
          duration: course.duration || 0,
          instructor: {
            name: course.instructor?.full_name || 'Instructor',
            nameEn: course.instructor?.full_name || 'Instructor',
            avatar: course.instructor?.avatar_url || '/assets/abdullah1.jpg'
          },
          instructorAvatar: course.instructor?.avatar_url || '/assets/abdullah1.jpg',
          tags: [],
          createdAt: course.created_at
        }))
        setCourses([...formattedDbCourses, ...mockCourses])
      } catch (error) {
        console.error('Error fetching courses:', error)
        setCourses(mockCourses)
      } finally {
        setIsLoading(false)
      }
    }
    fetchCourses()
  }, [])

  const levels = [
    { value: 'all', label: t('courses.filter.all') },
    { value: 'beginner', label: t('course.level.beginner') },
    { value: 'intermediate', label: t('course.level.intermediate') },
    { value: 'advanced', label: t('course.level.advanced') },
  ]

  const sortOptions = [
    { value: 'newest', label: t('courses.sort.newest') },
    { value: 'popular', label: t('courses.sort.popular') },
    { value: 'rating', label: t('courses.sort.rating') },
    { value: 'price-low', label: language === 'ar' ? 'السعر: من الأقل' : 'Price: Low to High' },
    { value: 'price-high', label: language === 'ar' ? 'السعر: من الأعلى' : 'Price: High to Low' },
  ]

  const filteredCourses = useMemo(() => {
    let result = [...courses]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(course => 
        course.title.toLowerCase().includes(query) ||
        course.titleEn.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.descriptionEn.toLowerCase().includes(query) ||
        course.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    if (selectedCategory !== 'all') {
      result = result.filter(course => course.category === selectedCategory)
    }

    if (selectedLevel !== 'all') {
      result = result.filter(course => course.level === selectedLevel)
    }

    switch (sortBy) {
      case 'popular':
        result.sort((a, b) => b.students - a.students)
        break
      case 'rating':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'price-low':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        result.sort((a, b) => b.price - a.price)
        break
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    return result
  }, [courses, searchQuery, selectedCategory, selectedLevel, sortBy])

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
    if (category === 'all') {
      searchParams.delete('category')
    } else {
      searchParams.set('category', category)
    }
    setSearchParams(searchParams)
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedLevel('all')
    setSortBy('newest')
    setSearchParams({})
  }

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedLevel !== 'all'

  return (
    <div className="bepro-page pt-20 pb-16">
      {/* Header Section */}
      <section className="py-12">
        <div className="bepro-container">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('courses.title')}</h1>
            <p className="text-xl text-white font-semibold">
              {language === 'ar'
                ? 'اكتشف دوراتنا المتميزة في الأسواق المالية والبرمجة وتقنية المعلومات'
                : 'Discover our premium courses in Financial Markets, Programming, and IT'
              }
            </p>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      <section className="pb-8">
        <div className="bepro-container">
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-6 py-2 rounded-full border border-white/30 text-white font-bold transition-all ${selectedCategory === 'all' ? 'bg-gradient-to-r from-[#009FFD] to-[#2A93D5] border-transparent' : 'hover:bg-white/10'}`}
            >
              {language === 'ar' ? 'الكل' : 'All'}
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-6 py-2 rounded-full border border-white/30 text-white font-bold transition-all ${selectedCategory === cat.id ? 'bg-gradient-to-r from-[#009FFD] to-[#2A93D5] border-transparent' : 'hover:bg-white/10'}`}
              >
                {cat.icon} {language === 'ar' ? cat.name : cat.nameEn}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Search and Filters */}
      <section className="pb-8">
        <div className="bepro-container">
          <div className="bepro-card p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <FiSearch className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-white/50" />
                <input
                  type="text"
                  placeholder={t('courses.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full ps-12 py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-[#00D9FF] transition-colors"
                />
              </div>

              {/* Desktop Filters */}
              <div className="hidden lg:flex items-center gap-4">
                {/* Level Filter */}
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#00D9FF] cursor-pointer"
                >
                  {levels.map(level => (
                    <option key={level.value} value={level.value} className="bg-[#000428] text-white">
                      {level.label}
                    </option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#00D9FF] cursor-pointer"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value} className="bg-[#000428] text-white">
                      {option.label}
                    </option>
                  ))}
                </select>

                {/* View Mode */}
                <div className="flex items-center border border-white/20 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-3 transition-colors ${viewMode === 'grid' ? 'bg-[#009FFD] text-white' : 'hover:bg-white/10 text-white/70'}`}
                  >
                    <FiGrid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-3 transition-colors ${viewMode === 'list' ? 'bg-[#009FFD] text-white' : 'hover:bg-white/10 text-white/70'}`}
                  >
                    <FiList className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile Filter Button */}
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="lg:hidden bepro-btn-secondary"
              >
                <FiFilter className="w-5 h-5" />
                {t('common.filter')}
              </button>
            </div>

            {/* Mobile Filters */}
            {isFilterOpen && (
              <div className="lg:hidden mt-4 pt-4 border-t border-white/20 space-y-4">
                <div>
                  <label className="text-white font-bold text-sm mb-2 block">{language === 'ar' ? 'المستوى' : 'Level'}</label>
                  <select
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white"
                  >
                    {levels.map(level => (
                      <option key={level.value} value={level.value} className="bg-[#000428]">
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white font-bold text-sm mb-2 block">{t('common.sort')}</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white"
                  >
                    {sortOptions.map(option => (
                      <option key={option.value} value={option.value} className="bg-[#000428]">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/20">
                {searchQuery && (
                  <span className="px-3 py-1 bg-[#009FFD]/30 text-white rounded-full text-sm flex items-center gap-2">
                    "{searchQuery}"
                    <button onClick={() => setSearchQuery('')}><FiX className="w-4 h-4" /></button>
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="px-3 py-1 bg-[#009FFD]/30 text-white rounded-full text-sm flex items-center gap-2">
                    {language === 'ar' 
                      ? categories.find(c => c.id === selectedCategory)?.name 
                      : categories.find(c => c.id === selectedCategory)?.nameEn
                    }
                    <button onClick={() => handleCategoryChange('all')}><FiX className="w-4 h-4" /></button>
                  </span>
                )}
                {selectedLevel !== 'all' && (
                  <span className="px-3 py-1 bg-[#009FFD]/30 text-white rounded-full text-sm flex items-center gap-2">
                    {levels.find(l => l.value === selectedLevel)?.label}
                    <button onClick={() => setSelectedLevel('all')}><FiX className="w-4 h-4" /></button>
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="text-sm text-red-400 hover:text-red-300 font-medium"
                >
                  {language === 'ar' ? 'مسح الكل' : 'Clear All'}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results Count */}
      <section className="pb-4">
        <div className="bepro-container">
          <p className="text-white font-bold">
            {language === 'ar'
              ? `عرض ${filteredCourses.length} دورة من أصل ${courses.length}`
              : `Showing ${filteredCourses.length} of ${courses.length} courses`
            }
          </p>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="pb-16">
        <div className="bepro-container">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <FiLoader className="w-12 h-12 text-[#00D9FF] animate-spin" />
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-6'
            }>
              {filteredCourses.map((course, index) => (
                <div 
                  key={course.id} 
                  className="animate-fadeInUp"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CourseCard 
                    course={course} 
                    variant={viewMode === 'list' ? 'horizontal' : 'default'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                <FiBookOpen className="w-12 h-12 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{t('courses.noResults')}</h3>
              <p className="text-white font-bold mb-8">
                {language === 'ar'
                  ? 'جرب تغيير معايير البحث أو الفلترة'
                  : 'Try changing your search or filter criteria'
                }
              </p>
              <button onClick={clearFilters} className="bepro-btn-primary">
                {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Courses
