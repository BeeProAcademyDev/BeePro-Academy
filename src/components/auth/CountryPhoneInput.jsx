import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const COUNTRIES = [
  { iso: 'EG', flag: '🇪🇬', dialCode: '+20', nameKey: 'countryPhone.countries.eg' },
  { iso: 'SA', flag: '🇸🇦', dialCode: '+966', nameKey: 'countryPhone.countries.sa' },
  { iso: 'AE', flag: '🇦🇪', dialCode: '+971', nameKey: 'countryPhone.countries.ae' },
  { iso: 'KW', flag: '🇰🇼', dialCode: '+965', nameKey: 'countryPhone.countries.kw' },
  { iso: 'QA', flag: '🇶🇦', dialCode: '+974', nameKey: 'countryPhone.countries.qa' },
  { iso: 'BH', flag: '🇧🇭', dialCode: '+973', nameKey: 'countryPhone.countries.bh' },
  { iso: 'OM', flag: '🇴🇲', dialCode: '+968', nameKey: 'countryPhone.countries.om' },
  { iso: 'JO', flag: '🇯🇴', dialCode: '+962', nameKey: 'countryPhone.countries.jo' },
  { iso: 'LB', flag: '🇱🇧', dialCode: '+961', nameKey: 'countryPhone.countries.lb' },
  { iso: 'US', flag: '🇺🇸', dialCode: '+1', nameKey: 'countryPhone.countries.us' }
]

const findCountry = (iso) => COUNTRIES.find((country) => country.iso === iso) || COUNTRIES[0]

const CountryPhoneInput = ({
  country = 'EG',
  number = '',
  onChange,
  required = false,
  error = ''
}) => {
  const { t } = useTranslation()
  const selectedCountry = useMemo(() => findCountry(country), [country])

  const updateCountry = (nextIso) => {
    const nextCountry = findCountry(nextIso)
    onChange?.({
      country: nextCountry.iso,
      dialCode: nextCountry.dialCode,
      number,
      value: `${nextCountry.dialCode}${number}`.replace(/\s+/g, '')
    })
  }

  const updateNumber = (nextNumber) => {
    const sanitized = nextNumber.replace(/[^\d\s-]/g, '')
    onChange?.({
      country: selectedCountry.iso,
      dialCode: selectedCountry.dialCode,
      number: sanitized,
      value: `${selectedCountry.dialCode}${sanitized}`.replace(/\s+/g, '')
    })
  }

  return (
    <div className="space-y-2">
      <label htmlFor="phone-number" className="label">
        {t('countryPhone.label')}
      </label>
      <div className="grid grid-cols-[minmax(118px,150px)_minmax(0,1fr)] gap-2">
        <label className="sr-only" htmlFor="phone-country">
          {t('countryPhone.country')}
        </label>
        <select
          id="phone-country"
          value={selectedCountry.iso}
          onChange={(event) => updateCountry(event.target.value)}
          className="input px-3"
          aria-label={t('countryPhone.country')}
        >
          {COUNTRIES.map((item) => (
            <option key={item.iso} value={item.iso}>
              {item.flag} {item.dialCode} {t(item.nameKey)}
            </option>
          ))}
        </select>
        <div className="relative">
          <span className="absolute top-1/2 -translate-y-1/2 start-4 text-sm font-semibold text-secondary-500">
            {selectedCountry.dialCode}
          </span>
          <input
            id="phone-number"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={number}
            onChange={(event) => updateNumber(event.target.value)}
            className={`input ps-16 ${error ? 'input-error' : ''}`}
            placeholder={t('countryPhone.placeholder')}
            required={required}
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

export default CountryPhoneInput
