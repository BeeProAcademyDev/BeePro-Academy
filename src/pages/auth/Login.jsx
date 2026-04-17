import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import { 
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff,
  FiAlertCircle
} from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'

const Login = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/dashboard'

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await login(formData.email, formData.password)
      if (result.success) {
        navigate(redirectTo)
      } else {
        setError(result.error || (language === 'ar' ? 'حدث خطأ في تسجيل الدخول' : 'Login failed'))
      }
    } catch (err) {
      setError(language === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { authService } = await import('../../services/api')
      await authService.signInWithGoogle()
    } catch (err) {
      setError(language === 'ar' ? 'فشل تسجيل الدخول بواسطة Google' : 'Google sign in failed')
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center">
      <div className="container-custom">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('auth.login.title')}</h1>
            <p className="text-secondary-600 dark:text-secondary-400">
              {language === 'ar' 
                ? 'أدخل بياناتك للوصول إلى حسابك'
                : 'Enter your credentials to access your account'
              }
            </p>
          </div>

          {/* Form Card */}
          <div className="card card-body">
            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
                <FiAlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="label">
                  {t('auth.login.email')}
                </label>
                <div className="relative">
                  <FiMail className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input ps-12"
                    placeholder={language === 'ar' ? 'example@email.com' : 'example@email.com'}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="label">
                  {t('auth.login.password')}
                </label>
                <div className="relative">
                  <FiLock className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input ps-12 pe-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 -translate-y-1/2 end-4 text-secondary-400 hover:text-secondary-600"
                  >
                    {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember & Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm">{t('auth.login.remember')}</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-500 hover:text-primary-600"
                >
                  {t('auth.login.forgot')}
                </Link>
              </div>

              {/* Submit */}
              <Button type="submit" fullWidth loading={isLoading}>
                {t('auth.login.submit')}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-secondary-200 dark:border-dark-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white dark:bg-dark-card text-sm text-secondary-500">
                  {language === 'ar' ? 'أو' : 'or'}
                </span>
              </div>
            </div>

            {/* Social Login */}
            <Button variant="outline" fullWidth className="gap-3" onClick={handleGoogleSignIn}>
              <FcGoogle className="w-5 h-5" />
              {language === 'ar' ? 'تسجيل الدخول بواسطة Google' : 'Continue with Google'}
            </Button>

            {/* Register Link */}
            <p className="text-center mt-6 text-secondary-600 dark:text-secondary-400">
              {t('auth.login.noAccount')}{' '}
              <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
                {t('auth.login.register')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login