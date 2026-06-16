import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { getLandingAuthUrl } from '../../lib/authRoutes'
import { getNavbarContext, getNavbarLinks, isNavLinkActive } from '../../lib/navbarConfig'
import {
  canAccessTeacherFeatures,
  getRoleLabel,
  isAdmin,
  resolveUserRole,
  shouldShowStudentChatBell,
} from '../../lib/roles'
import StudentNotificationsBell from '../notifications/StudentNotificationsBell'
import StudentChatBell from '../chat/StudentChatBell'
import {
  FiUser,
  FiLogOut,
  FiGrid,
  FiChevronDown,
  FiMessageCircle,
  FiGlobe,
} from 'react-icons/fi'
import './SiteNavbar.css'

const SiteNavbar = ({ onAuthClick, hideTeacherSignup = false }) => {
  const { t } = useTranslation()
  const { language, toggleLanguage, isRTL } = useLanguage()
  const { user, isAuthenticated, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const normalizedRole = resolveUserRole(user)
  const showChatBell = shouldShowStudentChatBell(user)
  const isTeacher = canAccessTeacherFeatures(normalizedRole)
  const isAdminUser = isAdmin(normalizedRole)

  const context = getNavbarContext(location.pathname, location.search)
  const navLinks = getNavbarLinks(context, {
    language,
    isAdmin: isAdminUser,
    isTeacher,
    t,
  })

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setIsProfileOpen(false)
  }, [location.pathname, location.search])

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsProfileOpen(false)
  }

  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || ''
  const roleLabel = getRoleLabel(normalizedRole, language)

  const handleAuthClick = (tab, role) => {
    if (onAuthClick) {
      onAuthClick(tab, role)
      return
    }
    navigate(getLandingAuthUrl(tab, { role, redirect: `${location.pathname}${location.search}` }))
  }

  const renderNavLink = (link, index) => {
    const active = isNavLinkActive(link, {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    })
    const className = `nav-link${active ? ' nav-link-active' : ''}`

    if (link.type === 'hash') {
      return (
        <a key={index} href={link.href} className={className} onClick={() => setMobileMenuOpen(false)}>
          {link.label}
        </a>
      )
    }

    return (
      <Link key={index} to={link.href} className={className} onClick={() => setMobileMenuOpen(false)}>
        {link.label}
      </Link>
    )
  }

  return (
    <nav className={`site-navbar top-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-logo">
        <Link to="/" className="nav-logo-link">
          <img src="/assets/platform-logo.png" alt="BeePro Academy" className="nav-logo-img" />
        </Link>
      </div>

      <button
        type="button"
        className="nav-mobile-toggle"
        aria-label="Toggle menu"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {navLinks.map(renderNavLink)}

        {mobileMenuOpen && isAuthenticated && (
          <div className="nav-mobile-extras">
            <StudentNotificationsBell />
            {showChatBell && <StudentChatBell />}
          </div>
        )}

        {mobileMenuOpen && !isAuthenticated && (
          <div className="nav-mobile-auth">
            {!hideTeacherSignup && (
              <button type="button" className="nav-teach-btn" onClick={() => handleAuthClick('register', 'teacher')}>
                {language === 'ar' ? 'سجّل كمدرس' : 'Teach'}
              </button>
            )}
            <button type="button" className="nav-login-btn" onClick={() => handleAuthClick('login')}>
              {t('nav.login')}
            </button>
            <button type="button" className="nav-register-btn" onClick={() => handleAuthClick('register')}>
              {t('nav.register')}
            </button>
          </div>
        )}
      </div>

      <div className="nav-actions">
        <button
          type="button"
          className="nav-icon-btn hidden lg:inline-flex"
          onClick={toggleLanguage}
          title={language === 'ar' ? 'English' : 'العربية'}
        >
          <FiGlobe className="w-5 h-5" />
        </button>

        {isAuthenticated ? (
          <>
            <div className="nav-bells hidden md:flex">
              <StudentNotificationsBell />
              {showChatBell && <StudentChatBell />}
            </div>

            <div className="relative">
              <button
                type="button"
                className="nav-profile-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                    <FiUser className="w-4 h-4 text-white" />
                  </div>
                )}
                <span className="nav-profile-name hidden md:inline">{displayName}</span>
                <FiChevronDown className={`w-4 h-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {isProfileOpen && (
                <div
                  className="nav-profile-dropdown animate-slide-down"
                  style={{ [isRTL ? 'left' : 'right']: 0 }}
                >
                  <div className="nav-profile-dropdown-header">
                    <p className="font-semibold truncate">{displayName}</p>
                    {displayEmail && <p className="nav-profile-email truncate">{displayEmail}</p>}
                    <span className="nav-profile-role">{roleLabel}</span>
                  </div>
                  <Link to="/dashboard" onClick={() => setIsProfileOpen(false)}>
                    <FiGrid className="w-5 h-5" />
                    <span>{t('nav.dashboard')}</span>
                  </Link>
                  {showChatBell && (
                    <Link to="/courses" onClick={() => setIsProfileOpen(false)}>
                      <FiMessageCircle className="w-5 h-5" />
                      <span>{language === 'ar' ? 'دردشة المدرس' : 'Instructor chat'}</span>
                    </Link>
                  )}
                  <Link to="/profile" onClick={() => setIsProfileOpen(false)}>
                    <FiUser className="w-5 h-5" />
                    <span>{t('nav.profile')}</span>
                  </Link>
                  <button type="button" className="nav-logout-btn" onClick={handleLogout}>
                    <FiLogOut className="w-5 h-5" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="nav-auth hidden md:flex">
            {!hideTeacherSignup && (
              <button type="button" className="nav-teach-btn" onClick={() => handleAuthClick('register', 'teacher')}>
                {language === 'ar' ? 'سجّل كمدرس' : 'Teach'}
              </button>
            )}
            <button type="button" className="nav-login-btn" onClick={() => handleAuthClick('login')}>
              {t('nav.login')}
            </button>
            <button type="button" className="nav-register-btn" onClick={() => handleAuthClick('register')}>
              {t('nav.register')}
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default SiteNavbar
