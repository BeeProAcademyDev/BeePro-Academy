import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { blogService } from '../services/api'
import { FiArrowRight, FiBookOpen, FiCalendar, FiLoader, FiSearch, FiUser } from 'react-icons/fi'

const formatDate = (value, language) => {
  if (!value) return ''
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar' : 'en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value))
}

const getExcerpt = (post, language) => {
  const text = language === 'ar'
    ? post.excerpt || post.content
    : post.excerpt_en || post.excerpt || post.content_en || post.content

  return (text || '').replace(/\s+/g, ' ').trim().slice(0, 180)
}

const getPostTitle = (post, language) => {
  if (language === 'ar') return post.title || post.title_en
  return post.title_en || post.title
}

const Blogs = () => {
  const { language } = useLanguage()
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadPosts = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await blogService.getPublishedPosts()
        setPosts(data || [])
        setSelectedPost(data?.[0] || null)
      } catch (err) {
        console.error('Error loading blog posts:', err)
        setError(language === 'ar'
          ? 'تعذر تحميل المقالات حالياً.'
          : 'Could not load blog posts right now.')
      } finally {
        setIsLoading(false)
      }
    }

    loadPosts()
  }, [language])

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return posts

    return posts.filter((post) => {
      const haystack = [
        post.title,
        post.title_en,
        post.excerpt,
        post.excerpt_en,
        post.content,
        post.content_en,
        post.category
      ].filter(Boolean).join(' ').toLowerCase()

      return haystack.includes(query)
    })
  }, [posts, search])

  const activePost = selectedPost || filteredPosts[0]
  const activeContent = language === 'ar'
    ? activePost?.content || activePost?.content_en
    : activePost?.content_en || activePost?.content

  return (
    <div className="bepro-page pt-20 pb-16">
      <section className="py-14">
        <div className="bepro-container">
          <div className="bepro-page-header">
            <h1>{language === 'ar' ? 'المدونة' : 'Blogs'}</h1>
            <p>
              {language === 'ar'
                ? 'مقالات تعليمية مرتبطة بالكورسات تساعدك على فهم المهارات والأسواق قبل أن تبدأ التعلم.'
                : 'Course-aware articles that help learners understand skills, markets, and learning paths before they enroll.'}
            </p>
          </div>
        </div>
      </section>

      <section>
        <div className="bepro-container">
          <div className="bepro-card p-5 mb-8">
            <div className="relative">
              <FiSearch className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-white/50" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={language === 'ar' ? 'ابحث داخل المقالات...' : 'Search articles...'}
                className="w-full ps-12 py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-[#00D9FF]"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <FiLoader className="w-12 h-12 text-[#00D9FF] animate-spin" />
            </div>
          ) : error ? (
            <div className="bepro-card text-center p-10">
              <p className="text-white font-bold">{error}</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bepro-card text-center p-10">
              <FiBookOpen className="w-14 h-14 mx-auto text-[#00D9FF] mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                {language === 'ar' ? 'لا توجد مقالات منشورة بعد' : 'No published posts yet'}
              </h2>
              <p className="text-white/70">
                {language === 'ar'
                  ? 'عند نشر الأدمن لمقال جديد سيظهر هنا مباشرة.'
                  : 'New admin-published articles will appear here.'}
              </p>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
              <article className="bepro-card p-6 md:p-8">
                {activePost?.cover_image_url && (
                  <img
                    src={activePost.cover_image_url}
                    alt={getPostTitle(activePost, language)}
                    className="w-full aspect-[16/7] object-cover rounded-lg mb-6"
                  />
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm text-white/70 mb-4">
                  <span className="inline-flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    {formatDate(activePost?.published_at || activePost?.created_at, language)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <FiUser className="w-4 h-4" />
                    {activePost?.author?.full_name || (language === 'ar' ? 'إدارة المنصة' : 'Platform Admin')}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  {getPostTitle(activePost, language)}
                </h2>
                <p className="text-[#00D9FF] font-bold mb-6">
                  {language === 'ar' ? activePost?.excerpt : activePost?.excerpt_en || activePost?.excerpt}
                </p>
                <div className="prose prose-invert max-w-none">
                  {(activeContent || '').split('\n').filter(Boolean).map((paragraph, index) => (
                    <p key={index} className="text-white/80 leading-8 mb-5">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {activePost?.course_id && (
                  <Link to={`/courses/${activePost.course_id}`} className="bepro-btn-primary mt-8 inline-flex">
                    {language === 'ar' ? 'اذهب للكورس المرتبط' : 'Open related course'}
                    <FiArrowRight className="w-5 h-5" />
                  </Link>
                )}
              </article>

              <aside className="space-y-4">
                {filteredPosts.map((post) => {
                  const isActive = post.id === activePost?.id
                  return (
                    <button
                      type="button"
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className={`w-full text-start bepro-card p-4 transition-all ${isActive ? 'ring-2 ring-[#00D9FF]' : 'hover:translate-y-[-2px]'}`}
                    >
                      <span className="text-xs font-bold uppercase tracking-wide text-[#00D9FF]">
                        {post.category || (language === 'ar' ? 'تعليم' : 'Education')}
                      </span>
                      <h3 className="text-white font-bold mt-2 mb-2">{getPostTitle(post, language)}</h3>
                      <p className="text-white/65 text-sm leading-6">{getExcerpt(post, language)}...</p>
                    </button>
                  )
                })}
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Blogs
