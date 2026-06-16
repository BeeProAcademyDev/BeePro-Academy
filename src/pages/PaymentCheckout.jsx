import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiUploadCloud, FiCheckCircle, FiLoader } from 'react-icons/fi'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { isStudentUser } from '../lib/roles'
import { paymentService } from '../services/paymentAPI'

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
  const { id } = useParams()
  const navigate = useNavigate()
  const { language } = useLanguage()
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

        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('id, title, price, instructor_id')
          .eq('id', id)
          .single()

        if (courseError) throw courseError

        setCourse(courseData)
        setFormData((prev) => ({
          ...prev,
          amount: String(courseData.price || 0)
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
  }, [id])

  const selectedMethod = useMemo(
    () => paymentMethods.find((m) => m.id === selectedMethodId),
    [paymentMethods, selectedMethodId]
  )

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isStudent) {
      setError(language === 'ar' ? 'الدفع متاح للطلاب فقط' : 'Payment is allowed for students only')
      return
    }

    if (!selectedMethodId) {
      setError(language === 'ar' ? 'اختر وسيلة الدفع' : 'Please select a payment method')
      return
    }

    if (!screenshotFile) {
      setError(language === 'ar' ? 'ارفع صورة إيصال الدفع' : 'Please upload payment screenshot')
      return
    }

    if (!course || !user?.id) {
      setError(language === 'ar' ? 'تعذر تحديد بيانات المستخدم أو الدورة' : 'Missing user or course info')
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
        currency: 'USD',
        transaction_reference: formData.transactionReference || null,
        payment_screenshot_url: screenshotUrl,
        additional_notes: notesParts.join('\n\n') || null
      })

      setIsSuccess(true)
      setTimeout(() => {
        navigate('/dashboard')
      }, 1800)
    } catch (err) {
      setError(err.message || (language === 'ar' ? 'فشل إرسال طلب الدفع' : 'Failed to submit payment'))
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
          <h2 className="text-2xl font-bold mb-3">{language === 'ar' ? 'الدورة غير متاحة' : 'Course is not available'}</h2>
          <Link to="/courses" className="btn btn-primary w-fit mx-auto">
            {language === 'ar' ? 'العودة للدورات' : 'Back to courses'}
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
            {language === 'ar' ? 'الدفع متاح للطلاب فقط' : 'Payment is for students only'}
          </h2>
          <p className="text-secondary-600 dark:text-secondary-400 mb-4">
            {language === 'ar'
              ? 'لا يمكن لحسابات الأدمن أو المدرس إرسال طلبات دفع للدورات.'
              : 'Admin and instructor accounts cannot submit course payment requests.'}
          </p>
          <Link to={`/courses/${id}`} className="btn btn-primary w-fit mx-auto">
            {language === 'ar' ? 'العودة للدورة' : 'Back to course'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-secondary-50 dark:bg-dark-bg">
      <div className="container-custom max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {language === 'ar' ? 'إتمام شراء الدورة' : 'Course Payment Checkout'}
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400">
            {language === 'ar'
              ? 'اختر وسيلة الدفع، نفذ التحويل، ثم ارفع صورة إثبات الدفع.'
              : 'Choose a payment method, complete transfer, then upload your payment proof.'}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card card-body">
            {isSuccess ? (
              <div className="text-center py-12">
                <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">
                  {language === 'ar' ? 'تم إرسال الدفع بنجاح' : 'Payment proof submitted successfully'}
                </h2>
                <p className="text-secondary-600 dark:text-secondary-400">
                  {language === 'ar'
                    ? 'سيتم مراجعة الطلب من الإدارة/المدرب ثم تفعيل الاشتراك.'
                    : 'Admin/Instructor will review it and approve your enrollment.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-3">
                    {language === 'ar' ? '1) اختر وسيلة الدفع' : '1) Select Payment Method'}
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
                    {language === 'ar'
                      ? 'كل وسائل الدفع المتاحة لهذه الدورة تظهر هنا. اختر الوسيلة المناسبة لك قبل إرسال إثبات الدفع.'
                      : 'All payment methods available for this course are listed here. Choose one before submitting proof.'}
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
                        {language === 'ar'
                          ? 'لا توجد وسائل دفع مفعلة لهذه الدورة حالياً.'
                          : 'No active payment methods are configured for this course right now.'}
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 text-sm mb-2">
                        {language === 'ar'
                          ? 'تواصل مع الإدارة لتفعيل واحدة من الوسائل التالية لتسهيل الدفع:'
                          : 'Please contact admin to activate one of these supported methods for easier payment:'}
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
                    {language === 'ar' ? '2) بيانات الدفع' : '2) Payment Details'}
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">{language === 'ar' ? 'المبلغ' : 'Amount'}</label>
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
                      <label className="label">{language === 'ar' ? 'رقم العملية' : 'Transaction Reference'}</label>
                      <input
                        type="text"
                        value={formData.transactionReference}
                        onChange={(e) => setFormData((prev) => ({ ...prev, transactionReference: e.target.value }))}
                        className="input"
                        placeholder={language === 'ar' ? 'مثال: TXN-12345' : 'Example: TXN-12345'}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="label">
                      {language === 'ar' ? 'بيانات المرسل (رقم التحويل أو المحفظة)' : 'Sender information (phone/wallet/account)'}
                    </label>
                    <input
                      type="text"
                      value={formData.senderInfo}
                      onChange={(e) => setFormData((prev) => ({ ...prev, senderInfo: e.target.value }))}
                      className="input"
                      placeholder={language === 'ar' ? 'اكتب رقم المرسل أو تفاصيل الحساب' : 'Enter sender phone/account details'}
                      required
                    />
                  </div>

                  <div className="mt-4">
                    <label className="label">{language === 'ar' ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                      className="input min-h-[110px]"
                      placeholder={language === 'ar' ? 'أي تفاصيل إضافية للدفع' : 'Any additional payment notes'}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-3">
                    {language === 'ar' ? '3) رفع إثبات الدفع' : '3) Upload Payment Screenshot'}
                  </h3>
                  <label className="border-2 border-dashed rounded-xl p-6 text-center block cursor-pointer hover:border-primary-400 transition-colors">
                    <FiUploadCloud className="w-8 h-8 mx-auto mb-2 text-primary-500" />
                    <p className="font-medium">
                      {screenshotFile ? screenshotFile.name : (language === 'ar' ? 'اختر صورة الإيصال' : 'Choose payment screenshot')}
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
                      ? (language === 'ar' ? 'جارٍ الإرسال...' : 'Submitting...')
                      : (language === 'ar' ? 'إرسال طلب الدفع' : 'Submit Payment')}
                  </button>
                  <Link to={`/courses/${course.id}`} className="btn btn-outline">
                    {language === 'ar' ? 'العودة للدورة' : 'Back to course'}
                  </Link>
                </div>
              </form>
            )}
          </div>

          <div className="card card-body h-fit">
            <h3 className="text-lg font-bold mb-3">{language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">{language === 'ar' ? 'الدورة:' : 'Course:'}</span> {course.title}</p>
              <p><span className="font-medium">{language === 'ar' ? 'السعر:' : 'Price:'}</span> ${course.price || 0} USD</p>
              <p><span className="font-medium">{language === 'ar' ? 'الحالة:' : 'Status:'}</span> {language === 'ar' ? 'بانتظار التحويل' : 'Awaiting payment proof'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentCheckout
