import { supabase } from '../lib/supabase'

const isSupabaseAvailable = () => !!supabase

const extractPaymentProofPath = (urlOrPath) => {
  if (!urlOrPath) return null

  if (!urlOrPath.startsWith('http')) {
    return urlOrPath
  }

  const marker = '/payment-proofs/'
  const idx = urlOrPath.indexOf(marker)
  if (idx === -1) return null

  const rawPath = urlOrPath.slice(idx + marker.length)
  const cleanPath = rawPath.split('?')[0]

  try {
    return decodeURIComponent(cleanPath)
  } catch {
    return cleanPath
  }
}

const ensurePublicUserProfile = async (userId) => {
  if (!isSupabaseAvailable() || !userId) return

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (!existingError && existing?.id) {
    return
  }

  const { data: authData } = await supabase.auth.getUser()
  const authUser = authData?.user

  const email = authUser?.email || ''
  const fullName = authUser?.user_metadata?.full_name || email.split('@')[0] || 'Student'
  const roleFromMeta = authUser?.user_metadata?.role
  const role = roleFromMeta === 'admin' || roleFromMeta === 'instructor' ? roleFromMeta : 'student'

  const { error: upsertError } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role
      },
      { onConflict: 'id' }
    )

  if (upsertError) {
    const message = (upsertError.message || '').toLowerCase()
    const details = (upsertError.details || '').toLowerCase()
    const isEmailConflict =
      upsertError.code === '23505' ||
      message.includes('users_email_key') ||
      details.includes('users_email_key')

    if (isEmailConflict) {
      // Some databases contain a legacy duplicate email row with a different id.
      // Use a deterministic fallback email so we can still create the required profile by auth uid.
      const fallbackEmail = `user-${userId}@profile.local`
      const { error: retryError } = await supabase
        .from('users')
        .upsert(
          {
            id: userId,
            email: fallbackEmail,
            full_name: fullName,
            role
          },
          { onConflict: 'id' }
        )

      if (!retryError) {
        return
      }
    }

    throw new Error(
      'Student profile is missing in users table and could not be created automatically. Apply supabase/migrations/012_fix_profile_creation_email_conflicts.sql in Supabase SQL Editor.'
    )
  }
}

