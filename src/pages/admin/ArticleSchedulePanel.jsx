import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { articleScheduleService } from '../../services/api'
import { useTranslation } from 'react-i18next'
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
  pending: 'articleSchedulePanel.status.pending',
  generating: 'articleSchedulePanel.status.generating',
  ready: 'articleSchedulePanel.status.ready',
  published: 'articleSchedulePanel.status.published',
  failed: 'articleSchedulePanel.status.failed',
  cancelled: 'articleSchedulePanel.status.cancelled'
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
  if (!value) return '-'
  let locale = 'en-US'
  if (language === 'ar') {
    locale = 'ar-EG'
  }
  return new Date(value).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

const ArticleSchedulePanel = ({ courses = [], onPostGenerated }) => {
  const { t } = useTranslation()
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
      setError(t('articleSchedulePanel.couldNotLoadAiSchedule'))
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
              t('articleSchedulePanel.successcountArticlesGeneratedA')
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
        throw new Error(t('articleSchedulePanel.invalidScheduleDate'))
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
      setMessage(t('articleSchedulePanel.taskAddedToTheSchedule'))
    } catch (err) {
      setError(err?.message || (t('articleSchedulePanel.couldNotAddSchedule')))
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
      setMessage(t('articleSchedulePanel.articleGeneratedSuccessfully'))
    } catch (err) {
      setError(err?.message || (t('articleSchedulePanel.articleGenerationFailed')))
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
        setMessage(t('articleSchedulePanel.noDueTasksRightNow'))
      } else {
        const successCount = results.filter((item) => item.success).length
        setMessage(
          t('articleSchedulePanel.executedSuccesscountOfResultsl')
        )
      }
    } catch (err) {
      setError(err?.message || (t('articleSchedulePanel.couldNotRunDueTasks')))
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
      setError(err?.message || (t('articleSchedulePanel.couldNotCancelTask')))
    }
  }

  const deleteSchedule = async (scheduleId) => {
    if (!window.confirm(t('articleSchedulePanel.deleteThisScheduledTask'))) return

    try {
      await articleScheduleService.deleteSchedule(scheduleId)
      setSchedules((current) => current.filter((row) => row.id !== scheduleId))
    } catch (err) {
      setError(err?.message || (t('articleSchedulePanel.couldNotDeleteTask')))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bepro-card p-5">
          <p className="text-white/60 text-sm mb-1">{t('articleSchedulePanel.upcoming')}</p>
          <p className="text-3xl font-bold text-white">{stats.pending}</p>
        </div>
        <div className="bepro-card p-5">
          <p className="text-white/60 text-sm mb-1">{t('articleSchedulePanel.generated')}</p>
          <p className="text-3xl font-bold text-green-400">{stats.ready}</p>
        </div>
        <div className="bepro-card p-5">
          <p className="text-white/60 text-sm mb-1">{t('articleSchedulePanel.failed')}</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] gap-6 items-start">
        <form onSubmit={addSchedule} className="bepro-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-white">
            <FiZap className="w-5 h-5 text-[#00D9FF]" />
            <h2 className="text-xl font-bold">
              {t('articleSchedulePanel.scheduleAiArticle')}
            </h2>
          </div>
          <p className="text-white/60 text-sm">
            {t('articleSchedulePanel.pickATimeAndTheAgentWillWriteT')}
          </p>

          <label className="block">
            <span className="text-white font-bold mb-2 block">{t('articleSchedulePanel.topicOptional')}</span>
            <input
              value={form.title_hint}
              onChange={(e) => updateField('title_hint', e.target.value)}
              placeholder={t('articleSchedulePanel.egBeginnerGuideToTechnicalAnal')}
              className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white"
            />
          </label>

          <label className="block">
            <span className="text-white font-bold mb-2 block">{t('articleSchedulePanel.relatedCourse')}</span>
            <select
              value={form.course_id}
              onChange={(e) => updateField('course_id', e.target.value)}
              className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white"
            >
              <option className="bg-[#000428]" value="">{t('articleSchedulePanel.autoSelect')}</option>
              {courses.map((course) => (
                <option className="bg-[#000428]" key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-white font-bold mb-2 block">{t('articleSchedulePanel.scheduledAt')}</span>
            <input
              required
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => updateField('scheduled_at', e.target.value)}
              className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white"
            />
          </label>

          <label className="block">
            <span className="text-white font-bold mb-2 block">{t('articleSchedulePanel.extraAiInstructions')}</span>
            <textarea
              rows="3"
              value={form.prompt_notes}
              onChange={(e) => updateField('prompt_notes', e.target.value)}
              placeholder={t('articleSchedulePanel.focusOnPracticalBenefitsForStu')}
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
            <span>{t('articleSchedulePanel.autopublishAfterGeneration')}</span>
          </label>

          <button type="submit" disabled={isSaving} className="bepro-btn-primary w-full justify-center min-h-[48px]">
            {isSaving ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiPlus className="w-5 h-5" />}
            {t('articleSchedulePanel.addToSchedule')}
          </button>
        </form>

        <div className="bepro-card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FiCalendar className="w-5 h-5 text-[#00D9FF]" />
                {t('articleSchedulePanel.aiAgentTimeline')}
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {t('articleSchedulePanel.dueTasksAreCheckedAutomaticall')}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={loadSchedules} className="bepro-btn-secondary">
                <FiRefreshCw className="w-4 h-4" />
                {t('articleSchedulePanel.refresh')}
              </button>
              <button type="button" onClick={runDueSchedules} disabled={isRunningDue} className="bepro-btn-primary">
                {isRunningDue ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiPlay className="w-4 h-4" />}
                {t('articleSchedulePanel.runDue')}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <FiLoader className="w-10 h-10 text-[#00D9FF] animate-spin" />
            </div>
          ) : schedules.length === 0 ? (
            <p className="text-white/70 text-center py-12">
              {t('articleSchedulePanel.noScheduledTasksYetAddYourFirs')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/60 border-b border-white/10">
                    <th className="text-start py-3 px-2 font-semibold">{t('articleSchedulePanel.schedule')}</th>
                    <th className="text-start py-3 px-2 font-semibold">{t('articleSchedulePanel.topicCourse')}</th>
                    <th className="text-start py-3 px-2 font-semibold">{t('dashboardExtra.status')}</th>
                    <th className="text-start py-3 px-2 font-semibold">{t('articleSchedulePanel.publish')}</th>
                    <th className="text-start py-3 px-2 font-semibold">{t('articleSchedulePanel.article')}</th>
                    <th className="text-end py-3 px-2 font-semibold">{t('articleSchedulePanel.actions')}</th>
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
                                <span className="text-xs text-amber-300">{t('articleSchedulePanel.dueNow')}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2 align-top">
                          <p className="font-medium">{row.title_hint || row.course?.title || (t('articleSchedulePanel.generalTopic'))}</p>
                          {row.course?.title && row.title_hint && (
                            <p className="text-white/50 text-xs mt-1">{row.course.title}</p>
                          )}
                          {row.prompt_notes && (
                            <p className="text-white/40 text-xs mt-1 line-clamp-2">{row.prompt_notes}</p>
                          )}
                        </td>
                        <td className="py-4 px-2 align-top">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[row.status] || STATUS_COLORS.pending}`}>
                            {t(statusLabel)}
                          </span>
                          {row.error_message && (
                            <p className="text-red-300 text-xs mt-1 break-words">{row.error_message}</p>
                          )}
                        </td>
                        <td className="py-4 px-2 align-top">
                          {row.auto_publish
                            ? (t('articleSchedulePanel.auto'))
                            : t('dashboardExtra.draft')}
                        </td>
                        <td className="py-4 px-2 align-top">
                          {row.blog_post ? (
                            <Link to="/blogs" className="text-[#00D9FF] hover:underline inline-flex items-center gap-1">
                              <FiEdit3 className="w-3.5 h-3.5" />
                              {row.blog_post.title?.slice(0, 28) || t('dashboardExtra.view')}
                            </Link>
                          ) : (
                            <span className="text-white/40">-</span>
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
                                title={t('articleSchedulePanel.generateNow')}
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
                                {t('articleSchedulePanel.cancel')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteSchedule(row.id)}
                              className="p-2 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30"
                              title={t('articleSchedulePanel.delete')}
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

