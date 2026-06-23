import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useLanguage } from './LanguageContext'
import {
  CURRENCIES,
  convertFromUsd,
  detectCountryCurrency,
  formatPrice,
} from '../lib/currency'

const CurrencyContext = createContext()

export const useCurrency = () => {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}

export const CurrencyProvider = ({ children }) => {
  const { language } = useLanguage()
  const [currencyCode, setCurrencyCode] = useState(() => {
    return localStorage.getItem('currency') || 'USD'
  })
  const [isDetecting, setIsDetecting] = useState(() => !localStorage.getItem('currency'))

  useEffect(() => {
    if (localStorage.getItem('currency')) return

    let cancelled = false

    const detect = async () => {
      const detected = await detectCountryCurrency()
      if (cancelled) return

      setCurrencyCode(detected)
      localStorage.setItem('currency', detected)
      setIsDetecting(false)
    }

    detect()

    return () => {
      cancelled = true
    }
  }, [])

  const formatCoursePrice = useCallback(
    (usdAmount) => formatPrice(usdAmount, currencyCode, language),
    [currencyCode, language]
  )

  const convertPriceFromUsd = useCallback(
    (usdAmount) => convertFromUsd(usdAmount, currencyCode),
    [currencyCode]
  )

  const changeCurrency = useCallback((code) => {
    setCurrencyCode(code)
    localStorage.setItem('currency', code)
  }, [])

  const value = useMemo(() => ({
    currencyCode,
    currency: CURRENCIES[currencyCode] || CURRENCIES.USD,
    isDetecting,
    formatCoursePrice,
    convertFromUsd: convertPriceFromUsd,
    setCurrencyCode: changeCurrency,
  }), [currencyCode, isDetecting, formatCoursePrice, convertPriceFromUsd, changeCurrency])

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  )
}

export default CurrencyContext
