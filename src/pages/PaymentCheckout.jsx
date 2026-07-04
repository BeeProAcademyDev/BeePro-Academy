import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiUploadCloud, FiCheckCircle, FiLoader } from 'react-icons/fi'
import { useLanguage } from '../contexts/LanguageContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useAuth } from '../contexts/AuthContext'
import { courseService } from '../services/api'
import { isStudentUser } from '../lib/roles'
import { paymentService } from '../services/paymentAPI'
import { useTranslation } from 'react-i18next'

const formatDetails = (details) => {
  if (!details || typeof details !== 'object') return []

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => ({
      key: key.replace(/_/g, ' '),
      value: String(value)
    }))
}

const PaymentCheckout = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { language } = useLanguage()
  const isArabic = language === 'ar'
  const { formatCoursePrice, currencyCode, convertFromUsd, currency } = useCurrency()
  const { user } = useAuth()

  const [course, setCourse] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [selectedMethodId, setSelectedMethodId] = useState('')
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    amount: '',
    senderInfo: '',
    transactionReference: '',
    notes: ''
  })

  const isStudent = isStudentUser(user)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError('')

        const courseData = await courseService.getCourseCheckoutSummary(id)

        if (!courseData) throw new Error('Course not found')

        setCourse(courseData)
        setFormData((prev) => ({
          ...prev,
          amount: String(convertFromUsd(courseData.price || 0))
        }))

        const methods = await paymentService.getCoursePaymentMethods(id, courseData.instructor_id)
        setPaymentMethods(methods)

        if (methods.length > 0) {
          setSelectedMethodId(methods[0].id)
        }
      } catch (err) {
        setError(err.message || 'Failed to load checkout details')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id, convertFromUsd])

  useEffect(() => {
    if (!course) return
    setFormData((prev) => ({
      ...prev,
      amount: String(convertFromUsd(course.price || 0)),
    }))
  }, [course, currencyCode, convertFromUsd])

  const selectedMethod = useMemo(
    () => paymentMethods.find((m) => m.id === selectedMethodId),
    [paymentMethods, selectedMethodId]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isStudent) {
      setError(t('paymentCheckout.paymentIsAllowedForStudentsOnl'))
      return
    }

    if (!selectedMethodId) {
      setError(t('paymentCheckout.pleaseSelectAPaymentMethod'))
      return
    }

    if (!screenshotFile) {
      setError(t('paymentCheckout.pleaseUploadPaymentScreenshot'))
      return
    }

    if (!course || !user?.id) {
      setError(t('paymentCheckout.missingUserOrCourseInfo'))
      return
    }

    try {
      setIsSubmitting(true)
      setError('')

      const screenshotUrl = await paymentService.uploadPaymentScreenshot(
        screenshotFile,
        user.id,
        course.id
      )

      const notesParts = []
      if (formData.senderInfo) {
        notesParts.push(`Sender info: ${formData.senderInfo}`)
      }
      if (formData.notes) {
        notesParts.push(formData.notes)
      }

      await paymentService.submitPaymentProof({
        student_id: user.id,
        instructor_id: course.instructor_id,
        course_id: course.id,
        payment_method_id: selectedMethodId,
        amount: Number(formData.amount || 0),
        currency: currencyCode,
        transaction_reference: formData.transactionReference || null,
        payment_screenshot_url: screenshotUrl,
        additional_notes: notesParts.join('\n\n') || null
      })

      setIsSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1800)
    } catch (err) {
      setError(err.message || (t('paymentCheckout.failedToSubmitPayment')))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <FiLoader className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen pt-24 container-custom">
        <div className="card card-body max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">{t('paymentCheckout.courseIsNotAvailable')}</h2>
          <Link to="/courses" className="btn btn-primary w-fit mx-auto">
            {t('paymentCheckout.backToCourses')}
          </Link>
        </div>
      </div>
    )
  }

  if (user && !isStudent) {
    return (
      <div className="min-h-screen pt-24 container-custom">
        <div className="card card-body max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">
            {t('paymentCheckout.paymentIsForStudentsOnly')}
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 mb-4">
            {t('paymentCheckout.adminAndInstructorAccountsCann')}
          </p>
          <Link to={`/courses/${id}`} className="btn btn-primary w-fit mx-auto">
            {t('paymentCheckout.backToCourse_33')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-secondary-50 dark:bg-dark-bg">
      <div className="container-custom max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">
            {t('paymentCheckout.coursePaymentCheckout')}
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            {t('paymentCheckout.chooseAPaymentMethodCompleteTr')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
          <div className="lg:col-span-2 card card-body min-w-0">
            {isSuccess ? (
              <div className="text-center py-12">
                <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">
                  {t('paymentCheckout.paymentProofSubmittedSuccessfu')}
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400">
                  {t('paymentCheckout.admininstructorWillReviewItAnd')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-3">
                    {t('paymentCheckout.1SelectPaymentMethod')}
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                    {t('paymentCheckout.allPaymentMethodsAvailableForT')}
                  </p>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`block border rounded-xl p-4 cursor-pointer transition-colors ${
                          selectedMethodId === method.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-secondary-200 dark:border-dark-border hover:border-primary-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="payment_method"
                            value={method.id}
                            checked={selectedMethodId === method.id}
                            onChange={() => setSelectedMethodId(method.id)}
                            className="mt-1"
                          />
                          <div>
                            <p className="font-semibold">{method.display_name}</p>
                            <p className="text-sm text-secondary-500">{method.payment_type}</p>
                            <div className="mt-2 text-sm text-secondary-700 dark:text-secondary-300 space-y-1">
                              {formatDetails(method.payment_details).map((item) => (
                                <p key={item.key}>
                                  <span className="font-medium">{item.key}:</span> {item.value}
                                </p>
                              ))}
                            </div>
                            {method.instructions && (
                              <p className="mt-2 text-sm italic text-secondary-600 dark:text-secondary-400">
                                {method.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {paymentMethods.length === 0 && (
                    <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4">
                      <p className="text-amber-800 dark:text-amber-200 text-sm font-semibold mb-2">
                        {t('paymentCheckout.noActivePaymentMethodsAreConfi')}
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 text-sm mb-2">
                        {t('paymentCheckout.pleaseContactAdminToActivateOn')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {['Vodafone Cash', 'PayPal', 'Crypto', 'Bank Transfer', 'Other'].map((type) => (
                          <span
                            key={type}
                            className="text-xs px-2 py-1 rounded-full bg-white/70 dark:bg-dark-card border border-amber-300 dark:border-amber-700"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-3">
                    {t('paymentCheckout.2PaymentDetails')}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        {t('dashboardExtra.amount')} ({isArabic ? currency.labelAr : currency.labelEn})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                        className="input"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">{t('paymentCheckout.transactionReference')}</label>
                      <input
                        type="text"
                        value={formData.transactionReference}
                        onChange={(e) => setFormData((prev) => ({ ...prev, transactionReference: e.target.value }))}
                        className="input"
                        placeholder={t('paymentCheckout.exampleTxn12345')}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="label">
                      {t('paymentCheckout.senderInformationPhonewalletac')}
                    </label>
                    <input
                      type="text"
                      value={formData.senderInfo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, senderInfo: e.target.value }))}
                      className="input"
                      placeholder={t('paymentCheckout.enterSenderPhoneaccountDetails')}
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <label className="label">{t('paymentCheckout.additionalNotes')}</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      className="input min-h-[110px]"
                      placeholder={t('paymentCheckout.anyAdditionalPaymentNotes')}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-3">
                    {t('paymentCheckout.3UploadPaymentScreenshot')}
                  </h3>
                  <label className="border-2 border-dashed rounded-xl p-6 text-center block cursor-pointer hover:border-primary-400 transition-colors">
                    <FiUploadCloud className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                    <p className="font-medium">
                      {screenshotFile ? screenshotFile.name : (t('paymentCheckout.choosePaymentScreenshot'))}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </div>

                {error && (
                  <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting || paymentMethods.length === 0 || !isStudent}
                    className="btn btn-primary"
                  >
                    {isSubmitting
                      ? (t('paymentCheckout.submitting'))
                      : (t('paymentCheckout.submitPayment'))}
                  </button>
                  <Link to={`/courses/${course.id}`} className="btn btn-outline">
                    {t('paymentCheckout.backToCourse')}
                  </Link>
                </div>
              </form>
            )}
          </div>

          <div className="card card-body h-fit">
            <h3 className="text-lg font-bold mb-3">{t('paymentCheckout.orderSummary')}</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">{t('paymentCheckout.course')}</span> {course.title}</p>
              <p><span className="font-medium">{t('paymentCheckout.price')}</span> {formatCoursePrice(course.price || 0).full}</p>
              <p><span className="font-medium">{t('paymentCheckout.status')}</span> {t('paymentCheckout.awaitingPaymentProof')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentCheckout
