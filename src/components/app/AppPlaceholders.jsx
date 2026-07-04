import { useTranslation } from 'react-i18next'

export function TeacherCoursesPlaceholder() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen pt-6 pb-16">
      <div className="container-custom">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('app.myCoursesTitle')}</h1>
          <a href="/teacher/create-course" className="btn btn-primary w-full sm:w-auto">
            {t('app.createNewCourse')}
          </a>
        </div>
        <div className="card card-body">
          <p className="text-center text-secondary-500 py-8">{t('app.noCoursesYet')}</p>
        </div>
      </div>
    </div>
  )
}

export function AdminPlaceholder() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen pt-6 pb-16">
      <div className="container-custom">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8">{t('app.adminPanel')}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="card card-body text-center">
            <h3 className="text-3xl font-bold text-primary-500 mb-2">150</h3>
            <p className="text-secondary-500">{t('app.totalUsers')}</p>
          </div>
          <div className="card card-body text-center">
            <h3 className="text-3xl font-bold text-primary-500 mb-2">70</h3>
            <p className="text-secondary-500">{t('app.totalCourses')}</p>
          </div>
          <div className="card card-body text-center">
            <h3 className="text-3xl font-bold text-primary-500 mb-2">$12,500</h3>
            <p className="text-secondary-500">{t('app.totalRevenue')}</p>
          </div>
        </div>
        <div className="mt-8 card card-body">
          <h2 className="text-xl font-bold mb-4">{t('app.quickActions')}</h2>
          <div className="flex flex-wrap gap-4">
            <button type="button" className="btn btn-primary">{t('app.addNewCourse')}</button>
            <button type="button" className="btn btn-secondary">{t('app.manageUsers')}</button>
            <button type="button" className="btn btn-secondary">{t('app.viewReports')}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen pt-6 pb-16 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl sm:text-6xl font-bold text-primary-500 mb-4">404</h1>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">{t('app.pageNotFound')}</h2>
        <p className="text-secondary-600 dark:text-secondary-400 mb-8">{t('app.pageNotFoundDesc')}</p>
        <a href="/" className="btn btn-primary">{t('app.goHome')}</a>
      </div>
    </div>
  )
}
