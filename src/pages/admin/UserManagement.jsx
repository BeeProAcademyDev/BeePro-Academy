import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'
import { adminService, userService } from '../../services/api'
import { getRoleLabel as getSharedRoleLabel } from '../../lib/roles'
import { 
  FiUsers, 
  FiSearch, 
  FiEdit, 
  FiTrash2, 
  FiUserCheck, 
  FiUserX,
  FiLoader,
  FiRefreshCw,
  FiMoreVertical,
  FiBook,
  FiAward,
  FiFilter
} from 'react-icons/fi'

const UserManagement = () => {
  const { user } = useAuth()
  const { language } = useLanguage()
  const normalizedUserRole = (user?.role || '').toString().trim().toLowerCase()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  const configuredAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || 'admin@beepro.academy')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)

  const isConfiguredAdminEmail = configuredAdminEmails.includes(
    (user?.email || '').toString().trim().toLowerCase()
  )

  const ensureAdminRoleInDatabase = async () => {
    if (!user?.id || !isConfiguredAdminEmail) return

    try {
      await userService.ensureUserRole(user.id, user.email, 'admin')
    } catch (syncError) {
      console.warn('Admin role sync before user fetch failed:', syncError)
    }
  }

  const getAccessDeniedHint = () => {
    if (isConfiguredAdminEmail) {
      return language === 'ar'
        ? 'حدث تعارض بين صلاحيات قاعدة البيانات وواجهة التطبيق. نفّذ SQL لترقية role في جدول users إلى admin ثم أعد تسجيل الدخول.'
        : 'Database role is out of sync. Run SQL to set your users.role to admin, then sign out/in.'
    }

    return language === 'ar'
      ? 'أضف بريدك إلى VITE_ADMIN_EMAILS في ملف .env ثم أعد تشغيل التطبيق وسجل الدخول مرة أخرى.'
      : 'Add your email to VITE_ADMIN_EMAILS in .env, restart the app, then sign in again.'
  }

  const isAccessDeniedError = (error) => {
    const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
    return error?.code === 'P0001' || text.includes('access denied') || text.includes('admin role required')
  }

  // Fetch all users (admin only)
  const fetchUsers = async () => {
    if (!user?.id || normalizedUserRole !== 'admin') return
    
    setLoading(true)
    try {
      await ensureAdminRoleInDatabase()

      const { data, error } = await supabase.rpc('admin_get_all_users')

      if (error) {
        const { data: fallbackUsers } = await adminService.getAllUsers({ limit: 500, offset: 0 })
        const safeUsers = (fallbackUsers || []).map((item) => ({
          ...item,
          total_courses: item.total_courses || 0,
          total_enrollments: item.total_enrollments || 0
        }))
        setUsers(safeUsers)
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)

      if (isAccessDeniedError(error)) {
        try {
          const { data: fallbackUsers } = await adminService.getAllUsers({ limit: 500, offset: 0 })
          const safeUsers = (fallbackUsers || []).map((item) => ({
            ...item,
            total_courses: item.total_courses || 0,
            total_enrollments: item.total_enrollments || 0
          }))

          if (safeUsers.length > 0) {
            setUsers(safeUsers)
            alert(language === 'ar' ? 'تم تحميل المستخدمين عبر الوضع الاحتياطي. راجع صلاحيات admin في قاعدة البيانات.' : 'Users loaded via fallback mode. Please fix admin role in database.')
            return
          }
        } catch (fallbackError) {
          console.error('Fallback users fetch after P0001 failed:', fallbackError)
        }

        const adminHint = getAccessDeniedHint()
        alert(language === 'ar' ? `تم رفض الوصول: ${adminHint}` : `Access denied: ${adminHint}`)
        return
      }

      const details = error?.message || error?.details || error?.hint || ''
      alert(
        language === 'ar'
          ? `خطأ في تحميل المستخدمين${details ? `: ${details}` : ''}`
          : `Error loading users${details ? `: ${details}` : ''}`
      )
    } finally {
      setLoading(false)
    }
  }

  const approveInstructor = async (targetUserId) => {
    if (!user?.id) {
      alert(language === 'ar' ? 'يجب تسجيل الدخول' : 'You must be signed in')
      return
    }

    if (normalizedUserRole !== 'admin') {
      alert(language === 'ar' ? 'صلاحيات المدير مطلوبة' : 'Admin access is required')
      return
    }

    setActionLoading(targetUserId)
    try {
      await ensureAdminRoleInDatabase()
      const data = await adminService.approveInstructor(targetUserId)
      if (data?.success === false) throw new Error(data.error)

      alert(language === 'ar' ? 'تم قبول المدرس بنجاح' : 'Instructor approved successfully')
      fetchUsers()
    } catch (error) {
      console.error('Error approving instructor:', error)
      try {
        await adminService.updateUserRole(targetUserId, 'instructor')
        alert(language === 'ar' ? 'تم قبول المدرس بنجاح' : 'Instructor approved successfully')
        fetchUsers()
      } catch (fallbackError) {
        alert(language === 'ar' ? 'فشل قبول المدرس' : 'Failed to approve instructor')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const rejectInstructor = async (targetUserId) => {
    if (!user?.id || normalizedUserRole !== 'admin') return

    setActionLoading(targetUserId)
    try {
      const data = await adminService.rejectInstructor(targetUserId)
      if (data?.success === false) throw new Error(data.error)

      alert(language === 'ar' ? 'تم رفض طلب المدرس' : 'Instructor application rejected')
      fetchUsers()
    } catch (error) {
      console.error('Error rejecting instructor:', error)
      try {
        await adminService.updateUserRole(targetUserId, 'student')
        alert(language === 'ar' ? 'تم رفض طلب المدرس' : 'Instructor application rejected')
        fetchUsers()
      } catch (fallbackError) {
        alert(language === 'ar' ? 'فشل رفض الطلب' : 'Failed to reject application')
      }
    } finally {
      setActionLoading(null)
    }
  }

  // Update user role
  const updateUserRole = async (targetUserId, newRole) => {
    if (!user?.id || normalizedUserRole !== 'admin') return

    setActionLoading(targetUserId)
    try {
      const { data, error } = await supabase.rpc('admin_update_user_role', {
        target_user_id: targetUserId,
        new_role: newRole
      })

      if (error) throw error
      
      if (data.success) {
        alert(language === 'ar' 
          ? `تم تحديث دور المستخدم إلى ${getRoleLabel(newRole)}` 
          : `User role updated to ${getRoleLabel(newRole)}`
        )
        fetchUsers() // Refresh the list
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      console.error('Error updating user role:', error)

      if (isAccessDeniedError(error)) {
        try {
          await ensureAdminRoleInDatabase()

          const { data: retriedData, error: retriedError } = await supabase.rpc('admin_update_user_role', {
            target_user_id: targetUserId,
            new_role: newRole
          })

          if (retriedError) throw retriedError

          if (retriedData?.success) {
            alert(language === 'ar'
              ? `تم تحديث دور المستخدم إلى ${getRoleLabel(newRole)}`
              : `User role updated to ${getRoleLabel(newRole)}`)
            fetchUsers()
            return
          }

          if (retriedData && retriedData.success === false) {
            throw new Error(retriedData.error || 'Access denied. Admin role required.')
          }
        } catch (retryError) {
          console.error('Role update retry after admin sync failed:', retryError)
        }

        try {
          await adminService.updateUserRole(targetUserId, newRole)
          alert(language === 'ar'
            ? `تم تحديث دور المستخدم إلى ${getRoleLabel(newRole)}`
            : `User role updated to ${getRoleLabel(newRole)}`)
          fetchUsers()
          return
        } catch (fallbackError) {
          console.error('Fallback role update after P0001 failed:', fallbackError)
        }

        const adminHint = getAccessDeniedHint()
        alert(language === 'ar' ? `تم رفض الوصول: ${adminHint}` : `Access denied: ${adminHint}`)
        return
      }

      alert(language === 'ar' ? 'خطأ في تحديث دور المستخدم' : 'Error updating user role')
    } finally {
      setActionLoading(null)
    }
  }

  // Get user details
  const getUserDetails = async (targetUserId) => {
    if (!user?.id || normalizedUserRole !== 'admin') return

    const selectedFromList = users.find((listUser) => listUser.id === targetUserId)

    try {
      const { data, error } = await supabase.rpc('admin_get_user_details', {
        target_user_id: targetUserId
      })

      if (error) throw error
      
      if (data.success) {
        setSelectedUser(data)
        setShowUserDetails(true)
      }
    } catch (error) {
      console.error('Error getting user details:', error)

      // Fallback to direct queries so admins can still inspect user details.
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle()

        let courses = []
        let enrollments = []

        if ((profile?.role || '').toLowerCase() === 'instructor') {
          const { data: instructorCourses } = await supabase
            .from('courses')
            .select('id, title, status')
            .eq('instructor_id', targetUserId)
            .order('created_at', { ascending: false })
          courses = (instructorCourses || []).map((course) => ({
            ...course,
            enrollments: 0
          }))
        }

        if ((profile?.role || '').toLowerCase() === 'student') {
          const { data: studentEnrollments } = await supabase
            .from('enrollments')
            .select('id, progress, course:courses(title, instructor:users!instructor_id(full_name))')
            .eq('user_id', targetUserId)
            .order('enrolled_at', { ascending: false })

          enrollments = (studentEnrollments || []).map((enrollment) => ({
            id: enrollment.id,
            progress: enrollment.progress || 0,
            course_title: enrollment.course?.title || 'N/A',
            instructor_name: enrollment.course?.instructor?.full_name || 'N/A'
          }))
        }

        const fallbackUser = profile || selectedFromList
        if (!fallbackUser) throw new Error('User details are not available')

        setSelectedUser({
          success: true,
          user: fallbackUser,
          courses,
          enrollments
        })
        setShowUserDetails(true)
      } catch (fallbackError) {
        console.error('Fallback user details failed:', fallbackError)
        if (selectedFromList) {
          setSelectedUser({
            success: true,
            user: selectedFromList,
            courses: [],
            enrollments: []
          })
          setShowUserDetails(true)
          return
        }

        alert(language === 'ar' ? 'تعذر تحميل التفاصيل' : 'Unable to load user details')
      }
    }
  }

  const getRoleLabel = (role) => getSharedRoleLabel(role, language)

  const getRoleColor = (role) => {
    const colors = {
      'student': 'bg-blue-100 text-blue-800',
      'pending_instructor': 'bg-amber-100 text-amber-800',
      'instructor': 'bg-green-100 text-green-800',
      'admin': 'bg-red-100 text-red-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  const pendingInstructors = users.filter((u) => u.role === 'pending_instructor')

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  useEffect(() => {
    fetchUsers()
  }, [user])

  if (normalizedUserRole !== 'admin') {
    return (
      <div className="text-center py-12">
        <FiUsers className="w-16 h-16 mx-auto mb-4 text-red-400" />
        <h3 className="text-xl font-bold mb-2 text-red-600">
          {language === 'ar' ? 'غير مصرح' : 'Access Denied'}
        </h3>
        <p className="text-gray-500">
          {language === 'ar' ? 'يجب أن تكون مدير للوصول إلى هذه الصفحة' : 'You must be an admin to access this page'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {language === 'ar' ? 'إدارة المستخدمين' : 'User Management'}
          </h2>
          <p className="text-gray-500">
            {language === 'ar' 
              ? 'إدارة جميع المستخدمين وتحويل أدوارهم' 
              : 'Manage all users and convert their roles'
            }
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="btn btn-secondary"
        >
          {loading ? (
            <FiLoader className="w-5 h-5 animate-spin" />
          ) : (
            <FiRefreshCw className="w-5 h-5" />
          )}
          {language === 'ar' ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Pending Instructor Approvals */}
      {pendingInstructors.length > 0 && (
        <div className="card card-body border border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <h3 className="font-bold mb-4">
            {language === 'ar'
              ? `طلبات مدرسين بانتظار الموافقة (${pendingInstructors.length})`
              : `Pending Instructor Applications (${pendingInstructors.length})`}
          </h3>
          <div className="space-y-3">
            {pendingInstructors.map((pendingUser) => (
              <div key={pendingUser.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="font-medium">{pendingUser.full_name || pendingUser.email}</div>
                  <div className="text-sm text-gray-500">{pendingUser.email}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveInstructor(pendingUser.id)}
                    disabled={actionLoading === pendingUser.id}
                    className="btn btn-primary text-sm"
                  >
                    {actionLoading === pendingUser.id
                      ? (language === 'ar' ? 'جاري...' : 'Processing...')
                      : (language === 'ar' ? 'قبول' : 'Approve')}
                  </button>
                  <button
                    onClick={() => rejectInstructor(pendingUser.id)}
                    disabled={actionLoading === pendingUser.id}
                    className="btn btn-secondary text-sm"
                  >
                    {language === 'ar' ? 'رفض' : 'Reject'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'student').length}</div>
          <div className="text-sm text-gray-500">{language === 'ar' ? 'طلاب' : 'Students'}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-amber-600">{pendingInstructors.length}</div>
          <div className="text-sm text-gray-500">{language === 'ar' ? 'بانتظار الموافقة' : 'Pending'}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'instructor').length}</div>
          <div className="text-sm text-gray-500">{language === 'ar' ? 'مدرسين' : 'Instructors'}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-red-600">{users.filter(u => u.role === 'admin').length}</div>
          <div className="text-sm text-gray-500">{language === 'ar' ? 'إداريين' : 'Admins'}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-gray-600">{users.length}</div>
          <div className="text-sm text-gray-500">{language === 'ar' ? 'إجمالي' : 'Total'}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-body">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={language === 'ar' ? 'البحث بالاسم أو البريد...' : 'Search by name or email...'}
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Role Filter */}
          <div className="relative">
            <select
              className="input pr-10"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">{language === 'ar' ? 'جميع الأدوار' : 'All Roles'}</option>
              <option value="student">{language === 'ar' ? 'طالب' : 'Student'}</option>
              <option value="pending_instructor">{language === 'ar' ? 'مدرس (بانتظار الموافقة)' : 'Pending Instructor'}</option>
              <option value="instructor">{language === 'ar' ? 'مدرس' : 'Instructor'}</option>
              <option value="admin">{language === 'ar' ? 'إداري' : 'Admin'}</option>
            </select>
            <FiFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <FiLoader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
            <p className="text-gray-500">
              {language === 'ar' ? 'جاري تحميل المستخدمين...' : 'Loading users...'}
            </p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'المستخدم' : 'User'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'الدور' : 'Role'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'الكورسات' : 'Courses'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'تاريخ التسجيل' : 'Join Date'}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'إجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.map((userData) => (
                  <tr key={userData.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {userData.avatar_url ? (
                            <img className="h-10 w-10 rounded-full" src={userData.avatar_url} alt="" />
                          ) : (
                            <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <FiUsers className="h-5 w-5 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {userData.full_name || 'N/A'}
                          </div>
                          <div className="text-sm text-gray-500">{userData.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(userData.role)}`}>
                        {getRoleLabel(userData.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FiBook className="w-4 h-4" />
                          {userData.total_courses || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <FiUserCheck className="w-4 h-4" />
                          {userData.total_enrollments || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userData.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details */}
                        <button
                          onClick={() => getUserDetails(userData.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title={language === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        
                        {/* Role Conversion Buttons */}
                        {userData.role === 'pending_instructor' && (
                          <>
                            <button
                              onClick={() => approveInstructor(userData.id)}
                              disabled={actionLoading === userData.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title={language === 'ar' ? 'قبول المدرس' : 'Approve Instructor'}
                            >
                              {actionLoading === userData.id ? (
                                <FiLoader className="w-4 h-4 animate-spin" />
                              ) : (
                                <FiUserCheck className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => rejectInstructor(userData.id)}
                              disabled={actionLoading === userData.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title={language === 'ar' ? 'رفض الطلب' : 'Reject Application'}
                            >
                              <FiUserX className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {userData.role === 'student' && (
                          <button
                            onClick={() => updateUserRole(userData.id, 'instructor')}
                            disabled={actionLoading === userData.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title={language === 'ar' ? 'ترقية إلى مدرس' : 'Promote to Instructor'}
                          >
                            {actionLoading === userData.id ? (
                              <FiLoader className="w-4 h-4 animate-spin" />
                            ) : (
                              <FiUserCheck className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        
                        {userData.role !== 'student' && (
                          <button
                            onClick={() => updateUserRole(userData.id, 'student')}
                            disabled={actionLoading === userData.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title={language === 'ar' ? 'تحويل إلى طالب' : 'Convert to Student'}
                          >
                            {actionLoading === userData.id ? (
                              <FiLoader className="w-4 h-4 animate-spin" />
                            ) : (
                              <FiUsers className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FiUsers className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">
              {language === 'ar' ? 'لا توجد نتائج' : 'No Results'}
            </h3>
            <p className="text-gray-500">
              {language === 'ar' 
                ? 'لم يتم العثور على مستخدمين مطابقين للبحث'
                : 'No users found matching your search criteria'
              }
            </p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">
                  {language === 'ar' ? 'تفاصيل المستخدم' : 'User Details'}
                </h3>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              {selectedUser.user && (
                <div className="space-y-6">
                  {/* User Info */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {selectedUser.user.avatar_url ? (
                      <img 
                        src={selectedUser.user.avatar_url} 
                        alt="" 
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                        <FiUsers className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-xl font-bold">{selectedUser.user.full_name}</h4>
                      <p className="text-gray-600">{selectedUser.user.email}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedUser.user.role)}`}>
                        {getRoleLabel(selectedUser.user.role)}
                      </span>
                    </div>
                  </div>

                  {/* Courses (if instructor) */}
                  {selectedUser.user.role === 'instructor' && selectedUser.courses && selectedUser.courses.length > 0 && (
                    <div>
                      <h5 className="font-bold mb-3">
                        {language === 'ar' ? 'الكورسات' : 'Courses'}
                      </h5>
                      <div className="space-y-2">
                        {selectedUser.courses.map(course => (
                          <div key={course.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex justify-between">
                            <div>
                              <div className="font-medium">{course.title}</div>
                              <div className="text-sm text-gray-500">{course.enrollments} enrollments</div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded ${course.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {course.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Enrollments (if student) */}
                  {selectedUser.user.role === 'student' && selectedUser.enrollments && selectedUser.enrollments.length > 0 && (
                    <div>
                      <h5 className="font-bold mb-3">
                        {language === 'ar' ? 'الاشتراكات' : 'Enrollments'}
                      </h5>
                      <div className="space-y-2">
                        {selectedUser.enrollments.map(enrollment => (
                          <div key={enrollment.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="font-medium">{enrollment.course_title}</div>
                            <div className="text-sm text-gray-500">
                              {language === 'ar' ? 'المدرس:' : 'Instructor:'} {enrollment.instructor_name}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-sm">{language === 'ar' ? 'التقدم:' : 'Progress:'}</span>
                              <span className="font-bold">{enrollment.progress}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement