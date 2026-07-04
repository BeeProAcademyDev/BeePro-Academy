import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { adminService } from '../../services/api'
import { getRoleLabel as getSharedRoleLabel, normalizeDbRole } from '../../lib/roles'
import { requireAdmin } from '../../lib/authGuards'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const { user } = useAuth()
  const { language } = useLanguage()
  const isAdminUser = requireAdmin(user)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  const getAccessDeniedHint = () => {
    return t('userManagement.adminAccessMustBeStoredInTheDa')
  }

  const isAccessDeniedError = (error) => {
    const text = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase()
    return error?.code === 'P0001' || text.includes('access denied') || text.includes('admin role required')
  }

  // Fetch all users (admin only)
  const fetchUsers = async () => {
    if (!user?.id || !isAdminUser) return
    
    setLoading(true)
    try {
      const data = await adminService.getAllUsersAdmin()
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)

      if (isAccessDeniedError(error)) {
        const adminHint = getAccessDeniedHint()
        alert(t('userManagement.accessDeniedAdminhint'))
        return
      }

      const details = error?.message || error?.details || error?.hint || ''
      alert(
        `${t('userManagement.errorLoadingUsers')}${details ? `: ${details}` : ''}`
      )
    } finally {
      setLoading(false)
    }
  }

  const showRoleUpdateSuccess = (newRole) => {
    alert(t('userManagement.userRoleUpdatedToGetrolelabeln'))
    fetchUsers()
  }

  const handleRoleChangeError = (error, actionLabelEn, actionLabelAr) => {
    console.error(`Role change failed (${actionLabelEn}):`, error)
    const details = error?.message || ''
    const hint = isAccessDeniedError(error) ? getAccessDeniedHint() : details
    alert(
      `${t('userManagement.roleChangeFailed', { action: language === 'ar' ? actionLabelAr : actionLabelEn })}${hint ? `: ${hint}` : ''}`
    )
  }

  const applyRoleChange = async (targetUserId, newRole) => {
    try {
      await adminService.updateUserRoleAdmin(targetUserId, newRole)
      return
    } catch (rpcError) {
      if (!isAccessDeniedError(rpcError)) {
        throw rpcError
      }
    }

    await adminService.updateUserRole(targetUserId, newRole)
  }

  const approveInstructor = async (targetUserId) => {
    if (!user?.id) {
      alert(t('userManagement.youMustBeSignedIn'))
      return
    }

    if (!isAdminUser) {
      alert(t('userManagement.adminAccessIsRequired'))
      return
    }

    setActionLoading(targetUserId)
    try {
      await adminService.approveInstructor(targetUserId)
      showRoleUpdateSuccess('instructor')
    } catch (error) {
      try {
        await applyRoleChange(targetUserId, 'instructor')
        showRoleUpdateSuccess('instructor')
      } catch (fallbackError) {
        handleRoleChangeError(fallbackError, 'approve instructor', '\u0642\u0628\u0648\u0644 \u0627\u0644\u0645\u062f\u0631\u0633')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const rejectInstructor = async (targetUserId) => {
    if (!user?.id || !isAdminUser) return

    setActionLoading(targetUserId)
    try {
      await adminService.rejectInstructor(targetUserId)
      showRoleUpdateSuccess('student')
    } catch (error) {
      try {
        await applyRoleChange(targetUserId, 'student')
        showRoleUpdateSuccess('student')
      } catch (fallbackError) {
        handleRoleChangeError(fallbackError, 'reject instructor application', '\u0631\u0641\u0636 \u0637\u0644\u0628 \u0627\u0644\u0645\u062f\u0631\u0633')
      }
    } finally {
      setActionLoading(null)
    }
  }

  const toggleUserBlock = async (targetUser) => {
    if (!user?.id || !isAdminUser || !targetUser?.id) return

    const shouldSuspend = !targetUser.is_suspended
    if (targetUser.id === user.id && shouldSuspend) {
      alert(t('userManagement.youCannotBlockYourOwnAccount'))
      return
    }

    const confirmed = window.confirm(
      shouldSuspend
        ? (t('userManagement.blockTargetuseremailFromThePla'))
        : (t('userManagement.unblockTargetuseremail'))
    )

    if (!confirmed) return

    setActionLoading(targetUser.id)
    try {
      await adminService.setUserSuspended(targetUser.id, shouldSuspend)
      setUsers((prev) => prev.map((item) => (
        item.id === targetUser.id ? { ...item, is_suspended: shouldSuspend } : item
      )))
      alert(
        shouldSuspend
          ? (t('userManagement.userBlockedFromThePlatform'))
          : (t('userManagement.userUnblocked'))
      )
    } catch (error) {
      alert(
        t('userManagement.failedToUpdateUserStatusErrorm')
      )
    } finally {
      setActionLoading(null)
    }
  }

  const deleteUser = async (targetUser) => {
    if (!user?.id || !isAdminUser || !targetUser?.id) return

    if (targetUser.id === user.id) {
      alert(t('userManagement.youCannotDeleteYourOwnAccount'))
      return
    }

    const confirmed = window.confirm(
      t('userManagement.deleteTargetuseremailPermanent')
    )

    if (!confirmed) return

    setActionLoading(targetUser.id)
    try {
      await adminService.deletePlatformUser(targetUser.id)
      setUsers((prev) => prev.filter((item) => item.id !== targetUser.id))
      alert(t('userManagement.userDeleted'))
    } catch (error) {
      alert(
        t('userManagement.failedToDeleteUserErrormessage')
      )
    } finally {
      setActionLoading(null)
    }
  }

  // Update user role
  const updateUserRole = async (targetUserId, newRole) => {
    if (!user?.id || !isAdminUser) return

    setActionLoading(targetUserId)
    try {
      await applyRoleChange(targetUserId, newRole)
      showRoleUpdateSuccess(newRole)
    } catch (error) {
      handleRoleChangeError(error, 'update user role', '\u062a\u062d\u062f\u064a\u062b \u062f\u0648\u0631 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645')
    } finally {
      setActionLoading(null)
    }
  }

  // Get user details
  const getUserDetails = async (targetUserId) => {
    if (!user?.id || !isAdminUser) return

    const selectedFromList = users.find((listUser) => listUser.id === targetUserId)

    try {
      const data = await adminService.getUserDetailsAdmin(targetUserId)

      if (data.success) {
        setSelectedUser(data)
        setShowUserDetails(true)
      }
    } catch (error) {
      console.error('Error getting user details:', error)

      if (selectedFromList && !isAccessDeniedError(error)) {
        setSelectedUser({
          success: true,
          user: selectedFromList,
          courses: [],
          enrollments: []
        })
        setShowUserDetails(true)
        return
      }

      alert(t('userManagement.unableToLoadUserDetails'))
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

  const pendingInstructors = users.filter((u) => normalizeDbRole(u.role) === 'pending_instructor')

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || normalizeDbRole(user.role) === roleFilter
    return matchesSearch && matchesRole
  })

  useEffect(() => {
    fetchUsers()
  }, [user])

  if (!isAdminUser) {
    return (
      <div className="text-center py-12">
        <FiUsers className="w-16 h-16 mx-auto mb-4 text-red-400" />
        <h3 className="text-xl font-bold mb-2 text-red-600">
          {t('userManagement.accessDenied')}
        </h3>
        <p className="text-gray-500">
          {t('userManagement.youMustBeAnAdminToAccessThisPa')}
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
            {t('dashboardExtra.userManagement')}
          </h2>
          <p className="text-gray-500">
            {t('userManagement.manageAllUsersAndConvertTheirR')}
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
          {t('userManagement.refresh')}
        </button>
      </div>

      {/* Pending Instructor Approvals */}
      {pendingInstructors.length > 0 && (
        <div className="card card-body border border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <h3 className="font-bold mb-4">
            {t('userManagement.pendingInstructorApplicationsP')}
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
                      ? (t('userManagement.processing'))
                      : t('dashboardExtra.approve')}
                  </button>
                  <button
                    onClick={() => rejectInstructor(pendingUser.id)}
                    disabled={actionLoading === pendingUser.id}
                    className="btn btn-secondary text-sm"
                  >
                    {t('dashboardExtra.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'student').length}</div>
          <div className="text-sm text-gray-500">{t('userManagement.students')}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-amber-600">{pendingInstructors.length}</div>
          <div className="text-sm text-gray-500">{t('userManagement.pending')}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-green-600">{users.filter(u => u.role === 'instructor').length}</div>
          <div className="text-sm text-gray-500">{t('userManagement.instructors')}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-red-600">{users.filter(u => u.role === 'admin').length}</div>
          <div className="text-sm text-gray-500">{t('userManagement.admins')}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-orange-600">{users.filter(u => u.is_suspended).length}</div>
          <div className="text-sm text-gray-500">{t('userManagement.blocked_5')}</div>
        </div>
        <div className="card card-body text-center">
          <div className="text-2xl font-bold text-gray-600">{users.length}</div>
          <div className="text-sm text-gray-500">{t('userManagement.total')}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-body">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute start-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('userManagement.searchByNameOrEmail')}
              className="input ps-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* Role Filter */}
          <div className="relative">
            <select
              className="input pe-10 w-full"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">{t('userManagement.allRoles')}</option>
              <option value="student">{t('roles.student')}</option>
              <option value="pending_instructor">{t('userManagement.pendingInstructor')}</option>
              <option value="instructor">{t('userManagement.instructor_4')}</option>
              <option value="admin">{t('userManagement.admin')}</option>
            </select>
            <FiFilter className="absolute end-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <FiLoader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
            <p className="text-gray-500">
              {t('userManagement.loadingUsers')}
            </p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.user')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.role')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('dashboardExtra.coursesTab')}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.joinDate')}
                  </th>
                  <th className="px-6 py-3 text-end text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('userManagement.actions')}
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
                        <div className="ms-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {userData.full_name || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{userData.email}</span>
                            {userData.is_suspended && (
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[11px] font-semibold">
                                {t('userManagement.blocked')}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => toggleUserBlock(userData)}
                              disabled={actionLoading === userData.id}
                              className={`disabled:opacity-50 ${userData.is_suspended ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}
                              title={userData.is_suspended
                                ? (t('userManagement.unblockUser'))
                                : (t('userManagement.blockFromPlatform'))}
                            >
                              {actionLoading === userData.id ? (
                                <FiLoader className="w-4 h-4 animate-spin" />
                              ) : (
                                <FiUserX className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteUser(userData)}
                              disabled={actionLoading === userData.id}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              title={t('userManagement.deleteUser')}
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(userData.role)}`}>
                        {getRoleLabel(normalizeDbRole(userData.role))}
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
                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* View Details */}
                        <button
                          onClick={() => getUserDetails(userData.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('userManagement.viewDetails')}
                        >
                          <FiEdit className="w-4 h-4" />
                        </button>
                        
                        {/* Role Conversion Buttons */}
                        {normalizeDbRole(userData.role) === 'pending_instructor' && (
                          <>
                            <button
                              onClick={() => approveInstructor(userData.id)}
                              disabled={actionLoading === userData.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title={t('userManagement.approveInstructor')}
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
                              title={t('userManagement.rejectApplication')}
                            >
                              <FiUserX className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {normalizeDbRole(userData.role) === 'student' && (
                          <button
                            onClick={() => updateUserRole(userData.id, 'instructor')}
                            disabled={actionLoading === userData.id}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title={t('userManagement.promoteToInstructor')}
                          >
                            {actionLoading === userData.id ? (
                              <FiLoader className="w-4 h-4 animate-spin" />
                            ) : (
                              <FiUserCheck className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        
                        {normalizeDbRole(userData.role) !== 'student' && normalizeDbRole(userData.role) !== 'admin' && (
                          <button
                            onClick={() => updateUserRole(userData.id, 'student')}
                            disabled={actionLoading === userData.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title={t('userManagement.convertToStudent')}
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
              {t('userManagement.noResults')}
            </h3>
            <p className="text-gray-500">
              {t('userManagement.noUsersFoundMatchingYourSearch')}
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
                  {t('userManagement.userDetails')}
                </h3>
                <button
                  onClick={() => setShowUserDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
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
                        {t('dashboardExtra.coursesTab')}
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
                        {t('userManagement.enrollments')}
                      </h5>
                      <div className="space-y-2">
                        {selectedUser.enrollments.map(enrollment => (
                          <div key={enrollment.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="font-medium">{enrollment.course_title}</div>
                            <div className="text-sm text-gray-500">
                              {t('userManagement.instructor')} {enrollment.instructor_name}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-sm">{t('userManagement.progress')}</span>
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