export const PAYMENT_TYPES = [
  { value: 'vodafone_cash', label: 'Vodafone Cash' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' }
]

export const paymentService = {
  async getPaymentProofViewUrl(urlOrPath, expiresInSeconds = 3600) {
    if (!isSupabaseAvailable()) {
      return urlOrPath
    }

    const filePath = extractPaymentProofPath(urlOrPath)
    if (!filePath) {
      return urlOrPath
    }

    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(filePath, expiresInSeconds)

    if (error) {
      const lowerMessage = (error.message || '').toLowerCase()
      if (lowerMessage.includes('bucket not found')) {
        throw new Error(
          'Storage bucket "payment-proofs" is missing. Apply supabase/migrations/013_fix_payment_bucket_and_receipt_access.sql in Supabase SQL Editor.'
        )
      }
      throw error
    }

    return data?.signedUrl || urlOrPath
  },

  async getCoursePaymentMethods(courseId, instructorIdFromContext = null) {
    if (!isSupabaseAvailable()) {
      return []
    }

    let instructorId = instructorIdFromContext

    if (!instructorId) {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, instructor_id')
        .eq('id', courseId)
        .single()

      if (!courseError && course?.instructor_id) {
        instructorId = course.instructor_id
      }
    }

    if (instructorId) {
      const { data, error } = await supabase
        .from('instructor_payment_methods')
        .select('*')
        .eq('instructor_id', instructorId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })

      if (!error && data?.length) {
        return data
      }
    }

    // Fallback: if instructor has no active methods (or course lookup fails),
    // use any active methods so students can still pay for any course.

    const { data: activeMethods, error: methodsError } = await supabase
      .from('instructor_payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (methodsError) {
      const msg = (methodsError.message || '').toLowerCase()
      if (msg.includes('permission') || msg.includes('policy') || msg.includes('row-level security')) {
        throw new Error(
          'Payment methods are blocked by database policy for this user. Apply supabase/migrations/009_fix_student_payment_access.sql in Supabase SQL Editor.'
        )
      }
      throw methodsError
    }
    return activeMethods || []
  },

  async getMyPaymentMethods(userId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('instructor_payment_methods')
      .select('*')
      .eq('instructor_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  async createPaymentMethod(paymentMethodData) {
    if (!isSupabaseAvailable()) {
      return { id: 'mock-payment-method-id', ...paymentMethodData }
    }

    const { data, error } = await supabase
      .from('instructor_payment_methods')
      .insert(paymentMethodData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getInstructorPaymentSubmissions(instructorId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('payment_submissions')
      .select(`
        *,
        courses(id, title),
        students:users!payment_submissions_student_id_fkey(full_name, email),
        payment_method:instructor_payment_methods(display_name, payment_type)
      `)
      .eq('instructor_id', instructorId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data || []
  },

  async getAllPaymentSubmissions() {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('payment_submissions')
      .select(`
        *,
        courses(id, title),
        students:users!payment_submissions_student_id_fkey(full_name, email),
        instructors:users!payment_submissions_instructor_id_fkey(full_name, email),
        payment_method:instructor_payment_methods(display_name, payment_type)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error) {
      return data || []
    }

    // Fallback when relational joins are blocked by RLS on joined tables.
    const { data: basicData, error: basicError } = await supabase
      .from('payment_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (basicError) throw basicError
    return basicData || []
  },

  async getStudentPaymentSubmissions(studentId) {
    if (!isSupabaseAvailable()) {
      return []
    }

    const { data, error } = await supabase
      .from('payment_submissions')
      .select(`
        *,
        courses(id, title),
        instructors:users!payment_submissions_instructor_id_fkey(full_name, email),
        payment_method:instructor_payment_methods(display_name, payment_type)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!error) {
      return data || []
    }

    const { data: basicData, error: basicError } = await supabase
      .from('payment_submissions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (basicError) throw basicError
    return basicData || []
  },

  async uploadPaymentScreenshot(file, studentId, courseId) {
    if (!isSupabaseAvailable()) {
      return URL.createObjectURL(file)
    }

    const fileExt = file.name.split('.').pop()
    const filePath = `${studentId}/course-${courseId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, file, { upsert: false })

    if (uploadError) {
      const message = uploadError.message || ''
      const lowerMessage = message.toLowerCase()

      if (lowerMessage.includes('bucket not found')) {
        throw new Error(
          'Storage bucket "payment-proofs" is missing. Run supabase/payment_storage_config.sql in Supabase SQL Editor, then retry.'
        )
      }

      if (lowerMessage.includes('row-level security') || lowerMessage.includes('permission denied')) {
        throw new Error(
          'Upload blocked by storage policy. Make sure payment storage policies are applied and user role is allowed.'
        )
      }

      throw uploadError
    }

    const { data } = supabase.storage.from('payment-proofs').getPublicUrl(filePath)
    return data.publicUrl
  },

  async submitPaymentProof(payload) {
    if (!isSupabaseAvailable()) {
      return { id: 'mock-payment-submission-id', status: 'pending', ...payload }
    }

    await ensurePublicUserProfile(payload.student_id)

    const { data, error } = await supabase
      .from('payment_submissions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      const message = (error.message || '').toLowerCase()
      const details = (error.details || '').toLowerCase()
      const isStudentFkError =
        error.code === '23503' &&
        (message.includes('payment_submissions_student_id_fkey') || details.includes('payment_submissions_student_id_fkey'))

      if (isStudentFkError) {
        await ensurePublicUserProfile(payload.student_id)

        const { data: retryData, error: retryError } = await supabase
          .from('payment_submissions')
          .insert(payload)
          .select()
          .single()

        if (retryError) {
          throw new Error(
            'Payment failed because student profile is not linked correctly. Apply supabase/migrations/010_fix_users_profile_fk_sync.sql, then retry.'
          )
        }

        return retryData
      }

      throw error
    }

    const { error: notifyError } = await supabase.from('notifications').insert({
      user_id: payload.instructor_id,
      course_id: payload.course_id,
      title: 'New payment submission',
      message: 'A student submitted payment proof for your course.',
      type: 'payment',
      is_read: false
    })

    if (notifyError) {
      console.warn('Notification insert failed:', notifyError.message)
    }

    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')

    if (!adminError && adminUsers?.length) {
      const adminNotifications = adminUsers.map((admin) => ({
        user_id: admin.id,
        course_id: payload.course_id,
        title: 'New payment waiting approval',
        message: 'A payment submission is pending admin approval.',
        type: 'payment',
        is_read: false
      }))

      const { error: adminNotifyError } = await supabase
        .from('notifications')
        .insert(adminNotifications)

      if (adminNotifyError) {
        console.warn('Admin notifications insert failed:', adminNotifyError.message)
      }
    }

    return data
  },

  async approvePaymentSubmission({ submissionId, reviewerId, reviewNotes = null }) {
    if (!isSupabaseAvailable()) {
      return true
    }

    const { error } = await supabase.rpc('approve_payment_submission', {
      submission_id: submissionId,
      reviewer_id: reviewerId,
      review_notes: reviewNotes
    })

    if (!error) return true

    const { data: submissionRow, error: submissionLookupError } = await supabase
      .from('payment_submissions')
      .select('id, student_id, course_id')
      .eq('id', submissionId)
      .single()

    if (submissionLookupError) throw submissionLookupError

    const { error: fallbackError } = await supabase
      .from('payment_submissions')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      })
      .eq('id', submissionId)

    if (fallbackError) throw fallbackError

    if (submissionRow?.student_id && submissionRow?.course_id) {
      const { error: enrollError } = await supabase
        .from('enrollments')
        .upsert(
          {
            user_id: submissionRow.student_id,
            course_id: submissionRow.course_id,
            enrolled_at: new Date().toISOString(),
            progress: 0
          },
          { onConflict: 'user_id,course_id' }
        )

      if (enrollError) {
        throw enrollError
      }
    }

    return true
  },

  async rejectPaymentSubmission({ submissionId, reviewerId, reviewNotes = null }) {
    if (!isSupabaseAvailable()) {
      return true
    }

    const { error } = await supabase.rpc('reject_payment_submission', {
      submission_id: submissionId,
      reviewer_id: reviewerId,
      review_notes: reviewNotes
    })

    if (!error) return true

    const { error: fallbackError } = await supabase
      .from('payment_submissions')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      })
      .eq('id', submissionId)

    if (fallbackError) throw fallbackError
    return true
  }
}

export default paymentService
