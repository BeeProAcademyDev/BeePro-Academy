export const CURRENCIES = {
  USD: {
    code: 'USD',
    symbol: '$',
    rateFromUsd: 1,
    labelAr: 'دولار',
    labelEn: 'USD',
  },
  SAR: {
    code: 'SAR',
    symbol: 'ر.س',
    rateFromUsd: 3.75,
    labelAr: 'ريال',
    labelEn: 'SAR',
  },
  AED: {
    code: 'AED',
    symbol: 'د.إ',
    rateFromUsd: 3.67,
    labelAr: 'درهم',
    labelEn: 'AED',
  },
  EGP: {
    code: 'EGP',
    symbol: 'ج.م',
    rateFromUsd: 48,
    labelAr: 'جنيه',
    labelEn: 'EGP',
  },
}

const AMERICAS_COUNTRIES = new Set([
  'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'VE', 'EC', 'BO', 'PY', 'UY',
  'GY', 'SR', 'GF', 'PA', 'CR', 'NI', 'HN', 'SV', 'GT', 'BZ', 'CU', 'DO', 'HT',
  'JM', 'TT', 'BS', 'BB', 'PR', 'VI', 'AW', 'CW', 'SX', 'BM', 'KY', 'GL',
])

const EUROPE_COUNTRIES = new Set([
  'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI',
  'PL', 'CZ', 'SK', 'HU', 'RO', 'BG', 'GR', 'PT', 'IE', 'HR', 'SI', 'LT', 'LV',
  'EE', 'LU', 'MT', 'CY', 'IS', 'UA', 'RS', 'BA', 'MK', 'AL', 'ME', 'MD', 'BY',
  'AD', 'MC', 'SM', 'VA', 'LI', 'XK',
])

export const getCurrencyFromCountry = (countryCode, continentCode) => {
  const country = (countryCode || '').toUpperCase()

  if (country === 'SA') return 'SAR'
  if (country === 'AE') return 'AED'
  if (country === 'EG') return 'EGP'

  if (continentCode === 'EU' || EUROPE_COUNTRIES.has(country)) return 'USD'
  if (continentCode === 'NA' || continentCode === 'SA' || AMERICAS_COUNTRIES.has(country)) return 'USD'

  return 'USD'
}

export const convertFromUsd = (usdAmount, currencyCode) => {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD
  const amount = Number(usdAmount) || 0
  const converted = amount * currency.rateFromUsd

  if (currency.code === 'USD') return Math.round(converted * 100) / 100
  return Math.round(converted)
}

export const formatPrice = (usdAmount, currencyCode, language = 'ar') => {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD
  const converted = convertFromUsd(usdAmount, currency.code)
  const label = language === 'ar' ? currency.labelAr : currency.labelEn

  if (language === 'ar') {
    return {
      amount: String(converted),
      label,
      full: `${converted} ${label}`,
      code: currency.code,
      converted,
    }
  }

  if (currency.code === 'USD') {
    return {
      amount: `$${converted}`,
      label,
      full: `$${converted} ${label}`,
      code: currency.code,
      converted,
    }
  }

  return {
    amount: `${converted} ${currency.symbol}`,
    label,
    full: `${converted} ${currency.symbol} ${label}`,
    code: currency.code,
    converted,
  }
}

export const formatStoredAmount = (amount, currencyCode, language = 'ar') => {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD
  const label = language === 'ar' ? currency.labelAr : currency.labelEn
  const value = Number(amount) || 0

  if (language === 'ar') {
    return `${value} ${label}`
  }

  if (currency.code === 'USD') {
    return `$${value} ${label}`
  }

  return `${value} ${currency.symbol} ${label}`
}

export const parseUsdPrice = (price) => {
  if (typeof price === 'number') return price
  if (typeof price === 'string') {
    const parsed = parseFloat(price.replace(/[^0-9.]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const detectCountryCurrency = async () => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal,
    })

    if (!response.ok) return 'USD'

    const data = await response.json()
    return getCurrencyFromCountry(data.country_code, data.continent_code)
  } catch {
    return 'USD'
  } finally {
    clearTimeout(timeout)
  }
}
