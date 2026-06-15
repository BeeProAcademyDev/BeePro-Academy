import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { 
  FiFacebook, 
  FiTwitter, 
  FiInstagram, 
  FiYoutube, 
  FiLinkedin,
  FiMail,
  FiPhone,
  FiMapPin,
  FiSend
} from 'react-icons/fi'

const Footer = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()

  const quickLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/courses', label: t('nav.courses') },
    { to: '/blogs', label: language === 'ar' ? 'المدونة' : 'Blogs' },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
  ]

  const categories = [
    { to: '/courses?category=financial_markets', label: language === 'ar' ? 'الأسواق المالية' : 'Financial Markets' },
    { to: '/courses?category=data_analysis', label: language === 'ar' ? 'تحليل البيانات' : 'Data Analysis' },
    { to: '/courses?category=it', label: language === 'ar' ? 'تكنولوجيا المعلومات' : 'IT' },
  ]

  const socialLinks = [
    { icon: FiFacebook, href: '#', label: 'Facebook' },
    { icon: FiTwitter, href: '#', label: 'Twitter' },
    { icon: FiInstagram, href: '#', label: 'Instagram' },
    { icon: FiYoutube, href: '#', label: 'YouTube' },
    { icon: FiLinkedin, href: '#', label: 'LinkedIn' },
  ]

  return (
    <footer className="bg-secondary-900 dark:bg-dark-card text-white">
      {/* Main Footer */}
      <div className="container-custom py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* About Section */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img
                src="/assets/platform-logo.jpg"
                alt="BeePro Academy"
                className="w-10 h-10 rounded-xl object-cover"
              />
              <span className="text-xl font-bold text-white">
                BeePro Academy
              </span>
            </Link>
            <p className="text-secondary-400 text-sm leading-relaxed mb-6">
              {t('footer.aboutText')}
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-secondary-800 hover:bg-primary-500 rounded-lg flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-secondary-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-lg font-bold mb-4">{t('footer.categories')}</h3>
            <ul className="space-y-3">
              {categories.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-secondary-400 hover:text-primary-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h3 className="text-lg font-bold mb-4">{t('footer.contact')}</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3 text-secondary-400">
                <FiMail className="w-5 h-5 text-primary-400 shrink-0" />
                <span>info@beepro-academy.com</span>
              </li>
              <li className="flex items-center gap-3 text-secondary-400">
                <FiPhone className="w-5 h-5 text-primary-400 shrink-0" />
                <span dir="ltr">+966 50 123 4567</span>
              </li>
              <li className="flex items-start gap-3 text-secondary-400">
                <FiMapPin className="w-5 h-5 text-primary-400 shrink-0 mt-0.5" />
                <span>{language === 'ar' ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'}</span>
              </li>
            </ul>

            {/* Newsletter */}
            <h4 className="text-sm font-semibold mb-3">{t('footer.newsletter')}</h4>
            <p className="text-secondary-400 text-sm mb-3">
              {t('footer.newsletterText')}
            </p>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder={t('auth.login.email')}
                className="flex-1 px-4 py-2 bg-secondary-800 border border-secondary-700 rounded-lg text-white placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
              >
                <FiSend className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-secondary-800">
        <div className="container-custom py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-secondary-500 text-sm">
              © {new Date().getFullYear()} BeePro Academy. {t('footer.copyright')}
            </p>
            <div className="flex items-center gap-6">
              <Link
                to="/privacy"
                className="text-secondary-500 hover:text-primary-400 text-sm transition-colors"
              >
                {t('footer.privacy')}
              </Link>
              <Link
                to="/terms"
                className="text-secondary-500 hover:text-primary-400 text-sm transition-colors"
              >
                {t('footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
