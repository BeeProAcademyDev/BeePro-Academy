import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { getLandingAuthUrl } from '../../lib/authRoutes'
import { useTranslation } from 'react-i18next'
import { useTheme } from '../../contexts/ThemeContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { 
  FiMenu, 
  FiX, 
  FiSun, 
  FiMoon, 
  FiGlobe, 
  FiUser, 
  FiLogOut,
  FiGrid,
  FiChevronDown,
  FiMessageCircle
} from 'react-icons/fi'
import StudentNotificationsBell from '../notifications/StudentNotificationsBell'
import StudentChatBell from '../chat/StudentChatBell'
import { resolveUserRole, shouldShowStudentChatBell } from '../../lib/roles'

const Navbar = () => {
  const { t } = useTranslation()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const { language, toggleLanguage, isRTL } = useLanguage()
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const navigate = useNavigate()
  const showChatBell = shouldShowStudentChatBell(user)
  
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7427/ingest/558f5932-6500-4722-9bbf-9e5e1306baf3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'45e2a3'},body:JSON.stringify({sessionId:'45e2a3',location:'Navbar.jsx:auth',message:'navbar auth state',data:{isLoading,isAuthenticated,hasUserId:!!user?.id,role:user?.role,resolvedRole:resolveUserRole(user),showChatBell,viewportW:typeof window!=='undefined'?window.innerWidth:null},hypothesisId:'G',timestamp:Date.now(),runId:'pre-fix'})}).catch(()=>{});
    // #endregion
  }, [isLoading, isAuthenticated, user?.id, user?.role, showChatBell])
  
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsProfileOpen(false)
  }

  const displayName = user?.full_name || user?.name || user?.email?.split('@')[0] || 'User'
  const displayEmail = user?.email || ''
  const normalizedRole = resolveUserRole(user)
  const roleLabel = {
    student: language === 'ar' ? 'طالب' : 'Student',
    teacher: language === 'ar' ? 'مدرس' : 'Teacher',
    admin: language === 'ar' ? 'مدير' : 'Admin'
  }[normalizedRole] || normalizedRole

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/courses', label: t('nav.courses') },
    { to: '/categories', label: t('nav.categories') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
  ]

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white backdrop-blur-md shadow-lg border-b border-white/90' 
          : 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-white/70'
      }`}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0" aria-label="BeePro Academy">
            <img
              src="/assets/platform-logo.png"
              alt="BeePro Academy"
              className="h-12 sm:h-14 md:h-[4.25rem] w-auto max-w-[220px] sm:max-w-[260px] md:max-w-[320px] object-contain object-left"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="nav-links hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="btn-ghost p-2 rounded-lg hidden sm:inline-flex"
              title={language === 'ar' ? 'English' : 'العربية'}
            >
              <FiGlobe className="w-5 h-5" />
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="btn-ghost p-2 rounded-lg hidden sm:inline-flex"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? (
                <FiSun className="w-5 h-5" />
              ) : (
                <FiMoon className="w-5 h-5" />
              )}
            </button>

            {/* Auth Buttons or Profile */}
            {isAuthenticated ? (
              <>
                <div className="hidden md:flex items-center gap-1 shrink-0">
                  <StudentNotificationsBell />
                  {showChatBell && <StudentChatBell />}
                </div>
              <div className="relative shrink-0 min-w-0">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 btn-ghost px-3 py-2 rounded-lg"
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
                  <div className="hidden md:flex flex-col items-start leading-tight">
                    <span className="text-sm font-medium max-w-[180px] truncate">{displayName}</span>
                    {displayEmail && (
                      <span className="text-xs text-secondary-500 max-w-[180px] truncate">{displayEmail}</span>
                    )}
                  </div>
                  <FiChevronDown className={`w-4 h-4 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute top-full mt-2 w-48 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-secondary-100 dark:border-dark-border overflow-hidden animate-slide-down"
                    style={{ [isRTL ? 'left' : 'right']: 0 }}
                  >
                    <div className="px-4 py-3 border-b border-secondary-100 dark:border-dark-border">
                      <p className="text-sm font-semibold truncate">{displayName}</p>
                      {displayEmail && <p className="text-xs text-secondary-500 truncate mt-0.5">{displayEmail}</p>}
                      <span className="inline-flex mt-2 px-2 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                        {roleLabel}
                      </span>
                    </div>
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 dark:hover:bg-dark-border transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <FiGrid className="w-5 h-5" />
                      <span>{t('nav.dashboard')}</span>
                    </Link>
                    {showChatBell && (
                      <Link
                        to="/courses"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 dark:hover:bg-dark-border transition-colors"
                        onClick={() => setIsProfileOpen(false)}
                      >
                        <FiMessageCircle className="w-5 h-5" />
                        <span>{language === 'ar' ? 'دردشة المدرس' : 'Instructor chat'}</span>
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary-50 dark:hover:bg-dark-border transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <FiUser className="w-5 h-5" />
                      <span>{t('nav.profile')}</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                    >
                      <FiLogOut className="w-5 h-5" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <Link to={getLandingAuthUrl('login')} className="btn-ghost px-4 py-2 rounded-lg">
                  {t('nav.login')}
                </Link>
                <Link to="/register?role=teacher" className="btn-ghost px-4 py-2 rounded-lg">
                  {language === 'ar' ? 'سجّل كمدرس' : 'Teach'}
                </Link>
                <Link to="/register" className="btn btn-primary">
                  {t('nav.register')}
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden btn-ghost p-2 rounded-lg"
            >
              {isMenuOpen ? (
                <FiX className="w-6 h-6" />
              ) : (
                <FiMenu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white dark:bg-dark-card border-t border-secondary-100 dark:border-dark-border shadow-lg animate-slide-down">
            <div className="container-custom py-4">
              {isAuthenticated && (
                <div className="md:hidden flex items-center gap-4 px-4 py-3 mb-3 border-b border-secondary-100 dark:border-dark-border">
                  <StudentNotificationsBell />
                  {showChatBell && <StudentChatBell />}
                  <span className="text-sm text-secondary-500">
                    {language === 'ar' ? 'الإشعارات والدردشة' : 'Alerts & chat'}
                  </span>
                </div>
              )}

              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `block py-3 px-4 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' 
                        : 'hover:bg-secondary-50 dark:hover:bg-dark-border'
                    }`
                  }
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
              
              {isAuthenticated && showChatBell && (
                <div className="mt-4 pt-4 border-t border-secondary-100 dark:border-dark-border md:hidden">
                  <Link
                    to="/courses"
                    className="flex items-center gap-3 py-3 px-4 rounded-lg hover:bg-secondary-50 dark:hover:bg-dark-border"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <FiMessageCircle className="w-5 h-5 text-primary-500" />
                    <span>{language === 'ar' ? 'دردشة المدرس' : 'Instructor chat'}</span>
                  </Link>
                </div>
              )}

              {!isAuthenticated && (
                <div className="mt-4 pt-4 border-t border-secondary-100 dark:border-dark-border flex flex-col gap-3">
                  <Link 
                    to={getLandingAuthUrl('login')} 
                    className="btn btn-secondary w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.login')}
                  </Link>
                  <Link 
                    to="/register" 
                    className="btn btn-primary w-full"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
