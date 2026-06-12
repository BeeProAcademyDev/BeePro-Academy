import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../contexts/LanguageContext'
import { FiMail, FiMessageSquare, FiPhone, FiMapPin, FiSend, FiCheck } from 'react-icons/fi'

const Contact = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitMessage(language === 'ar' 
        ? `شكراً ${formData.name}! تم إرسال رسالتك بنجاح.`
        : `Thank you ${formData.name}! Message sent successfully.`
      )
      setFormData({ name: '', phone: '', email: '', subject: '', message: '' })
      
      setTimeout(() => setSubmitMessage(''), 5000)
    }, 1500)
  }

  const contactMethods = [
    {
      icon: FiMail,
      title: language === 'ar' ? 'البريد الإلكتروني' : 'Email',
      value: 'info@beepro-academy.com',
      description: language === 'ar' ? 'راسلنا في أي وقت' : 'Email us anytime'
    },
    {
      icon: FiMessageSquare,
      title: language === 'ar' ? 'الدردشة المباشرة' : 'Live Chat',
      value: language === 'ar' ? 'متاح الآن' : 'Available Now',
      description: language === 'ar' ? 'دعم فوري 24/7' : 'Instant support 24/7'
    },
    {
      icon: FiPhone,
      title: language === 'ar' ? 'الهاتف' : 'Phone',
      value: '+966 538 751 281',
      description: language === 'ar' ? 'اتصل بنا مباشرة' : 'Call us directly'
    },
    {
      icon: FiMapPin,
      title: language === 'ar' ? 'الموقع' : 'Location',
      value: language === 'ar' ? 'المملكة العربية السعودية' : 'Saudi Arabia',
      description: language === 'ar' ? 'مقرنا الرئيسي' : 'Our headquarters'
    }
  ]

  const subjectOptions = [
    { value: '', label: language === 'ar' ? 'اختر موضوعاً' : 'Select a topic' },
    { value: 'course-types', label: language === 'ar' ? 'أنواع الدورات والمحتوى' : 'Course Types & Content' },
    { value: 'pricing', label: language === 'ar' ? 'الأسعار وخيارات الدفع' : 'Pricing & Payment Options' },
    { value: 'schedule', label: language === 'ar' ? 'الجدول والمدة' : 'Schedule & Duration' },
    { value: 'certification', label: language === 'ar' ? 'تفاصيل الشهادات' : 'Certification Details' },
    { value: 'prerequisites', label: language === 'ar' ? 'المتطلبات المسبقة' : 'Prerequisites & Requirements' },
    { value: 'other', label: language === 'ar' ? 'أسئلة أخرى' : 'Other Questions' }
  ]

  return (
    <div className="bepro-page pt-20">
      {/* Header Section */}
      <section className="py-16">
        <div className="bepro-container">
          <div className="bepro-page-header">
            <h1>{language === 'ar' ? 'تواصل معنا' : 'Get in Touch'}</h1>
            <p>
              {language === 'ar'
                ? 'لديك أسئلة حول دوراتنا أو الأسعار أو أي شيء آخر؟ نحن هنا للمساعدة!'
                : 'Have questions about our courses, pricing, or anything else? We\'re here to help!'
              }
            </p>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-8">
        <div className="bepro-container">
          <div className="bepro-grid-4">
            {contactMethods.map((method, index) => (
              <div key={index} className="bepro-card text-center animate-fadeInUp" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#009FFD] to-[#2A93D5] flex items-center justify-center">
                  <method.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{method.title}</h3>
                <p className="text-[#00D9FF] font-medium mb-1">{method.value}</p>
                <p className="text-white/60 text-sm">{method.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16">
        <div className="bepro-container">
          <div className="max-w-3xl mx-auto">
            <div className="bepro-card-white animate-fadeInUp">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                {language === 'ar' ? 'أرسل لنا رسالة' : 'Send us a Message'}
              </h2>
              
              {submitMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
                  <FiCheck className="w-5 h-5" />
                  {submitMessage}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="bepro-label">
                      {language === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="bepro-input"
                      placeholder={language === 'ar' ? 'أدخل اسمك' : 'Enter your name'}
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="bepro-label">
                      {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      className="bepro-input"
                      placeholder="+966 5XX XXX XXXX"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="bepro-label">
                    {language === 'ar' ? 'البريد الإلكتروني *' : 'Email Address *'}
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="bepro-input"
                    placeholder={language === 'ar' ? 'your@email.com' : 'your@email.com'}
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="bepro-label">
                    {language === 'ar' ? 'ما الذي تود معرفته؟ *' : 'What would you like to know? *'}
                  </label>
                  <select
                    name="subject"
                    className="bepro-input"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                  >
                    {subjectOptions.map((option, index) => (
                      <option key={index} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="bepro-label">
                    {language === 'ar' ? 'رسالتك *' : 'Your Message *'}
                  </label>
                  <textarea
                    name="message"
                    className="bepro-input min-h-[150px] resize-y"
                    placeholder={language === 'ar' ? 'اكتب رسالتك هنا...' : 'Write your message here...'}
                    value={formData.message}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bepro-btn-primary justify-center py-4 text-lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {language === 'ar' ? 'جاري الإرسال...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <FiSend className="w-5 h-5" />
                      {language === 'ar' ? 'إرسال الرسالة' : 'Send Message'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="py-16">
        <div className="bepro-container text-center">
          <h2 className="bepro-section-title">
            {language === 'ar' ? 'تابعنا على وسائل التواصل' : 'Follow Us on Social Media'}
          </h2>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <a
              href="https://facebook.com/beeproacademy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl hover:bg-[#1877F2] hover:border-transparent hover:-translate-y-2 transition-all duration-300"
              title="Facebook"
            >
              📘
            </a>
            <a
              href="https://youtube.com/@beeproacademy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl hover:bg-[#FF0000] hover:border-transparent hover:-translate-y-2 transition-all duration-300"
              title="YouTube"
            >
              📺
            </a>
            <a
              href="https://instagram.com/beeproacademy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#F77737] hover:border-transparent hover:-translate-y-2 transition-all duration-300"
              title="Instagram"
            >
              📷
            </a>
            <a
              href="https://snapchat.com/add/beeproacademy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl hover:bg-[#FFFC00] hover:border-transparent hover:-translate-y-2 transition-all duration-300"
              title="Snapchat"
            >
              👻
            </a>
            <a
              href="https://twitter.com/beeproacademy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl hover:bg-[#1DA1F2] hover:border-transparent hover:-translate-y-2 transition-all duration-300"
              title="Twitter / X"
            >
              🐦
            </a>
            <a
              href="https://linkedin.com/company/beeproacademy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl hover:bg-[#0A66C2] hover:border-transparent hover:-translate-y-2 transition-all duration-300"
              title="LinkedIn"
            >
              💼
            </a>
            <a
              href="https://tiktok.com/@beeproacademy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl hover:bg-[#000000] hover:border-transparent hover:-translate-y-2 transition-all duration-300"
              title="TikTok"
            >
              🎵
            </a>
            <a
              href="https://wa.me/966538751281"
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-2xl hover:bg-[#25D366] hover:border-transparent hover:-translate-y-2 transition-all duration-300"
              title="WhatsApp"
            >
              💬
            </a>
          </div>
          <p className="text-white/60 mt-6">
            {language === 'ar' ? 'تابعنا للحصول على آخر الأخبار والتحديثات' : 'Follow us for the latest news and updates'}
          </p>
        </div>
      </section>
    </div>
  )
}

export default Contact