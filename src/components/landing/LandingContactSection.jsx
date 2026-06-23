import { useState } from 'react'
import { trackEvent } from '../../lib/analytics'
import {
  FiFacebook,
  FiInstagram,
  FiLinkedin,
  FiMail,
  FiMapPin,
  FiMessageCircle,
  FiTwitter,
} from 'react-icons/fi'
import { SiTiktok } from 'react-icons/si'
import '../../pages/LandingPage.css'

const LandingContactSection = () => {
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

    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitMessage(`Thank you ${formData.name}! Message sent successfully.`)
      trackEvent('contact_submit', { form_name: 'landing_contact', subject: formData.subject })
      setFormData({ name: '', phone: '', email: '', subject: '', message: '' })
      setTimeout(() => setSubmitMessage(''), 3000)
    }, 1500)
  }

  return (
    <section className="contact-section" id="contact">
      <div className="contact-container">
        <div className="contact-header">
          <h2>Get in Touch</h2>
          <p>Have questions about our courses, pricing, or anything else? We&apos;re here to help!</p>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contact-name">Full Name *</label>
              <input
                type="text"
                id="contact-name"
                name="name"
                className="form-control"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="contact-phone">Phone Number</label>
              <input
                type="tel"
                id="contact-phone"
                name="phone"
                className="form-control"
                placeholder="+1 234 567 8900"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="contact-email">Email Address *</label>
            <input
              type="email"
              id="contact-email"
              name="email"
              className="form-control"
              placeholder="john@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="contact-subject">What would you like to know? *</label>
            <select
              id="contact-subject"
              name="subject"
              className="form-control"
              value={formData.subject}
              onChange={handleChange}
              required
            >
              <option value="">Select a topic</option>
              <option value="course-types">Course Types & Content</option>
              <option value="pricing">Pricing & Payment Options</option>
              <option value="schedule">Schedule & Duration</option>
              <option value="certification">Certification Details</option>
              <option value="prerequisites">Prerequisites & Requirements</option>
              <option value="other">Other Questions</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="contact-message">Your Message *</label>
            <textarea
              id="contact-message"
              name="message"
              className="form-control"
              placeholder="Please tell us more about your inquiry..."
              value={formData.message}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="submit-contact-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>

        {submitMessage && (
          <div className="success-message">{submitMessage}</div>
        )}

        <div className="contact-info">
          <h3>Or reach us directly</h3>
          <div className="contact-methods">
            <div className="contact-method">
              <span className="contact-method-icon"><FiMail /></span>
              <span>info@beepro-academy.com</span>
            </div>
            <div className="contact-method">
              <span className="contact-method-icon"><FiMessageCircle /></span>
              <span>Live Chat Available</span>
            </div>
            <div className="contact-method">
              <span className="contact-method-icon"><FiMapPin /></span>
              <span>United Arab Emirates</span>
            </div>
          </div>

          <div className="social-media-section">
            <h3>Follow us on social media</h3>
            <div className="social-media-links">
              <a href="https://www.facebook.com/share/1BtuCiJgMo/" target="_blank" rel="noopener noreferrer" className="social-link" title="Facebook" aria-label="Facebook"><span><FiFacebook /></span></a>
              <a href="https://www.instagram.com/beepro99?igsh=MTN4aXFoZnZ6bHdsMQ==" target="_blank" rel="noopener noreferrer" className="social-link" title="Instagram" aria-label="Instagram"><span><FiInstagram /></span></a>
              <a href="https://www.tiktok.com/@bee.pro46?_r=1&_t=ZS-97PNKSmUp52" target="_blank" rel="noopener noreferrer" className="social-link" title="TikTok" aria-label="TikTok"><span><SiTiktok /></span></a>
              <a href="https://www.linkedin.com/company/bee-professiona/" target="_blank" rel="noopener noreferrer" className="social-link" title="LinkedIn" aria-label="LinkedIn"><span><FiLinkedin /></span></a>
              <a href="https://x.com/BEEPROpp" target="_blank" rel="noopener noreferrer" className="social-link" title="X" aria-label="X"><span><FiTwitter /></span></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default LandingContactSection
