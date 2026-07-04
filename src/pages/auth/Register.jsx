import { useTranslation } from 'react-i18next'
import AuthTabs from '../../components/auth/AuthTabs'

const Register = () => {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center px-4">
      <div className="container-custom w-full">
        <div className="max-w-md mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('authUnified.title')}</h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              {t('authUnified.subtitle')}
            </p>
          </div>
          <AuthTabs initialTab="register" redirectTo="/dashboard" />
        </div>
      </div>
    </div>
  )
}

export default Register
