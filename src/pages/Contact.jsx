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
      setSubmitMessage(t('contact.thankYouFormdatanameMessageSen')
      )
      setFormData({ name: '', phone: '', email: '', subject: '', message: '' })
      
      setTimeout(() => setSubmitMessage(''), 5000)
    }, 1500)
  }

  const contactMethods = [
    {
      icon: FiMail,
      title: t('contact.email_12'),
      value: 'info@beepro-academy.com',
      description: t('contact.emailUsAnytime')
    },
    {
      icon: FiMessageSquare,
      title: t('contact.liveChat'),
      value: t('contact.availableNow'),
      description: t('contact.instantSupport247')
    },
    {
      icon: FiPhone,
      title: t('contact.phone'),
      value: '+966 538 751 281',
      description: t('contact.callUsDirectly')
    },
    {
      icon: FiMapPin,
      title: t('contact.location'),
      value: t('location.uae'),
      description: t('contact.ourHeadquarters')
    }
  ]

  const subjectOptions = [
    { value: '', label: t('contact.selectATopic') },
    { value: 'course-types', label: t('contact.courseTypesContent') },
    { value: 'pricing', label: t('contact.pricingPaymentOptions') },
    { value: 'schedule', label: t('contact.scheduleDuration') },
    { value: 'certification', label: t('contact.certificationDetails') },
    { value: 'prerequisites', label: t('contact.prerequisitesRequirements') },
    { value: 'other', label: t('contact.otherQuestions') }
  ]

  return (
    <div className="bepro-page pt-20">
      {/* Header Section */}
      <section className="py-16">
        <div className="bepro-container">
          <div className="bepro-page-header">
            <h1>{t('contact.getInTouch_11')}</h1>
            <p>
              {t('contact.haveQuestionsAboutOurCoursesPr')}
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
            <div className="bepro-card-white animate-fadeInUp p-5 sm:p-8 md:p-10">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center break-words">
                {t('contact.sendUsAMessage')}
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
                      {t('contact.fullName')}
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="bepro-input"
                      placeholder={t('contact.enterYourName')}
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="bepro-label">
                      {t('contact.phoneNumber')}
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
                    {t('contact.emailAddress')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    className="bepro-input"
                    placeholder={t('contact.youremailcom')}
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="bepro-label">
                    {t('contact.whatWouldYouLikeToKnow')}
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
                    {t('contact.yourMessage')}
                  </label>
                  <textarea
                    name="message"
                    className="bepro-input min-h-[150px] resize-y"
                    placeholder={t('contact.writeYourMessageHere')}
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
                      {t('contact.sending_10')}
                    </>
                  ) : (
                    <>
                      <FiSend className="w-5 h-5" />
                      {t('contact.sendMessage_9')}
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
            {t('contact.followUsOnSocialMedia')}
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
            {t('contact.followUsForTheLatestNewsAndUpd')}
          </p>
        </div>
      </section>
    </div>
  )
}

export default Contact