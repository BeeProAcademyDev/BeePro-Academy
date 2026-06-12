import React, { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Star, DollarSign, CreditCard } from 'lucide-react'
import { 
  getInstructorPaymentMethods, 
  createPaymentMethod, 
  updatePaymentMethod, 
  deletePaymentMethod, 
  setPrimaryPaymentMethod,
  validatePaymentMethodData,
  formatPaymentDetails 
} from '../../services/paymentAPI'
import PaymentMethodForm from './PaymentMethodForm'

const InstructorPaymentMethods = ({ instructorId }) => {
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMethod, setEditingMethod] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPaymentMethods()
  }, [instructorId])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const methods = await getInstructorPaymentMethods(instructorId)
      setPaymentMethods(methods)
      setError(null)
    } catch (err) {
      setError('Failed to load payment methods')
      console.error('Error loading payment methods:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMethod = async (methodData) => {
    try {
      const newMethod = await createPaymentMethod({
        ...methodData,
        instructor_id: instructorId
      })
      setPaymentMethods([...paymentMethods, newMethod])
      setShowForm(false)
      setError(null)
    } catch (err) {
      setError('Failed to create payment method')
      throw err
    }
  }

  const handleUpdateMethod = async (methodData) => {
    try {
      const updatedMethod = await updatePaymentMethod(editingMethod.id, methodData)
      setPaymentMethods(paymentMethods.map(m => 
        m.id === editingMethod.id ? updatedMethod : m
      ))
      setEditingMethod(null)
      setShowForm(false)
      setError(null)
    } catch (err) {
      setError('Failed to update payment method')
      throw err
    }
  }

  const handleDeleteMethod = async (methodId) => {
    if (!confirm('Are you sure you want to delete this payment method?')) return

    try {
      await deletePaymentMethod(methodId)
      setPaymentMethods(paymentMethods.filter(m => m.id !== methodId))
      setError(null)
    } catch (err) {
      setError('Failed to delete payment method')
      console.error('Error deleting payment method:', err)
    }
  }

  const handleSetPrimary = async (methodId) => {
    try {
      await setPrimaryPaymentMethod(methodId, instructorId)
      setPaymentMethods(paymentMethods.map(m => ({
        ...m,
        is_primary: m.id === methodId
      })))
      setError(null)
    } catch (err) {
      setError('Failed to set primary payment method')
      console.error('Error setting primary payment method:', err)
    }
  }

  const getPaymentIcon = (paymentType) => {
    const icons = {
      'vodafone_cash': '📱',
      'orange_cash': '📱', 
      'etisalat_cash': '📱',
      'we_pay': '📱',
      'bank_transfer': '🏦',
      'iban': '🏦',
      'paypal': '💳',
      'ksa_local': '💰',
      'uae_local': '💰',
      'international_wire': '🌍',
      'crypto': '₿',
      'other': '💼'
    }
    return icons[paymentType] || '💳'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            Payment Methods
          </h2>
          <p className="text-gray-600 mt-1">
            Manage how students can pay for your courses
          </p>
        </div>
        <button
          onClick={() => {
            setEditingMethod(null)
            setShowForm(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Payment Method
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {paymentMethods.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Payment Methods Added
          </h3>
          <p className="text-gray-600 mb-6">
            Add payment methods so students can pay for your courses
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Payment Method
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`border rounded-lg p-4 transition-all ${
                method.is_primary 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">
                    {getPaymentIcon(method.payment_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {method.display_name}
                      </h3>
                      {method.is_primary && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatPaymentDetails(method.payment_type, method.payment_details)}
                    </p>
                    {method.instructions && (
                      <p className="text-xs text-gray-500 mt-1">
                        Instructions: {method.instructions}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!method.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(method.id)}
                      className="text-gray-400 hover:text-blue-600 transition-colors"
                      title="Set as primary"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      setEditingMethod(method)
                      setShowForm(true)
                    }}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteMethod(method.id)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <PaymentMethodForm
          method={editingMethod}
          onSubmit={editingMethod ? handleUpdateMethod : handleCreateMethod}
          onCancel={() => {
            setShowForm(false)
            setEditingMethod(null)
          }}
        />
      )}
    </div>
  )
}

export default InstructorPaymentMethods