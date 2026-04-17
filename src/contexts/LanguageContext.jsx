import { createContext, useContext, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const LanguageContext = createContext()

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation()
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'ar'
  })

  const [isRTL, setIsRTL] = useState(() => {
    const lang = localStorage.getItem('language') || 'ar'
    return lang === 'ar'
  })

  useEffect(() => {
    localStorage.setItem('language', language)
    i18n.changeLanguage(language)
    
    const rtl = language === 'ar'
    setIsRTL(rtl)
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language, i18n])

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar')
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)
  }

  const value = {
    language,
    isRTL,
    toggleLanguage,
    changeLanguage
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export default LanguageContext