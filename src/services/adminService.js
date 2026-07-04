import supabase from '../lib/supabase'
import { normalizeDbRole } from '../lib/roles'
import {
  assertSupabaseAvailable,
  isSupabaseAvailable,
  parseRpcJsonResult,
  assertRoleUpdateResult
} from './helpers'

export const adminService = {
  // Get dashboard stats
  async getDashboardStats() {
    if (!isSupabaseAvailable()) {
      return {
        totalUsers: 150,
        totalCourses: 70,
        totalEnrollments: 450,
        totalRevenue: 12500
      }
    }

    const [
      { count: usersCount },
      { count: coursesCount },
      { count: enrollmentsCount }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('courses').select('*', { count: 'exact', head: true }),
      supabase.from('enrollments').select('*', { count: 'exact', head: true })
    ])

    return {
      totalUsers: usersCount || 0,
      totalCourses: coursesCount || 0,
      totalEnrollments: enrollmentsCount || 0,
      totalRevenue: 0 // Would need payments table
    }
  },

  // Get all users (admin only)
  async getAllUsers() {
    throw new Error('Direct admin user listing is disabled. Use admin_get_all_users RPC.')
  },

  async getAllUsersAdmin() {
    assertSupabaseAvailable()

    try {
      const { data, error } = await supabase.rpc('admin_get_all_users')
      if (error) throw error
      return data || []
    } catch (e) {
      // Map common JWT/session expiry errors to a friendlier message so
      // the UI can suggest re-authentication instead of showing raw RPC errors.
      const msg = (e?.message || '').toString().toLowerCase()
      if (msg.includes('jwt') && msg.includes('exp') || msg.includes('expired')) {
        throw new Error('Session expired. Please sign out and sign in again.')
      }
      throw e
    }
  },

  // Update user role (admin only — direct table update fallback)
  async updateUserRole(userId, role) {
    return this.updateUserRoleAdmin(userId, role)
  },

  async updateUserRoleAdmin(targetUserId, newRole) {
    assertSupabaseAvailable()

    const normalizedRole = normalizeDbRole(newRole)
    const { data, error } = await supabase.rpc('admin_update_user_role', {
      target_user_id: targetUserId,
      new_role: normalizedRole
    })

    if (error) throw error

    const result = parseRpcJsonResult(data)
    if (result?.success === false) {
      throw new Error(result.error || 'Role update failed')
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role, email, full_name')
      .eq('id', targetUserId)
      .single()

    if (profileError) throw profileError
    assertRoleUpdateResult(profile, normalizedRole)

    return result
  },

  async getUserDetailsAdmin(targetUserId) {
    assertSupabaseAvailable()

    const { data, error } = await supabase.rpc('admin_get_user_details', {
      target_user_id: targetUserId
    })

    if (error) throw error
    return data
  },

  async getUserDetailsFallback() {
    throw new Error('Direct admin user detail fallback is disabled. Use admin_get_user_details RPC.')
  },

  async approveInstructor(targetUserId) {
    assertSupabaseAvailable()

    const { data, error } = await supabase.rpc('admin_approve_instructor', {
      target_user_id: targetUserId
    })

    if (error) throw error

    const result = parseRpcJsonResult(data)
    if (result?.success === false) {
      throw new Error(result.error || 'Failed to approve instructor')
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .single()

    if (profileError) throw profileError
    assertRoleUpdateResult(profile, 'instructor')

    return result
  },

  async rejectInstructor(targetUserId) {
    assertSupabaseAvailable()

    const { data, error } = await supabase.rpc('admin_reject_instructor', {
      target_user_id: targetUserId
    })

    if (error) throw error

    const result = parseRpcJsonResult(data)
    if (result?.success === false) {
      throw new Error(result.error || 'Failed to reject instructor')
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .single()

    if (profileError) throw profileError
    assertRoleUpdateResult(profile, 'student')

    return result
  },

  async setUserSuspended(targetUserId, isSuspended) {
    assertSupabaseAvailable()

    const { data, error } = await supabase.rpc('admin_set_user_suspended', {
      target_user_id: targetUserId,
      suspend_user: Boolean(isSuspended)
    })

    if (error) throw error

    const result = parseRpcJsonResult(data)
    if (result?.success === false) {
      throw new Error(result.error || 'Failed to update user status')
    }

    return result
  },

  async deletePlatformUser(targetUserId) {
    assertSupabaseAvailable()

    const { data, error } = await supabase.rpc('admin_delete_platform_user', {
      target_user_id: targetUserId
    })

    if (error) throw error

    const result = parseRpcJsonResult(data)
    if (result?.success === false) {
      throw new Error(result.error || 'Failed to delete user')
    }

    return result
  },

  async getCrmContacts() {
    if (!isSupabaseAvailable()) {
      return []
    }

    const [
      { data: users, error: usersError },
      { data: payments, error: paymentsError },
      { data: enrollments, error: enrollmentsError }
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, full_name, email, phone, role, avatar_url, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('payment_submissions')
        .select(`
          id,
          student_id,
          course_id,
          amount,
          currency,
          status,
          submitted_at,
          created_at,
          additional_notes,
          transaction_reference,
          course:courses(id, title)
        `)
        .order('submitted_at', { ascending: false }),
      supabase
        .from('enrollments')
        .select('id, user_id, course_id, enrolled_at, course:courses(id, title)')
        .order('enrolled_at', { ascending: false })
    ])

    if (usersError) throw usersError
    if (paymentsError) throw paymentsError
    if (enrollmentsError) throw enrollmentsError

    const paymentsByUser = new Map()
    ;(payments || []).forEach((payment) => {
      const rows = paymentsByUser.get(payment.student_id) || []
      rows.push(payment)
      paymentsByUser.set(payment.student_id, rows)
    })

    const enrollmentsByUser = new Map()
    ;(enrollments || []).forEach((enrollment) => {
      const rows = enrollmentsByUser.get(enrollment.user_id) || []
      rows.push(enrollment)
      enrollmentsByUser.set(enrollment.user_id, rows)
    })

    return (users || []).map((profile) => {
      const userPayments = paymentsByUser.get(profile.id) || []
      const approvedPayments = userPayments.filter((payment) => (
        (payment.status || '').toString().trim().toLowerCase() === 'approved'
      ))
      const userEnrollments = enrollmentsByUser.get(profile.id) || []
      const courseTitles = [
        ...new Set(
          approvedPayments
            .map((payment) => payment.course?.title)
            .filter(Boolean)
        )
      ]

      return {
        ...profile,
        payment_status: approvedPayments.length > 0 ? 'have payment' : 'without payment',
        approved_payments_count: approvedPayments.length,
        total_payments_count: userPayments.length,
        total_paid_amount: approvedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        latest_payment_at: approvedPayments[0]?.submitted_at || approvedPayments[0]?.created_at || null,
        latest_payment_notes: userPayments[0]?.additional_notes || '',
        latest_transaction_reference: userPayments[0]?.transaction_reference || '',
        paid_course_titles: courseTitles,
        enrollment_count: userEnrollments.length
      }
    })
  }
}
