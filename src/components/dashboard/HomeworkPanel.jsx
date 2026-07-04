import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FiCheckCircle, FiClock, FiFileText, FiUploadCloud, FiXCircle } from 'react-icons/fi'

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800',
  submitted: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800',
  reviewed: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-200 dark:border-green-800',
  late: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
}

const HomeworkPanel = () => {
  const { t, i18n } = useTranslation()
  const [deadline, setDeadline] = useState('')
  const [status, setStatus] = useState('pending')
  const [files, setFiles] = useState([])

  const formattedDeadline = useMemo(() => {
    if (!deadline) return t('homework.noDeadline')
    return new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(deadline))
  }, [deadline, i18n.language, t])

  const addFiles = (event) => {
    const selected = Array.from(event.target.files || [])
    setFiles((current) => [
      ...current,
      ...selected.map((file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        size: file.size
      }))
    ])
    if (selected.length > 0) {
      setStatus('submitted')
    }
    event.target.value = ''
  }

  const removeFile = (id) => {
    setFiles((current) => current.filter((file) => file.id !== id))
    if (files.length <= 1) {
      setStatus('pending')
    }
  }

  const formatSize = (size) => {
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('homework.title')}</h2>
          <p className="text-secondary-600 dark:text-secondary-400">{t('homework.subtitle')}</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${statusStyles[status]}`}>
          {status === 'reviewed' ? <FiCheckCircle className="w-4 h-4" /> : status === 'late' ? <FiXCircle className="w-4 h-4" /> : <FiClock className="w-4 h-4" />}
          {t(`homework.status.${status}`)}
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="card card-body">
          <label htmlFor="homework-upload" className="block rounded-2xl border-2 border-dashed border-secondary-300 bg-secondary-50 p-6 text-center cursor-pointer transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-dark-border dark:bg-dark-bg dark:hover:bg-primary-900/10">
            <FiUploadCloud className="w-12 h-12 mx-auto mb-3 text-primary-500" />
            <span className="block text-lg font-bold mb-1">{t('homework.uploadTitle')}</span>
            <span className="block text-sm text-secondary-600 dark:text-secondary-400">{t('homework.uploadHint')}</span>
            <input id="homework-upload" type="file" multiple className="sr-only" onChange={addFiles} />
          </label>

          <div className="mt-6">
            <h3 className="font-bold mb-3">{t('homework.fileList')}</h3>
            {files.length === 0 ? (
              <div className="rounded-xl border border-secondary-200 bg-white p-5 text-center text-secondary-500 dark:border-dark-border dark:bg-dark-card">
                {t('homework.emptyFiles')}
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-secondary-200 p-4 dark:border-dark-border">
                    <div className="flex min-w-0 items-center gap-3">
                      <FiFileText className="w-5 h-5 shrink-0 text-primary-500" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{file.name}</p>
                        <p className="text-sm text-secondary-500">{formatSize(file.size)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeFile(file.id)} className="text-sm font-semibold text-red-600 hover:text-red-700">
                      {t('common.remove')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="card card-body h-fit">
          <h3 className="font-bold mb-4">{t('homework.details')}</h3>
          <label htmlFor="homework-deadline" className="label">{t('homework.deadline')}</label>
          <input
            id="homework-deadline"
            type="datetime-local"
            className="input mb-4"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-4">
            {formattedDeadline}
          </p>
          <label htmlFor="homework-status" className="label">{t('homework.statusLabel')}</label>
          <select id="homework-status" className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
            {['pending', 'submitted', 'reviewed', 'late'].map((item) => (
              <option key={item} value={item}>{t(`homework.status.${item}`)}</option>
            ))}
          </select>
        </aside>
      </div>
    </div>
  )
}

export default HomeworkPanel
