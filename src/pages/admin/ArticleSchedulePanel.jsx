import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { articleScheduleService } from '../../services/api'
import {
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiLoader,
  FiPlay,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiZap
} from 'react-icons/fi'

const emptyScheduleForm = {
  title_hint: '',
  course_id: '',
  scheduled_at: '',
  auto_publish: false,
  prompt_notes: ''
}

const STATUS_LABELS = {
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  generating: { ar: 'جاري التوليد', en: 'Generating' },
  ready: { ar: 'مسودة جاهزة', en: 'Draft Ready' },
  published: { ar: 'منشور', en: 'Published' },
  failed: { ar: 'فشل', en: 'Failed' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' }
}

const STATUS_COLORS = {
  pending: 'bg-amber-500/20 text-amber-100',
  generating: 'bg-blue-500/20 text-blue-100',
  ready: 'bg-green-500/20 text-green-100',
  published: 'bg-emerald-500/20 text-emerald-100',
  failed: 'bg-red-500/20 text-red-100',
  cancelled: 'bg-white/10 text-white/60'
}

const toLocalDateTimeInput = (date = new Date()) => {
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

const formatScheduleDate = (value, language) => {
  if (!value) return '—'
  return new Date(value).toLocaleString(language === 'ar' ? 'ar-AE' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const ArticleSchedulePanel = ({ courses = [], onPostGenerated }) => {
  const { language } = useLanguage()
  const { user } = useAuth()
  const isAr = language === 'ar'

  const [schedules, setSchedules] = useState([])
  const [form, setForm] = useState({
    ...emptyScheduleForm,
    scheduled_at: toLocalDateTimeInput(new Date(Date.now() + 3600000))
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [isRunningDue, setIsRunningDue] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadSchedules = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const rows = await articleScheduleService.getSchedules()
      setSchedules(rows || [])
    } catch (err) {
      setError(isAr ? 'تعذر تحميل جدول AI.' : 'Could not load AI schedule.')
    } finally {
      setIsLoading(false)
    }
  }, [isAr])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const results = await articleScheduleService.processDueSchedules({
          courses,
          authorId: user?.id
        })
        if (results.length > 0) {
          await loadSchedules()
          onPostGenerated?.()
          const successCount = results.filter((item) => item.success).length
          if (successCount > 0) {
            setMessage(
              isAr
                ? `تم توليد ${successCount} مقال تلقائياً.`
                : `${successCount} article(s) generated automatically.`
            )
          }
        }
      } catch {
        // silent background check
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [courses, user?.id, loadSchedules, onPostGenerated, isAr])

  useEffect(() => {
    if (courses.length === 0) return

    articleScheduleService.processDueSchedules({ courses, authorId: user?.id })
      .then((results) => {
        if (results.length > 0) {
          loadSchedules()
          onPostGenerated?.()
        }
      })
      .catch(() => {})
  }, [courses.length, user?.id, loadSchedules, onPostGenerated])

  const stats = useMemo(() => ({
    pending: schedules.filter((row) => row.status === 'pending').length,
    ready: schedules.filter((row) => row.status === 'ready' || row.status === 'published').length,
    failed: schedules.filter((row) => row.status === 'failed').length
  }), [schedules])

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const resetForm = () => {
    setForm({
      ...emptyScheduleForm,
      scheduled_at: toLocalDateTimeInput(new Date(Date.now() + 3600000))
    })
  }

  const addSchedule = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setMessage('')

    try {
      const scheduledAt = new Date(form.scheduled_at)
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new Error(isAr ? 'التاريخ غير صالح.' : 'Invalid schedule date.')
      }

      const created = await articleScheduleService.createSchedule({
        title_hint: form.title_hint.trim() || null,
        course_id: form.course_id || null,
        scheduled_at: scheduledAt.toISOString(),
        auto_publish: form.auto_publish,
        prompt_notes: form.prompt_notes.trim() || null,
        created_by: user?.id || null,
        status: 'pending'
      })

      setSchedules((current) => [...current, created].sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      ))
      resetForm()
      setMessage(isAr ? 'تمت إضافة المهمة إلى الجدول الزمني.' : 'Task added to the schedule.')
    } catch (err) {
      setError(err?.message || (isAr ? 'تعذر إضافة المهمة.' : 'Could not add schedule.'))
    } finally {
      setIsSaving(false)
    }
  }

  const runSchedule = async (schedule) => {
    setProcessingId(schedule.id)
    setError('')
    setMessage('')

    try {
      await articleScheduleService.processSchedule(schedule, {
        courses,
        authorId: user?.id
      })
      await loadSchedules()
      onPostGenerated?.()
      setMessage(isAr ? 'تم توليد المقال بنجاح.' : 'Article generated successfully.')
    } catch (err) {
      setError(err?.message || (isAr ? 'فشل توليد المقال.' : 'Article generation failed.'))
      await loadSchedules()
    } finally {
      setProcessingId(null)
    }
  }

  const runDueSchedules = async () => {
    setIsRunningDue(true)
    setError('')
    setMessage('')

    try {
      const results = await articleScheduleService.processDueSchedules({
        courses,
        authorId: user?.id
      })
      await loadSchedules()
      onPostGenerated?.()

      if (results.length === 0) {
        setMessage(isAr ? 'لا توجد مهام مستحقة الآن.' : 'No due tasks right now.')
      } else {
        const successCount = results.filter((item) => item.success).length
        setMessage(
          isAr
            ? `تم تنفيذ ${successCount} من ${results.length} مهمة.`
            : `Executed ${successCount} of ${results.length} task(s).`
        )
      }
    } catch (err) {
      setError(err?.message || (isAr ? 'تعذر تنفيذ المهام.' : 'Could not run due tasks.'))
    } finally {
      setIsRunningDue(false)
    }
  }

  const cancelSchedule = async (scheduleId) => {
    try {
      await articleScheduleService.updateSchedule(scheduleId, { status: 'cancelled' })
      setSchedules((current) => current.map(
        (row) => (row.id === scheduleId ? { ...row, status: 'cancelled' } : row)
      ))
    } catch (err) {
      setError(err?.message || (isAr ? 'تعذر إلغاء المهمة.' : 'Could not cancel task.'))
    }
  }

  const deleteSchedule = async (scheduleId) => {
    if (!window.confirm(isAr ? 'حذف هذه المهمة من الجدول؟' : 'Delete this scheduled task?')) return

    try {
      await articleScheduleService.deleteSchedule(scheduleId)
      setSchedules((current) => current.filter((row) => row.id !== scheduleId))
    } catch (err) {
      setError(err?.message || (isAr ? 'تعذر حذف المهمة.' : 'Could not delete task.'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bepro-card p-5">
          <p className="text-white/60 text-sm mb-1">{isAr ? 'مهام قادمة' : 'Upcoming'}</p>
          <p className="text-3xl font-bold text-white">{stats.pending}</p>
        </div>
        <div className="bepro-card p-5">
          <p className="text-white/60 text-sm mb-1">{isAr ? 'مقالات مُولَّدة' : 'Generated'}</p>
          <p className="text-3xl font-bold text-green-400">{stats.ready}</p>
        </div>
        <div className="bepro-card p-5">
          <p className="text-white/60 text-sm mb-1">{isAr ? 'فشل' : 'Failed'}</p>
          <p className="text-3xl font-bold text-red-300">{stats.failed}</p>
        </div>
      </div>

      {message && (
        <div className="bepro-card p-4 flex items-center gap-3 text-white">
          <FiCheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          {message}
        </div>
      )}
      {error && <div className="bepro-card p-4 text-red-200">{error}</div>}

      <div className="grid xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-6 items-start">
        <form onSubmit={addSchedule} className="bepro-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-white">
            <FiZap className="w-5 h-5 text-[#00D9FF]" />
            <h2 className="text-xl font-bold">
              {isAr ? 'جدولة مقال AI' : 'Schedule AI Article'}
            </h2>
          </div>
          <p className="text-white/60 text-sm">
            {isAr
              ? 'حدد موعداً وسيقوم الوكيل بكتابة المقال تلقائياً بناءً على الكورس المختار.'
              : 'Pick a time and the agent will write the article automatically based on the selected course.'}
          </p>

          <label className="block">
            <span className="text-white font-bold mb-2 block">{isAr ? 'موضوع المقال (اختياري)' : 'Topic (optional)'}</span>
            <input
              value={form.title_hint}
              onChange={(e) => updateField('title_hint', e.target.value)}
              placeholder={isAr ? 'مثال: دليل المبتدئين في التحليل الفني' : 'e.g. Beginner guide to technical analysis'}
              className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white"
            />
          </label>

          <label className="block">
            <span className="text-white font-bold mb-2 block">{isAr ? 'الكورس المرتبط' : 'Related Course'}</span>
            <select
              value={form.course_id}
              onChange={(e) => updateField('course_id', e.target.value)}
              className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white"
            >
              <option className="bg-[#000428]" value="">{isAr ? 'اختيار تلقائي' : 'Auto select'}</option>
              {courses.map((course) => (
                <option className="bg-[#000428]" key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-white font-bold mb-2 block">{isAr ? 'الموعد المجدول' : 'Scheduled At'}</span>
            <input
              required
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => updateField('scheduled_at', e.target.value)}
              className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white"
            />
          </label>

          <label className="block">
            <span className="text-white font-bold mb-2 block">{isAr ? 'تعليمات إضافية للـ AI' : 'Extra AI Instructions'}</span>
            <textarea
              rows="3"
              value={form.prompt_notes}
              onChange={(e) => updateField('prompt_notes', e.target.value)}
              placeholder={isAr ? 'ركز على الفوائد العملية للطالب...' : 'Focus on practical benefits for students...'}
              className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white"
            />
          </label>

          <label className="flex items-center gap-3 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={form.auto_publish}
              onChange={(e) => updateField('auto_publish', e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>{isAr ? 'نشر تلقائي بعد التوليد' : 'Auto-publish after generation'}</span>
          </label>

          <button type="submit" disabled={isSaving} className="bepro-btn-primary w-full justify-center min-h-[48px]">
            {isSaving ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiPlus className="w-5 h-5" />}
            {isAr ? 'إضافة للجدول' : 'Add to Schedule'}
          </button>
        </form>

        <div className="bepro-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FiCalendar className="w-5 h-5 text-[#00D9FF]" />
                {isAr ? 'جدول AI Agent' : 'AI Agent Timeline'}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {isAr ? 'يتم فحص المهام المستحقة كل دقيقة تلقائياً.' : 'Due tasks are checked automatically every minute.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={loadSchedules} className="bepro-btn-secondary">
                <FiRefreshCw className="w-4 h-4" />
                {isAr ? 'تحديث' : 'Refresh'}
              </button>
              <button type="button" onClick={runDueSchedules} disabled={isRunningDue} className="bepro-btn-primary">
                {isRunningDue ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiPlay className="w-4 h-4" />}
                {isAr ? 'تنفيذ المستحق' : 'Run Due'}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <FiLoader className="w-10 h-10 text-[#00D9FF] animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <p className="text-white/70 text-center py-12">
              {isAr ? 'لا توجد مهام مجدولة بعد. أضف أول مقال AI.' : 'No scheduled tasks yet. Add your first AI article.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/60 border-b border-white/10">
                    <th className="text-start py-3 px-2 font-semibold">{isAr ? 'الموعد' : 'Schedule'}</th>
                    <th className="text-start py-3 px-2 font-semibold">{isAr ? 'الموضوع / الكورس' : 'Topic / Course'}</th>
                    <th className="text-start py-3 px-2 font-semibold">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="text-start py-3 px-2 font-semibold">{isAr ? 'النشر' : 'Publish'}</th>
                    <th className="text-start py-3 px-2 font-semibold">{isAr ? 'المقال' : 'Article'}</th>
                    <th className="text-end py-3 px-2 font-semibold">{isAr ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((row) => {
                    const statusLabel = STATUS_LABELS[row.status] || STATUS_LABELS.pending
                    const isDue = row.status === 'pending' && new Date(row.scheduled_at).getTime() <= Date.now()
                    const isProcessing = processingId === row.id || row.status === 'generating'

                    return (
                      <tr key={row.id} className="border-b border-white/5 text-white/90">
                        <td className="py-4 px-2 align-top">
                          <div className="flex items-start gap-2">
                            <FiClock className={`w-4 h-4 mt-0.5 shrink-0 ${isDue ? 'text-amber-300' : 'text-white/40'}`} />
                            <div>
                              <p className="font-medium">{formatScheduleDate(row.scheduled_at, language)}</p>
                              {isDue && (
                                <span className="text-xs text-amber-300">{isAr ? 'مستحق الآن' : 'Due now'}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2 align-top">
                          <p className="font-medium">{row.title_hint || row.course?.title || (isAr ? 'موضوع عام' : 'General topic')}</p>
                          {row.course?.title && row.title_hint && (
                            <p className="text-white/50 text-xs mt-1">{row.course.title}</p>
                          )}
                          {row.prompt_notes && (
                            <p className="text-white/40 text-xs mt-1 line-clamp-2">{row.prompt_notes}</p>
                          )}
                        </td>
                        <td className="py-4 px-2 align-top">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[row.status] || STATUS_COLORS.pending}`}>
                            {isAr ? statusLabel.ar : statusLabel.en}
                          </span>
                          {row.error_message && (
                            <p className="text-red-300 text-xs mt-1 max-w-[180px]">{row.error_message}</p>
                          )}
                        </td>
                        <td className="py-4 px-2 align-top">
                          {row.auto_publish
                            ? (isAr ? 'تلقائي' : 'Auto')
                            : (isAr ? 'مسودة' : 'Draft')}
                        </td>
                        <td className="py-4 px-2 align-top">
                          {row.blog_post ? (
                            <Link to="/blogs" className="text-[#00D9FF] hover:underline inline-flex items-center gap-1">
                              <FiEdit3 className="w-3.5 h-3.5" />
                              {row.blog_post.title?.slice(0, 28) || (isAr ? 'عرض' : 'View')}
                            </Link>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                        <td className="py-4 px-2 align-top">
                          <div className="flex justify-end gap-1">
                            {(row.status === 'pending' || row.status === 'failed') && (
                              <button
                                type="button"
                                onClick={() => runSchedule(row)}
                                disabled={isProcessing}
                                className="p-2 rounded-lg bg-[#00D9FF]/20 text-[#00D9FF] hover:bg-[#00D9FF]/30"
                                title={isAr ? 'توليد الآن' : 'Generate now'}
                              >
                                {isProcessing ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiZap className="w-4 h-4" />}
                              </button>
                            )}
                            {row.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => cancelSchedule(row.id)}
                                className="p-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 text-xs px-2"
                              >
                                {isAr ? 'إلغاء' : 'Cancel'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteSchedule(row.id)}
                              className="p-2 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30"
                              title={isAr ? 'حذف' : 'Delete'}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ArticleSchedulePanel
