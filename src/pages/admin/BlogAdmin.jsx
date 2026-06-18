import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { blogService, courseService } from '../../services/api'
import { generateArticleDraft, slugifyArticle } from '../../lib/articleAiGenerator'
import ArticleSchedulePanel from './ArticleSchedulePanel'
import { FiCheckCircle, FiEdit3, FiLoader, FiPlus, FiRefreshCw, FiTrash2, FiZap } from 'react-icons/fi'

const emptyForm = {
  id: null,
  title: '',
  title_en: '',
  slug: '',
  excerpt: '',
  excerpt_en: '',
  content: '',
  content_en: '',
  category: '',
  course_id: '',
  cover_image_url: '',
  status: 'draft'
}

const BlogAdmin = () => {
  const { language } = useLanguage()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('editor')
  const [posts, setPosts] = useState([])
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isEditing = Boolean(form.id)
  const isAr = language === 'ar'

  const selectedCourse = useMemo(
    () => courses.find((course) => `${course.id}` === `${form.course_id}`),
    [courses, form.course_id]
  )

  const loadData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [postRows, courseRows] = await Promise.all([
        blogService.getAdminPosts(),
        courseService.getCourses({ limit: 100 })
      ])
      setPosts(postRows || [])
      setCourses(courseRows?.data || [])
    } catch (err) {
      console.error('Error loading blog admin data:', err)
      setError(isAr ? 'تعذر تحميل بيانات المدونة.' : 'Could not load blog data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const updateField = (name, value) => {
    setForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'title' && !current.slug) {
        next.slug = slugifyArticle(value)
      }
      return next
    })
  }

  const resetForm = () => {
    setForm(emptyForm)
    setMessage('')
    setError('')
  }

  const editPost = (post) => {
    setForm({
      ...emptyForm,
      ...post,
      course_id: post.course_id || '',
      status: post.status || 'draft'
    })
    setActiveTab('editor')
    setMessage('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const generateDraft = () => {
    setIsGenerating(true)
    setMessage('')

    const draft = generateArticleDraft({
      course: selectedCourse,
      courses,
      category: form.category
    })

    setForm((current) => ({
      ...current,
      title: current.title || draft.title,
      title_en: current.title_en || draft.title_en,
      slug: current.slug || draft.slug,
      excerpt: current.excerpt || draft.excerpt,
      excerpt_en: current.excerpt_en || draft.excerpt_en,
      content: current.content || draft.content,
      content_en: current.content_en || draft.content_en,
      category: draft.category,
      course_id: current.course_id || draft.course_id || ''
    }))

    setTimeout(() => {
      setIsGenerating(false)
      setMessage(isAr ? 'تم توليد مسودة قابلة للتحرير.' : 'Editable draft generated.')
    }, 250)
  }

  const savePost = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      const payload = {
        ...form,
        slug: form.slug || slugifyArticle(form.title),
        course_id: form.course_id || null,
        author_id: form.author_id || user?.id,
        published_at: form.status === 'published' ? form.published_at || new Date().toISOString() : null
      }

      const saved = isEditing
        ? await blogService.updatePost(form.id, payload)
        : await blogService.createPost(payload)

      setPosts((current) => {
        const withoutSaved = current.filter((post) => post.id !== saved.id)
        return [saved, ...withoutSaved]
      })
      setForm({ ...emptyForm, ...saved, course_id: saved.course_id || '' })
      setMessage(isAr ? 'تم حفظ المقال بنجاح.' : 'Post saved successfully.')
    } catch (err) {
      console.error('Error saving blog post:', err)
      setError(err?.message || (isAr ? 'تعذر حفظ المقال.' : 'Could not save post.'))
    } finally {
      setIsSaving(false)
    }
  }

  const deletePost = async (postId) => {
    if (!window.confirm(isAr ? 'هل تريد حذف هذا المقال؟' : 'Delete this post?')) return

    try {
      await blogService.deletePost(postId)
      setPosts((current) => current.filter((post) => post.id !== postId))
      if (form.id === postId) resetForm()
    } catch (err) {
      setError(err?.message || (isAr ? 'تعذر حذف المقال.' : 'Could not delete post.'))
    }
  }

  return (
    <div className="bepro-page pt-24 pb-16">
      <div className="bepro-container">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {isAr ? 'إدارة المدونة' : 'Blog Management'}
            </h1>
            <p className="text-white/70">
              {isAr
                ? 'إنشاء المقالات يدوياً أو جدولة وكيل AI لكتابتها تلقائياً.'
                : 'Create articles manually or schedule the AI agent to write them automatically.'}
            </p>
          </div>
          <Link to="/blogs" className="bepro-btn-secondary">
            {isAr ? 'عرض المدونة' : 'View Blogs'}
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-colors ${
              activeTab === 'editor'
                ? 'bg-[#00D9FF] text-[#000428]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FiEdit3 className="w-4 h-4" />
              {isAr ? 'تحرير المقالات' : 'Article Editor'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-colors ${
              activeTab === 'schedule'
                ? 'bg-[#00D9FF] text-[#000428]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <FiZap className="w-4 h-4" />
              {isAr ? 'جدول AI Agent' : 'AI Agent Schedule'}
            </span>
          </button>
        </div>

        {activeTab === 'schedule' ? (
          <ArticleSchedulePanel courses={courses} onPostGenerated={loadData} />
        ) : (
          <>
            {message && (
              <div className="mb-6 bepro-card p-4 flex items-center gap-3 text-white">
                <FiCheckCircle className="w-5 h-5 text-green-400" />
                {message}
              </div>
            )}
            {error && <div className="mb-6 bepro-card p-4 text-red-200">{error}</div>}

            <div className="grid xl:grid-cols-[minmax(0,1fr)_420px] gap-8 items-start">
              <form onSubmit={savePost} className="bepro-card p-6 space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-bold text-white">
                    {isEditing
                      ? (isAr ? 'تعديل مقال' : 'Edit Post')
                      : (isAr ? 'مقال جديد' : 'New Post')}
                  </h2>
                  <button type="button" onClick={resetForm} className="bepro-btn-secondary">
                    <FiPlus className="w-5 h-5" />
                    {isAr ? 'جديد' : 'New'}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-white font-bold mb-2 block">العنوان</span>
                    <input required value={form.title} onChange={(e) => updateField('title', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white" />
                  </label>
                  <label className="block">
                    <span className="text-white font-bold mb-2 block">English Title</span>
                    <input value={form.title_en} onChange={(e) => updateField('title_en', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white" />
                  </label>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <label className="block">
                    <span className="text-white font-bold mb-2 block">Slug</span>
                    <input required value={form.slug} onChange={(e) => updateField('slug', slugifyArticle(e.target.value))} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white" />
                  </label>
                  <label className="block">
                    <span className="text-white font-bold mb-2 block">{isAr ? 'التصنيف' : 'Category'}</span>
                    <input value={form.category} onChange={(e) => updateField('category', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white" />
                  </label>
                  <label className="block">
                    <span className="text-white font-bold mb-2 block">{isAr ? 'الحالة' : 'Status'}</span>
                    <select value={form.status} onChange={(e) => updateField('status', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white">
                      <option className="bg-[#000428]" value="draft">{isAr ? 'مسودة' : 'Draft'}</option>
                      <option className="bg-[#000428]" value="published">{isAr ? 'منشور' : 'Published'}</option>
                    </select>
                  </label>
                </div>

                <div className="grid md:grid-cols-[minmax(0,1fr)_auto] gap-4 items-end">
                  <label className="block">
                    <span className="text-white font-bold mb-2 block">{isAr ? 'الكورس المرتبط' : 'Related Course'}</span>
                    <select value={form.course_id} onChange={(e) => updateField('course_id', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white">
                      <option className="bg-[#000428]" value="">{isAr ? 'بدون كورس محدد' : 'No specific course'}</option>
                      {courses.map((course) => (
                        <option className="bg-[#000428]" key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" onClick={generateDraft} disabled={isGenerating || courses.length === 0} className="bepro-btn-primary min-h-[48px]">
                    {isGenerating ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiRefreshCw className="w-5 h-5" />}
                    {isAr ? 'توليد بالـ AI' : 'AI Draft'}
                  </button>
                </div>

                <label className="block">
                  <span className="text-white font-bold mb-2 block">{isAr ? 'رابط صورة الغلاف' : 'Cover Image URL'}</span>
                  <input value={form.cover_image_url || ''} onChange={(e) => updateField('cover_image_url', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white" />
                </label>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-white font-bold mb-2 block">{isAr ? 'ملخص عربي' : 'Arabic Excerpt'}</span>
                    <textarea rows="3" value={form.excerpt || ''} onChange={(e) => updateField('excerpt', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white" />
                  </label>
                  <label className="block">
                    <span className="text-white font-bold mb-2 block">English Excerpt</span>
                    <textarea rows="3" value={form.excerpt_en || ''} onChange={(e) => updateField('excerpt_en', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white" />
                  </label>
                </div>

                <label className="block">
                  <span className="text-white font-bold mb-2 block">{isAr ? 'المحتوى العربي' : 'Arabic Content'}</span>
                  <textarea required rows="10" value={form.content || ''} onChange={(e) => updateField('content', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white leading-7" />
                </label>
                <label className="block">
                  <span className="text-white font-bold mb-2 block">English Content</span>
                  <textarea rows="8" value={form.content_en || ''} onChange={(e) => updateField('content_en', e.target.value)} className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white leading-7" />
                </label>

                <button type="submit" disabled={isSaving} className="bepro-btn-primary w-full justify-center min-h-[50px]">
                  {isSaving ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiEdit3 className="w-5 h-5" />}
                  {isAr ? 'حفظ المقال' : 'Save Post'}
                </button>
              </form>

              <aside className="bepro-card p-5">
                <h2 className="text-xl font-bold text-white mb-4">
                  {isAr ? 'كل المقالات' : 'All Posts'}
                </h2>
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <FiLoader className="w-10 h-10 text-[#00D9FF] animate-spin" />
                  </div>
                ) : posts.length === 0 ? (
                  <p className="text-white/70">{isAr ? 'لا توجد مقالات بعد.' : 'No posts yet.'}</p>
                ) : (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <div key={post.id} className="bg-white/10 border border-white/10 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-white font-bold">{post.title}</h3>
                            <p className="text-sm text-white/60 mt-1">
                              {post.status === 'published'
                                ? (isAr ? 'منشور' : 'Published')
                                : (isAr ? 'مسودة' : 'Draft')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => editPost(post)} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20" title="Edit">
                              <FiEdit3 className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => deletePost(post.id)} className="p-2 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30" title="Delete">
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default BlogAdmin
