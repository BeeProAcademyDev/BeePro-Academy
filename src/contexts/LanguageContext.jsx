import { createContext, useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LanguageContext = createContext()

const getStoredLanguage = () => {
  if (typeof window === 'undefined') return 'ar'
  return localStorage.getItem('language') || 'ar'
}

const applyDocumentLanguage = (language) => {
  if (typeof document === 'undefined') return
  const rtl = language === 'ar'
  document.documentElement.dir = rtl ? 'rtl' : 'ltr'
  document.documentElement.lang = language
}

// Apply before React mounts to avoid layout flash
applyDocumentLanguage(getStoredLanguage())

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState(getStoredLanguage)
  const [isRTL, setIsRTL] = useState(() => getStoredLanguage() === 'ar')

  useEffect(() => {
    localStorage.setItem('language', language)
    i18n.changeLanguage(language)

    const rtl = language === 'ar'
    setIsRTL(rtl)
    applyDocumentLanguage(language)
  }, [language, i18n])

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'))
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)
  }

  const value = {
    language,
    isRTL,
    toggleLanguage,
    changeLanguage,
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export default LanguageContext
