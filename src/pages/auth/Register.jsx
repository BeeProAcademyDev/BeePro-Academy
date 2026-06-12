import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { normalizeSignupAccountType } from '../../lib/roles'
import { getLandingAuthUrl } from '../../lib/authRoutes'
import { formatErrorMessage } from '../../lib/supabaseErrors'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import { 
  FiUser,
  FiMail, 
  FiLock, 
  FiEye, 
  FiEyeOff,
  FiAlertCircle,
  FiCheck
} from 'react-icons/fi'
import { FcGoogle } from 'react-icons/fc'

const Register = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [accountType, setAccountType] = useState(() => (
    normalizeSignupAccountType(searchParams.get('role'))
  ))
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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

  const validatePassword = (password) => {
    const requirements = [
      { test: password.length >= 8, label: language === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters' },
      { test: /[A-Z]/.test(password), label: language === 'ar' ? 'حرف كبير واحد على الأقل' : 'At least one uppercase letter' },
      { test: /[a-z]/.test(password), label: language === 'ar' ? 'حرف صغير واحد على الأقل' : 'At least one lowercase letter' },
      { test: /[0-9]/.test(password), label: language === 'ar' ? 'رقم واحد على الأقل' : 'At least one number' },
    ]
    return requirements
  }

  const passwordRequirements = validatePassword(formData.password)
  const isPasswordValid = passwordRequirements.every(req => req.test)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validation
    if (!formData.name.trim()) {
      setError(language === 'ar' ? 'يرجى إدخال الاسم' : 'Please enter your name')
      setIsLoading(false)
      return
    }

    if (!isPasswordValid) {
      setError(language === 'ar' ? 'كلمة المرور لا تستوفي الشروط' : 'Password does not meet requirements')
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError(language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!formData.terms) {
      setError(language === 'ar' ? 'يرجى الموافقة على الشروط والأحكام' : 'Please agree to the terms and conditions')
      setIsLoading(false)
      return
    }

    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.name,
        role: accountType
      })
      if (result.success) {
        const emailNotice = result.emailDeliveryFailed
          ? (language === 'ar'
            ? 'تم إنشاء حسابك، لكن لم يُرسل بريد التأكيد. يمكنك تسجيل الدخول مباشرة إذا كان التأكيد معطّلاً في Supabase.'
            : 'Account created, but the confirmation email could not be sent. You can sign in directly if email confirmation is disabled in Supabase.')
          : null

        if (result.pendingApproval) {
          navigate('/dashboard', {
            state: {
              registrationNotice: language === 'ar'
                ? [emailNotice, 'تم إرسال طلب التسجيل كمدرس. سيتم تفعيل حسابك بعد موافقة الإدارة.'].filter(Boolean).join(' ')
                : [emailNotice, 'Your instructor application was submitted. Your account will be activated after admin approval.'].filter(Boolean).join(' ')
            }
          })
        } else {
          navigate('/dashboard', {
            state: emailNotice ? { registrationNotice: emailNotice } : undefined
          })
        }
      } else {
        const fallback = language === 'ar' ? 'حدث خطأ في إنشاء الحساب' : 'Registration failed'
        const errText = formatErrorMessage(result.error)
        const message = errText.includes('VITE_ADMIN_EMAILS')
          ? (language === 'ar'
            ? 'لا يمكن التسجيل كإداري إلا بالبريد المصرّح به في VITE_ADMIN_EMAILS'
            : errText)
          : (errText || fallback)
        setError(message)
      }
    } catch (err) {
      setError(formatErrorMessage(err) || (language === 'ar' ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    try {
      const { authService } = await import('../../services/api')
      await authService.signInWithGoogle()
    } catch (err) {
      setError(language === 'ar' ? 'فشل التسجيل بواسطة Google' : 'Google sign up failed')
    }
  }

  return (
    <div className="min-h-screen pt-20 pb-16 flex items-center">
      <div className="container-custom">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">{t('auth.register.title')}</h1>
            <p className="text-primary-500 font-medium text-lg mb-2">
              ✦ Empowering Minds Through Professional Education ✦
            </p>
            <p className="text-secondary-600 dark:text-secondary-400">
              {accountType === 'teacher'
                ? (language === 'ar'
                  ? 'قدّم طلبك للتدريس — يتطلب موافقة الإدارة'
                  : 'Apply to teach on BeePro — admin approval required')
                : (language === 'ar'
                  ? 'أنشئ حسابك وابدأ رحلة التعلم'
                  : 'Create your account and start learning')
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

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label htmlFor="name" className="label">
                  {t('auth.register.name')}
                </label>
                <div className="relative">
                  <FiUser className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="input ps-12"
                    placeholder={language === 'ar' ? 'أحمد محمد' : 'John Doe'}
                    required
                  />
                </div>
              </div>

              {/* Account Type */}
              <div>
                <label className="label">
                  {language === 'ar' ? 'نوع الحساب' : 'Account Type'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccountType('student')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      accountType === 'student'
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20'
                        : 'border-secondary-200 dark:border-dark-border'
                    }`}
                  >
                    {language === 'ar' ? 'طالب' : 'Student'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('teacher')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      accountType === 'teacher'
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20'
                        : 'border-secondary-200 dark:border-dark-border'
                    }`}
                  >
                    {language === 'ar' ? 'مدرس' : 'Teacher'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccountType('admin')}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                      accountType === 'admin'
                        ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20'
                        : 'border-secondary-200 dark:border-dark-border'
                    }`}
                  >
                    {language === 'ar' ? 'إداري' : 'Admin'}
                  </button>
                </div>
                {accountType === 'teacher' && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    {language === 'ar'
                      ? 'سيتم مراجعة طلبك من قبل الإدارة قبل تفعيل صلاحيات المدرس.'
                      : 'Your application will be reviewed by an admin before you can create courses.'}
                  </p>
                )}
                {accountType === 'admin' && (
                  <p className="text-sm text-secondary-500 mt-2">
                    {language === 'ar'
                      ? 'التسجيل كإداري متاح فقط للبريد المضاف في VITE_ADMIN_EMAILS.'
                      : 'Admin registration is only available for emails listed in VITE_ADMIN_EMAILS.'}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="label">
                  {t('auth.register.email')}
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
                  {t('auth.register.password')}
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

                {/* Password Requirements */}
                {formData.password && (
                  <div className="mt-3 space-y-2">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className={`flex items-center gap-2 text-sm ${req.test ? 'text-green-600' : 'text-secondary-400'}`}>
                        <FiCheck className={`w-4 h-4 ${req.test ? 'opacity-100' : 'opacity-30'}`} />
                        <span>{req.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="label">
                  {t('auth.register.confirmPassword')}
                </label>
                <div className="relative">
                  <FiLock className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-secondary-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`input ps-12 pe-12 ${
                      formData.confirmPassword && formData.password !== formData.confirmPassword 
                        ? 'input-error' 
                        : ''
                    }`}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 -translate-y-1/2 end-4 text-secondary-400 hover:text-secondary-600"
                  >
                    {showConfirmPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                  </button>
                </div>
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">
                    {language === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match'}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="terms"
                    checked={formData.terms}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 rounded border-secondary-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-600 dark:text-secondary-400">
                    {language === 'ar' ? 'أوافق على ' : 'I agree to the '}
                    <Link to="/terms" className="text-primary-500 hover:underline">
                      {t('footer.terms')}
                    </Link>
                    {language === 'ar' ? ' و' : ' and '}
                    <Link to="/privacy" className="text-primary-500 hover:underline">
                      {t('footer.privacy')}
                    </Link>
                  </span>
                </label>
              </div>

              {/* Submit */}
              <Button type="submit" fullWidth loading={isLoading}>
                {t('auth.register.submit')}
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

            {/* Social Register */}
            <Button variant="outline" fullWidth className="gap-3" onClick={handleGoogleSignUp}>
              <FcGoogle className="w-5 h-5" />
              {language === 'ar' ? 'التسجيل بواسطة Google' : 'Continue with Google'}
            </Button>

            {/* Login Link */}
            <p className="text-center mt-6 text-secondary-600 dark:text-secondary-400">
              {t('auth.register.hasAccount')}{' '}
              <Link to={getLandingAuthUrl('login')} className="text-primary-500 hover:text-primary-600 font-medium">
                {t('auth.register.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register