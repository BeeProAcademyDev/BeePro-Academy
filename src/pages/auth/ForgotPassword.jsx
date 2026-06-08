import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import { FiMail, FiAlertCircle, FiCheckCircle, FiArrowLeft, FiArrowRight } from 'react-icons/fi'

const ForgotPassword = () => {
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const { resetPassword } = useAuth()
  const isAr = language === 'ar'
  const BackIcon = isRTL ? FiArrowRight : FiArrowLeft

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(false)

    const trimmed = email.trim()
    if (!trimmed) {
      setError(isAr ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email')
      setIsLoading(false)
      return
    }

    try {
      const result = await resetPassword(trimmed)
      if (result.success) {
        setSuccess(true)
      } else {
        setError(result.error || (isAr ? 'تعذر إرسال الرابط' : 'Could not send reset link'))
      }
    } catch {
      setError(isAr ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center">
      <div className="container-custom">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('auth.forgot.title')}</h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              {t('auth.forgot.description')}
            </p>
          </div>

          <div className="card card-body">
            {error && (
              <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                <FiAlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <div className="text-center py-4">
                <FiCheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                <p className="text-secondary-700 dark:text-secondary-300 mb-2 font-medium">
                  {t('auth.forgot.successTitle')}
                </p>
                <p className="text-sm text-secondary-500 mb-6">
                  {t('auth.forgot.successMessage')}
                </p>
                <Link to="/login" className="btn btn-primary w-full inline-flex items-center justify-center gap-2">
                  <BackIcon className="w-4 h-4" />
                  {t('auth.forgot.back')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="label">
                    {t('auth.forgot.email')}
                  </label>
                  <div className="relative">
                    <FiMail className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError('')
                      }}
                      className="input ps-12"
                      placeholder="example@email.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button type="submit" fullWidth loading={isLoading}>
                  {t('auth.forgot.submit')}
                </Button>

                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 text-sm text-primary-500 hover:text-primary-600"
                >
                  <BackIcon className="w-4 h-4" />
                  {t('auth.forgot.back')}
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
