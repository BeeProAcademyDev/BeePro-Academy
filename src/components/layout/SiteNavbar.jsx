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
  FiMenu,
  FiX,
} from 'react-icons/fi'
import './SiteNavbar.css'

const navBarHeight = (scrolled) =>
  scrolled
    ? 'h-[84px] md:h-[90px] lg:h-[100px]'
    : 'h-[90px] md:h-[100px] lg:h-[120px]'

const logoHeight = (scrolled) =>
  scrolled
    ? 'h-9 sm:h-10 md:h-11 lg:h-[60px]'
    : 'h-10 sm:h-11 md:h-12 lg:h-[72px]'

const SiteNavbar = ({ onAuthClick, hideTeacherSignup = false }) => {
  const { t } = useTranslation()
  const { language, toggleLanguage } = useLanguage()
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

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsProfileOpen(false)
  }

  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || ''
  const roleLabel = getRoleLabel(normalizedRole, language)

  const handleAuthClick = (tab, role) => {
    setMobileMenuOpen(false)
    if (onAuthClick) {
      onAuthClick(tab, role)
      return
    }
    navigate(getLandingAuthUrl(tab, { role, redirect: `${location.pathname}${location.search}` }))
  }

  const linkClass = (active, mobile = false) => {
    const base = mobile
      ? 'flex w-full items-center rounded-xl px-4 py-3.5 text-sm font-medium transition-colors'
      : 'inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:px-4 lg:py-2.5'
    const state = active
      ? 'bg-[#009ffd]/20 text-[#00d9ff]'
      : 'text-white/85 hover:bg-[#009ffd]/20 hover:text-[#00d9ff]'
    return `${base} ${state}`
  }

  const renderNavLink = (link, index, mobile = false) => {
    const active = isNavLinkActive(link, {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    })
    const className = linkClass(active, mobile)

    if (link.type === 'hash') {
      return (
        <a
          key={index}
          href={link.href}
          className={className}
          onClick={() => setMobileMenuOpen(false)}
        >
          {link.label}
        </a>
      )
    }

    return (
      <Link
        key={index}
        to={link.href}
        className={className}
        onClick={() => setMobileMenuOpen(false)}
      >
        {link.label}
      </Link>
    )
  }

  const teachButtonClass =
    'inline-flex w-full items-center justify-center rounded-full border-2 border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#00d9ff] hover:bg-[#00d9ff]/10 hover:text-[#00d9ff] md:w-auto md:py-2 md:px-5'

  const loginButtonClass =
    'inline-flex w-full items-center justify-center rounded-full border-2 border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#00d9ff] hover:bg-[#00d9ff]/10 hover:text-[#00d9ff] md:w-auto md:py-2.5 md:px-6'

  const registerButtonClass =
    'inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-[#009ffd] to-[#2a93d5] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(0,159,253,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,159,253,0.4)] md:w-auto md:py-2.5 md:px-6'

  const renderAuthButtons = (mobile = false) => (
    <>
      {!hideTeacherSignup && (
        <button type="button" className={teachButtonClass} onClick={() => handleAuthClick('register', 'teacher')}>
          {t('nav.teach')}
        </button>
      )}
      <button type="button" className={loginButtonClass} onClick={() => handleAuthClick('login')}>
        {t('nav.login')}
      </button>
      <button type="button" className={registerButtonClass} onClick={() => handleAuthClick('register')}>
        {t('nav.register')}
      </button>
    </>
  )

  return (
    <header
      className={`site-navbar fixed top-0 inset-x-0 z-[1000] w-full max-w-[100vw] overflow-x-hidden transition-all duration-300 ${
        scrolled ? 'bg-[rgba(0,4,40,0.98)] shadow-[0_2px_20px_rgba(0,0,0,0.3)]' : 'bg-[rgba(0,4,40,0.95)] shadow-[0_2px_20px_rgba(0,0,0,0.3)]'
      } backdrop-blur-xl`}
    >
      <nav
        className={`mx-auto flex w-full max-w-full min-w-0 items-center justify-between gap-2 px-3 sm:px-4 md:gap-4 md:px-6 lg:px-10 ${navBarHeight(scrolled)}`}
      >
        {/* Logo */}
        <Link
          to="/"
          className="flex min-w-0 flex-1 items-center overflow-hidden md:flex-none md:max-w-[280px] lg:max-w-[360px]"
        >
          <img
            src="/assets/platform-logo.png"
            alt="BeePro Academy"
            className={`w-auto max-w-full object-contain object-start ${logoHeight(scrolled)}`}
          />
        </Link>

        {/* Desktop navigation */}
        <div className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex lg:gap-2">
          {navLinks.map((link, index) => renderNavLink(link, index))}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            className="hidden items-center justify-center rounded-lg p-2 text-white/85 transition-colors hover:bg-[#009ffd]/20 hover:text-[#00d9ff] lg:inline-flex"
            onClick={toggleLanguage}
            title={t('language.english')}
            aria-label={t('siteNavbar.switchToArabic')}
          >
            <FiGlobe className="h-5 w-5" />
          </button>

          {isAuthenticated && (
            <div className="hidden items-center gap-1 md:flex">
              <StudentNotificationsBell />
              {showChatBell && <StudentChatBell />}
            </div>
          )}

          {isAuthenticated ? (
            <div className="relative hidden min-w-0 md:block">
              <button
                type="button"
                className="flex max-w-[220px] items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-2 py-1.5 text-white transition-colors hover:border-[#00d9ff]/40 hover:bg-[#009ffd]/20 sm:px-3"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={displayName}
                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500">
                    <FiUser className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className="hidden max-w-[120px] truncate text-sm font-semibold lg:inline">
                  {displayName}
                </span>
                <FiChevronDown
                  className={`hidden h-4 w-4 shrink-0 transition-transform lg:block ${isProfileOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isProfileOpen && (
                <div className="absolute end-0 top-[calc(100%+8px)] z-[1100] w-56 max-w-[calc(100vw-2rem)] animate-slide-down overflow-hidden rounded-xl border border-[#00d9ff]/25 bg-[rgba(0,12,48,0.98)] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                    {displayEmail && (
                      <p className="mt-0.5 truncate text-xs text-white/60">{displayEmail}</p>
                    )}
                    <span className="mt-2 inline-flex rounded-full bg-[#009ffd]/25 px-2.5 py-0.5 text-[0.7rem] font-semibold text-[#00d9ff]">
                      {roleLabel}
                    </span>
                  </div>
                  <Link
                    to="/dashboard"
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-white/90 transition-colors hover:bg-[#009ffd]/15"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <FiGrid className="h-5 w-5" />
                    <span>{t('nav.dashboard')}</span>
                  </Link>
                  {showChatBell && (
                    <Link
                      to="/courses"
                      className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-white/90 transition-colors hover:bg-[#009ffd]/15"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <FiMessageCircle className="h-5 w-5" />
                      <span>{t('dashboardExtra.instructorChat')}</span>
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-white/90 transition-colors hover:bg-[#009ffd]/15"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <FiUser className="h-5 w-5" />
                    <span>{t('nav.profile')}</span>
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm text-[#ff8a8a] transition-colors hover:bg-red-500/15"
                    onClick={handleLogout}
                  >
                    <FiLogOut className="h-5 w-5" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex lg:gap-3">
              {renderAuthButtons()}
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="inline-flex h-10 w-20 shrink-0 items-center justify-center rounded-lg text-white transition-colors hover:bg-[#009ffd]/20 hover:text-[#00d9ff] md:hidden"
            aria-label={mobileMenuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div
          className="md:hidden max-h-[calc(100dvh-90px)] overflow-y-auto overflow-x-hidden border-t border-white/10 bg-[rgba(0,4,40,0.98)] overscroll-contain"
          role="dialog"
          aria-modal="true"
          aria-label={t('navExtra.navigationMenu')}
        >
          <div className="flex flex-col gap-1 p-4">
            {navLinks.map((link, index) => renderNavLink(link, index, true))}

            <button
              type="button"
              className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium text-white/85 transition-colors hover:bg-[#009ffd]/20 hover:text-[#00d9ff] lg:hidden"
              onClick={() => {
                toggleLanguage()
                setMobileMenuOpen(false)
              }}
            >
              <FiGlobe className="h-5 w-5" />
              {t('language.english')}
            </button>

            {isAuthenticated && (
              <>
                <div className="mt-3 border-t border-white/10 pt-3">
                  <div className="mb-3 flex items-center gap-3 px-1">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={displayName}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500">
                        <FiUser className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                      {displayEmail && (
                        <p className="truncate text-xs text-white/60">{displayEmail}</p>
                      )}
                    </div>
                  </div>
                  <Link
                    to="/dashboard"
                    className={linkClass(false, true)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FiGrid className="me-2 h-5 w-5 shrink-0" />
                    {t('nav.dashboard')}
                  </Link>
                  {showChatBell && (
                    <Link
                      to="/courses"
                      className={linkClass(false, true)}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <FiMessageCircle className="me-2 h-5 w-5 shrink-0" />
                      {t('dashboardExtra.instructorChat')}
                    </Link>
                  )}
                  <Link
                    to="/profile"
                    className={linkClass(false, true)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <FiUser className="me-2 h-5 w-5 shrink-0" />
                    {t('nav.profile')}
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center rounded-xl px-4 py-3.5 text-sm font-medium text-[#ff8a8a] transition-colors hover:bg-red-500/15"
                    onClick={handleLogout}
                  >
                    <FiLogOut className="me-2 h-5 w-5 shrink-0" />
                    {t('nav.logout')}
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 px-1">
                  <StudentNotificationsBell />
                  {showChatBell && <StudentChatBell />}
                </div>
              </>
            )}

            {!isAuthenticated && (
              <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
                {renderAuthButtons(true)}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

export default SiteNavbar
