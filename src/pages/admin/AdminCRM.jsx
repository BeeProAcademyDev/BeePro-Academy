import { useEffect, useMemo, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAuth } from '../../contexts/AuthContext'
import { adminService } from '../../services/api'
import { requireAdmin } from '../../lib/authGuards'
import { useTranslation } from 'react-i18next'
import {
  FiLoader,
  FiMessageCircle,
  FiRefreshCw,
  FiSearch,
  FiUsers
} from 'react-icons/fi'

const extractSenderInfo = (notes = '') => {
  const senderLine = notes
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.toLowerCase().startsWith('sender info:'))

  return senderLine ? senderLine.replace(/^sender info:\s*/i, '').trim() : ''
}

const extractPhoneNumber = (contact) => {
  const candidates = [
    contact.phone,
    contact.phone_number,
    contact.mobile,
    contact.whatsapp,
    extractSenderInfo(contact.latest_payment_notes),
    contact.latest_payment_notes
  ].filter(Boolean)

  for (const value of candidates) {
    const match = String(value).match(/(?:\+|00)?[0-9][0-9\s().-]{7,}[0-9]/)
    if (match) return match[0]
  }

  return ''
}

const toWhatsappPhone = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''

  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('+')) {
    digits = digits.slice(1)
  }
  if (digits.startsWith('01') && digits.length === 11) {
    digits = `20${digits.slice(1)}`
  }
  if (digits.startsWith('1') && digits.length === 10) {
    digits = `20${digits}`
  }

  return digits
}

const AdminCRM = () => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const isAdminUser = requireAdmin(user)

  const fetchContacts = async () => {
    if (!isAdminUser) return

    setLoading(true)
    setError('')
    try {
      const data = await adminService.getCrmContacts()
      setContacts(data || [])
    } catch (fetchError) {
      setError(
        fetchError.message ||
          (t('adminCRM.unableToLoadCrmData'))
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [isAdminUser])

  const filteredContacts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return contacts.filter((contact) => {
      const matchesStatus = statusFilter === 'all' || contact.payment_status === statusFilter
      const text = [
        contact.full_name,
        contact.email,
        contact.payment_status,
        ...(contact.paid_course_titles || [])
      ].join(' ').toLowerCase()

      return matchesStatus && (!term || text.includes(term))
    })
  }, [contacts, searchTerm, statusFilter])

  const paidCount = contacts.filter((contact) => contact.payment_status === 'have payment').length
  const unpaidCount = contacts.filter((contact) => contact.payment_status === 'without payment').length

  const buildWhatsappUrl = (contact) => {
    const rawPhone = extractPhoneNumber(contact)
    const phone = toWhatsappPhone(rawPhone)
    if (!phone) return ''

    const message = t('adminCRM.hiContactfullnameBeeproTeamHer')

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
  }

  if (!isAdminUser) {
    return (
      <div className="text-center py-12">
        <FiUsers className="w-16 h-16 mx-auto mb-4 text-red-400" />
        <h3 className="text-xl font-bold mb-2 text-red-600">
          {t('adminCRM.accessDenied')}
        </h3>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">CRM</h2>
          <p className="text-gray-500">
            {t('adminCRM.registeredUsersWithCoursePayme')}
          </p>
        </div>
        <button onClick={fetchContacts} disabled={loading} className="btn btn-secondary">
          {loading ? <FiLoader className="w-5 h-5 animate-spin" /> : <FiRefreshCw className="w-5 h-5" />}
          {t('adminCRM.refresh')}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-gray-800 dark:text-white">{contacts.length}</div>
          <div className="text-sm text-gray-500">{t('adminCRM.totalContacts')}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-green-600">{paidCount}</div>
          <div className="text-sm text-gray-500">have payment</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-amber-600">{unpaidCount}</div>
          <div className="text-sm text-gray-500">without payment</div>
        </div>
      </div>

      <div className="card card-body">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              className="input ps-10"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('adminCRM.searchNameEmailOrCourse')}
            />
          </div>
          <select
            className="input md:max-w-xs"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">{t('adminCRM.allStatuses')}</option>
            <option value="have payment">have payment</option>
            <option value="without payment">without payment</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-start py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  {t('adminCRM.person')}
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  {t('dashboardExtra.status')}
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  {t('adminCRM.paidCourses')}
                </th>
                <th className="text-start py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  {t('adminCRM.lastPayment')}
                </th>
                <th className="text-end py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  WhatsApp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {loading && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    <FiLoader className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                    {t('common.loading')}
                  </td>
                </tr>
              )}

              {!loading && filteredContacts.map((contact) => {
                const whatsappUrl = buildWhatsappUrl(contact)

                return (
                  <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {contact.full_name || contact.email || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">{contact.email}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : ''}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        contact.payment_status === 'have payment'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {contact.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {contact.paid_course_titles?.length
                        ? contact.paid_course_titles.join(', ')
                        : (t('adminCRM.none'))}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-300">
                      {contact.latest_payment_at
                        ? new Date(contact.latest_payment_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="py-4 px-4 text-end">
                      {whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
                        >
                          <FiMessageCircle className="w-4 h-4" />
                          {t('adminCRM.message')}
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-500 text-sm rounded">
                          <FiMessageCircle className="w-4 h-4" />
                          {t('adminCRM.noPhone')}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}

              {!loading && filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">
                    {t('adminCRM.noContactsFound')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminCRM
