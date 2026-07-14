// This file is deprecated. The frontend now uses only the REST API.
// All database calls must go through src/services/api.js instead.
// Payment API functions are no longer available via this file.

/**
 * @deprecated Use REST API instead
 */
export const getInstructorPaymentMethods = async (instructorId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const createPaymentMethod = async (paymentMethodData) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const updatePaymentMethod = async (methodId, updates) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const deletePaymentMethod = async (methodId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const setPrimaryPaymentMethod = async (methodId, instructorId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const getCoursePaymentMethods = async (courseId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const uploadPaymentScreenshot = async (file, studentId, courseId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const submitPaymentProof = async (submissionData) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const getStudentPaymentSubmissions = async (studentId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const getInstructorPaymentSubmissions = async (instructorId, filters = {}) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const getPaymentSubmissionDetails = async (submissionId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const approvePaymentSubmission = async (submissionId, reviewerId, reviewNotes = null) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const rejectPaymentSubmission = async (submissionId, reviewerId, reviewNotes = null) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const requestPaymentInfo = async (submissionId, reviewerId, requestNotes) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const createPaymentNotification = async (userId, courseId, notificationType, title, message, actionUrl = null) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const getPaymentNotifications = async (userId, limit = 10) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const markNotificationAsRead = async (notificationId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const getInstructorPaymentStats = async (instructorId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const getPendingPaymentsCount = async (instructorId) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * @deprecated Use REST API instead
 */
export const getRecentPaymentActivity = async (instructorId, limit = 5) => {
  throw new Error('This function requires payment API endpoints on the backend');
}

/**
 * Format payment method details for display
 */
export const formatPaymentDetails = (paymentType, details) => {
  const formatters = {
    vodafone_cash: (d) => `Vodafone Cash: ${d.phone_number}`,
    orange_cash: (d) => `Orange Cash: ${d.phone_number}`,
    etisalat_cash: (d) => `Etisalat Cash: ${d.phone_number}`,
    we_pay: (d) => `WE Pay: ${d.phone_number}`,
    bank_transfer: (d) => `Bank: ${d.bank_name} - Account: ${d.account_number}`,
    iban: (d) => `IBAN: ${d.iban} (${d.bank_name})`,
    paypal: (d) => `PayPal: ${d.email}`,
    ksa_local: (d) => `${d.provider}: ${d.account_info}`,
    uae_local: (d) => `${d.provider}: ${d.account_info}`,
    international_wire: (d) => `Wire Transfer: ${d.swift_code}`,
    crypto: (d) => `${d.currency}: ${d.wallet_address}`,
    other: (d) => d.custom_info || 'Custom Payment Method'
  }

  return formatters[paymentType] ? formatters[paymentType](details) : 'Unknown Payment Method'
}

/**
 * Validate payment method data
 */
export const validatePaymentMethodData = (paymentType, details) => {
  const validators = {
    vodafone_cash: (d) => d.phone_number && d.phone_number.length >= 10,
    orange_cash: (d) => d.phone_number && d.phone_number.length >= 10,
    etisalat_cash: (d) => d.phone_number && d.phone_number.length >= 10,
    we_pay: (d) => d.phone_number && d.phone_number.length >= 10,
    bank_transfer: (d) => d.bank_name && d.account_number,
    iban: (d) => d.iban && d.bank_name,
    paypal: (d) => d.email && d.email.includes('@'),
    ksa_local: (d) => d.provider && d.account_info,
    uae_local: (d) => d.provider && d.account_info,
    international_wire: (d) => d.swift_code && d.account_number,
    crypto: (d) => d.currency && d.wallet_address,
    other: (d) => d.custom_info && d.custom_info.length > 0
  }

  return validators[paymentType] ? validators[paymentType](details) : false
}

/**
 * @deprecated Use REST API instead
 */
export const cleanupExpiredPayments = async () => {
  throw new Error('This function requires payment API endpoints on the backend');
}

export default {
  getInstructorPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setPrimaryPaymentMethod,
  getCoursePaymentMethods,
  uploadPaymentScreenshot,
  submitPaymentProof,
  getStudentPaymentSubmissions,
  getInstructorPaymentSubmissions,
  getPaymentSubmissionDetails,
  approvePaymentSubmission,
  rejectPaymentSubmission,
  requestPaymentInfo,
  createPaymentNotification,
  getPaymentNotifications,
  markNotificationAsRead,
  getInstructorPaymentStats,
  getPendingPaymentsCount,
  getRecentPaymentActivity,
  formatPaymentDetails,
  validatePaymentMethodData,
  cleanupExpiredPayments
}

  if (error) throw error

  // Create notification for instructor
  await createPaymentNotification(
    data.instructor_id,
    data.course_id,
    'payment_submitted',
    `New payment submission for course "${data.courses.title}"`,
    `${data.students.full_name} has submitted a payment proof for review.`,
    `/instructor/payments/${data.id}`
  )

  return data
}

/**
 * Get payment submissions for a student
 */
export const getStudentPaymentSubmissions = async (studentId) => {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select(`
      *,
      courses(id, title, thumbnail_url),
      instructor_payment_methods(display_name, payment_type),
      instructors:users!instructor_id(full_name)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get payment submissions for an instructor
 */
export const getInstructorPaymentSubmissions = async (instructorId, filters = {}) => {
  let query = supabase
    .from('payment_submissions')
    .select(`
      *,
      courses(id, title, thumbnail_url),
      instructor_payment_methods(display_name, payment_type, payment_details),
      students:users!student_id(full_name, email, avatar_url)
    `)
    .eq('instructor_id', instructorId)

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  
  if (filters.courseId) {
    query = query.eq('course_id', filters.courseId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data
}

/**
 * Get a single payment submission with full details
 */
export const getPaymentSubmissionDetails = async (submissionId) => {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select(`
      *,
      courses(id, title, price, thumbnail_url),
      instructor_payment_methods(display_name, payment_type, payment_details, instructions),
      students:users!student_id(full_name, email, avatar_url),
      instructors:users!instructor_id(full_name),
      payment_approval_history(
        id,
        action,
        notes,
        created_at,
        reviewer:users!reviewer_id(full_name)
      )
    `)
    .eq('id', submissionId)
    .single()

  if (error) throw error
  return data
}

// =====================================================
// PAYMENT APPROVAL/REJECTION API
// =====================================================

/**
 * Approve payment submission (calls database function)
 */
export const approvePaymentSubmission = async (submissionId, reviewerId, reviewNotes = null) => {
  const { data, error } = await supabase.rpc('approve_payment_submission', {
    submission_id: submissionId,
    reviewer_id: reviewerId,
    review_notes: reviewNotes
  })

  if (error) throw error
  return data
}

/**
 * Reject payment submission (calls database function)
 */
export const rejectPaymentSubmission = async (submissionId, reviewerId, reviewNotes = null) => {
  const { data, error } = await supabase.rpc('reject_payment_submission', {
    submission_id: submissionId,
    reviewer_id: reviewerId,
    review_notes: reviewNotes
  })

  if (error) throw error
  return data
}

/**
 * Request more information from student
 */
export const requestPaymentInfo = async (submissionId, reviewerId, requestNotes) => {
  // Add to approval history
  const { error: historyError } = await supabase
    .from('payment_approval_history')
    .insert([{
      payment_submission_id: submissionId,
      reviewer_id: reviewerId,
      action: 'requested_info',
      notes: requestNotes
    }])

  if (historyError) throw historyError

  // Get submission details for notification
  const submission = await getPaymentSubmissionDetails(submissionId)

  // Create notification for student
  await createPaymentNotification(
    submission.student_id,
    submission.course_id,
    'payment_info_requested',
    'More Information Requested',
    `The instructor has requested more information about your payment submission for "${submission.courses.title}": ${requestNotes}`,
    `/student/payments/${submissionId}`
  )

  return true
}

// =====================================================
// NOTIFICATION SYSTEM FOR PAYMENTS
// =====================================================

/**
 * Create a payment-related notification
 */
export const createPaymentNotification = async (
  userId,
  courseId,
  notificationType,
  title,
  message,
  actionUrl = null
) => {
  const { data: notification, error: notificationError } = await supabase
    .from('notifications')
    .insert([{
      user_id: userId,
      course_id: courseId,
      title,
      message,
      type: 'payment',
      action_url: actionUrl
    }])
    .select()
    .single()

  if (notificationError) throw notificationError

  // Link to payment notifications table
  const { error: linkError } = await supabase
    .from('payment_notifications')
    .insert([{
      notification_id: notification.id,
      notification_type: notificationType
    }])

  if (linkError) throw linkError

  return notification
}

/**
 * Get payment notifications for a user
 */
export const getPaymentNotifications = async (userId, limit = 10) => {
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      courses(title),
      payment_notifications(notification_type)
    `)
    .eq('user_id', userId)
    .eq('type', 'payment')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) throw error
  return true
}

// =====================================================
// PAYMENT STATISTICS & ANALYTICS
// =====================================================

/**
 * Get payment statistics for an instructor
 */
export const getInstructorPaymentStats = async (instructorId) => {
  const { data, error } = await supabase
    .from('payment_statistics')
    .select('*')
    .eq('instructor_id', instructorId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
  return data || {
    total_submissions: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    expired_count: 0,
    total_revenue: 0,
    avg_review_time_hours: 0
  }
}

/**
 * Get pending payments count for instructor (for badges/notifications)
 */
export const getPendingPaymentsCount = async (instructorId) => {
  const { count, error } = await supabase
    .from('payment_submissions')
    .select('id', { count: 'exact' })
    .eq('instructor_id', instructorId)
    .eq('status', 'pending')

  if (error) throw error
  return count || 0
}

/**
 * Get recent payment activity for dashboard
 */
export const getRecentPaymentActivity = async (instructorId, limit = 5) => {
  const { data, error } = await supabase
    .from('payment_submissions')
    .select(`
      id,
      amount,
      status,
      submitted_at,
      reviewed_at,
      courses(title),
      students:users!student_id(full_name, avatar_url)
    `)
    .eq('instructor_id', instructorId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format payment method details for display
 */
export const formatPaymentDetails = (paymentType, details) => {
  const formatters = {
    vodafone_cash: (d) => `Vodafone Cash: ${d.phone_number}`,
    orange_cash: (d) => `Orange Cash: ${d.phone_number}`,
    etisalat_cash: (d) => `Etisalat Cash: ${d.phone_number}`,
    we_pay: (d) => `WE Pay: ${d.phone_number}`,
    bank_transfer: (d) => `Bank: ${d.bank_name} - Account: ${d.account_number}`,
    iban: (d) => `IBAN: ${d.iban} (${d.bank_name})`,
    paypal: (d) => `PayPal: ${d.email}`,
    ksa_local: (d) => `${d.provider}: ${d.account_info}`,
    uae_local: (d) => `${d.provider}: ${d.account_info}`,
    international_wire: (d) => `Wire Transfer: ${d.swift_code}`,
    crypto: (d) => `${d.currency}: ${d.wallet_address}`,
    other: (d) => d.custom_info || 'Custom Payment Method'
  }

  return formatters[paymentType] ? formatters[paymentType](details) : 'Unknown Payment Method'
}

/**
 * Validate payment method data
 */
export const validatePaymentMethodData = (paymentType, details) => {
  const validators = {
    vodafone_cash: (d) => d.phone_number && d.phone_number.length >= 10,
    orange_cash: (d) => d.phone_number && d.phone_number.length >= 10,
    etisalat_cash: (d) => d.phone_number && d.phone_number.length >= 10,
    we_pay: (d) => d.phone_number && d.phone_number.length >= 10,
    bank_transfer: (d) => d.bank_name && d.account_number,
    iban: (d) => d.iban && d.bank_name,
    paypal: (d) => d.email && d.email.includes('@'),
    ksa_local: (d) => d.provider && d.account_info,
    uae_local: (d) => d.provider && d.account_info,
    international_wire: (d) => d.swift_code && d.account_number,
    crypto: (d) => d.currency && d.wallet_address,
    other: (d) => d.custom_info && d.custom_info.length > 0
  }

  return validators[paymentType] ? validators[paymentType](details) : false
}

/**
 * Clean up expired payment submissions
 */
export const cleanupExpiredPayments = async () => {
  const { data, error } = await supabase.rpc('expire_old_payment_submissions')
  if (error) throw error
  return data
}

export default {
  // Instructor methods
  getInstructorPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setPrimaryPaymentMethod,
  getCoursePaymentMethods,

  // Student methods
  uploadPaymentScreenshot,
  submitPaymentProof,
  getStudentPaymentSubmissions,
  getInstructorPaymentSubmissions,
  getPaymentSubmissionDetails,

  // Approval methods
  approvePaymentSubmission,
  rejectPaymentSubmission,
  requestPaymentInfo,

  // Notifications
  createPaymentNotification,
  getPaymentNotifications,
  markNotificationAsRead,

  // Analytics
  getInstructorPaymentStats,
  getPendingPaymentsCount,
  getRecentPaymentActivity,

  // Utilities
  formatPaymentDetails,
  validatePaymentMethodData,
  cleanupExpiredPayments
}